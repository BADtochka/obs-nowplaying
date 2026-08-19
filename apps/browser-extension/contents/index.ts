import type { PlasmoCSConfig } from "plasmo"
import { normalizeMediaTitle, type MediaState } from "@obs-playing/shared"
import { findYandexMediaElement, findYandexMediaElements, readYandexPlayer } from "../core/yandex"
import { matchProvider } from "../core/provider-pipeline"
import { sendRuntimeMessage } from "../core/runtime"

export const config: PlasmoCSConfig = {
  matches: [
    "https://music.yandex.ru/*",
    "https://www.youtube.com/*",
    "https://music.youtube.com/*",
    "https://open.spotify.com/*",
    "https://vk.com/*",
  ],
  run_at: "document_idle",
}

interface MediaAdapter {
  matches(): boolean
  read(): Omit<MediaState, "source"> | null
  service: string
}

const text = (selector: string) => document.querySelector<HTMLElement>(selector)?.innerText.trim() || ""
const mediaElement = () => document.querySelector<HTMLMediaElement>("video, audio")
const meta = (property: string) => document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content || ""
const image = (selector: string) => document.querySelector<HTMLImageElement>(selector)?.src || ""
const artwork = (fallbackSelector?: string) => {
  const player = mediaElement()
  const poster = player instanceof HTMLVideoElement ? player.poster : ""
  return poster || (fallbackSelector ? image(fallbackSelector) : "") || meta("og:image") || undefined
}

const sessionState = () => {
  const player = mediaElement()
  const metadata = navigator.mediaSession?.metadata
  if (!player || !metadata?.title) return null
  return {
    title: metadata.title,
    artists: metadata.artist ? [metadata.artist] : [],
    album: metadata.album || undefined,
    artwork: metadata.artwork?.at(-1)?.src || artwork(),
    duration: Number.isFinite(player.duration) ? player.duration : undefined,
    position: Number.isFinite(player.currentTime) ? player.currentTime : undefined,
    isPlaying: !player.paused && !player.ended,
  }
}

const adapters: MediaAdapter[] = [
  {
    service: "YouTube Music",
    matches: () => location.hostname === "music.youtube.com",
    read: () => sessionState() ?? (() => {
      const player = mediaElement()
      const title = text("ytmusic-player-bar .title")
      if (!player || !title) return null
      return {
        title,
        artists: [text("ytmusic-player-bar .byline")].filter(Boolean),
        artwork: artwork("ytmusic-player-bar .image img"),
        duration: Number.isFinite(player.duration) ? player.duration : undefined,
        position: Number.isFinite(player.currentTime) ? player.currentTime : undefined,
        isPlaying: !player.paused && !player.ended,
      }
    })(),
  },
  {
    service: "YouTube",
    matches: () => location.hostname === "www.youtube.com",
    read: () => {
      const player = mediaElement()
      if (!player) return null
      return {
        title: text("h1.ytd-watch-metadata") || document.title.replace(/\s*-\s*YouTube$/, ""),
        artists: [text("#owner #channel-name") || text("ytd-channel-name")].filter(Boolean),
        artwork: artwork("#thumbnail img, ytd-video-preview img"),
        duration: Number.isFinite(player.duration) ? player.duration : undefined,
        position: Number.isFinite(player.currentTime) ? player.currentTime : undefined,
        isPlaying: !player.paused && !player.ended,
      }
    },
  },
  {
    service: "Yandex Music",
    matches: () => location.hostname === "music.yandex.ru",
    read: () => readYandexPlayer(document, findYandexMediaElement(document)),
  },
  {
    service: "Spotify",
    matches: () => location.hostname === "open.spotify.com",
    read: () => {
      const session = sessionState()
      if (session) return session
      const title = text('[data-testid="context-item-info-title"]') || text('[data-testid="nowplaying-track-link"]')
      if (!title) return null
      return {
        title,
        artists: [...document.querySelectorAll<HTMLElement>('[data-testid="context-item-info-artist"], [data-testid="nowplaying-artist"]')].map((item) => item.innerText.trim()).filter(Boolean),
        artwork: artwork('[data-testid="cover-art-image"], [data-testid="nowplaying-image"]'),
        isPlaying: document.querySelector('[data-testid="control-button-pause"]') !== null,
      }
    },
  },
  {
    service: "VK Music",
    matches: () => location.hostname === "vk.com",
    read: () => sessionState(),
  },
]

let lastPublishedKey = ""
let lastPublishedAt = 0
const lastDiagnostics = new Map<string, string>()
const provider = matchProvider(location.hostname, location.pathname)

function report(stage: string, reason: string) {
  if (!provider) return
  if (lastDiagnostics.get(stage) === reason) return
  lastDiagnostics.set(stage, reason)
  void sendRuntimeMessage({ type: "obs-playing:debug", provider: provider.id, stage, reason }).catch(() => undefined)
}

function publish(heartbeat = false) {
  const adapter = adapters.find((candidate) => candidate.matches())
  if (!adapter || !provider) {
    report("adapter", "no-match")
    return
  }
  report("adapter", "matched")
  const state = adapter?.read()
  if (!state || !state.title) {
    report("parser", "waiting-for-player")
    return
  }
  report("parser", "state-ready")
  const normalized = { ...state, title: normalizeMediaTitle(state.title) }
  report("playback", normalized.isPlaying ? "confirmed-playing" : "initial-paused")
  const progressBucket = Math.floor((normalized.position || 0) / 2)
  const key = JSON.stringify([adapter.service, normalized.isPlaying, normalized.title, normalized.artists, normalized.artwork, progressBucket])
  if (key === lastPublishedKey && (!heartbeat || Date.now() - lastPublishedAt < 6_000)) return
  lastPublishedKey = key
  lastPublishedAt = Date.now()
  void sendRuntimeMessage({ ...normalized, source: { transportId: "extension", service: adapter.service } satisfies MediaState["source"] })
    .then(() => report("message", "accepted"))
    .catch(() => report("message", "runtime-unavailable"))
}

let publishTimer: number | undefined
function queuePublish() {
  if (publishTimer) return
  publishTimer = window.setTimeout(() => {
    publishTimer = undefined
    publish()
  }, 300)
}

const observer = new MutationObserver(queuePublish)
observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener("popstate", queuePublish)
window.addEventListener("yt-navigate-finish", queuePublish)
window.addEventListener("yMusicStatePatchesUpdated", queuePublish)
window.addEventListener("hashchange", queuePublish)
document.addEventListener("play", queuePublish, true)
document.addEventListener("pause", queuePublish, true)
document.addEventListener("ended", queuePublish, true)
// Preview controls can be divs that do not dispatch media events in Firefox.
document.addEventListener("click", queuePublish, true)

const hookedYandexMedia = new WeakSet<HTMLMediaElement>()
function hookYandexMedia() {
  if (location.hostname !== "music.yandex.ru") return
  for (const media of findYandexMediaElements(document)) {
    if (hookedYandexMedia.has(media)) continue
    hookedYandexMedia.add(media)
    media.addEventListener("timeupdate", queuePublish, { passive: true })
    for (const event of ["play", "pause", "ended", "loadedmetadata", "canplay", "emptied", "seeked"]) {
      media.addEventListener(event, queuePublish, { passive: true })
    }
  }
}

const yandexObserver = new MutationObserver(() => {
  hookYandexMedia()
  queuePublish()
})
if (location.hostname === "music.yandex.ru") yandexObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
hookYandexMedia()
publish()
setInterval(() => publish(true), 2_000)

// Yandex hydrates its player asynchronously after a SPA navigation.
for (const delay of [250, 750, 1_500, 3_000, 6_000]) window.setTimeout(() => {
  hookYandexMedia()
  queuePublish()
}, delay)
