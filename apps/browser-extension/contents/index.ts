import type { PlasmoCSConfig } from "plasmo"
import { normalizeMediaTitle, type MediaState } from "@obs-playing/shared"

export const config: PlasmoCSConfig = {
  matches: [
    "https://music.yandex.ru/*",
    "https://www.youtube.com/*",
    "https://music.youtube.com/*",
    "https://open.spotify.com/*",
    "https://vk.com/*",
  ],
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
    read: () => {
      const session = sessionState()
      if (session) return session
      const player = mediaElement()
      const title = text(".track__title")
      if (!title) return null
      return {
        title,
        artists: [...document.querySelectorAll<HTMLElement>(".track__artists a")].map((item) => item.innerText.trim()).filter(Boolean),
        artwork: artwork(".track-cover img, .player-controls__track-cover img"),
        isPlaying: player ? !player.paused && !player.ended : Boolean(document.querySelector(".player-controls__btn_pause")),
      }
    },
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

function publish() {
  const adapter = adapters.find((candidate) => candidate.matches())
  const state = adapter?.read()
  if (!adapter || !state || !state.title) return
  chrome.runtime.sendMessage({ ...state, title: normalizeMediaTitle(state.title), source: { transportId: "extension", service: adapter.service } satisfies MediaState["source"] })
}

publish()
setInterval(publish, 2_000)
