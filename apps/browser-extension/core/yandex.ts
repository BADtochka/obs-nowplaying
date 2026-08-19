import type { MediaState } from "@obs-playing/shared"

type YandexState = Omit<MediaState, "source">

interface MediaSessionMetadata {
  title?: string
  artist?: string
  album?: string
  artwork?: Array<{ src?: string }>
}

const PLAYER_ROOT = [
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_info']",
  "[class*='PlayerBarDesktop']",
  "[class*='MetaDesktop']",
  "[class*='PlayerBar']",
  "[class*='player-bar']",
  ".d-player",
  ".d-player-controls",
  ".player-controls",
  "[data-testid*='player']",
]

const TRACK_TITLE = [
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']",
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_info']",
  ".track__name a",
  ".track__name",
  ".d-track__name",
  "[class*='title'] a",
  "[class*='track-title']",
  "[class*='TrackTitle']",
  "[data-testid*='track-title']",
  "[data-track-title]",
]

const TRACK_ARTIST = [
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_meta']",
  ".track__artists a",
  ".track__artists",
  ".track__artists-short",
  ".d-track__artists",
  "[class*='subtitle']",
  "[class*='artists']",
  "[class*='track-artists']",
  "[class*='Artist'] a",
  "[data-testid*='artist'] a",
  "[data-track-artist]",
]

const PLAYBACK_CONTROL = [
  ".player-controls__btn_play.player-controls__btn_pause",
  ".player-controls__btn_pause",
  ".player-controls__btn_play",
  ".button_playing",
  ".button_play",
  "[role='button'][aria-label*='Пауза']",
  "[role='button'][aria-label*='Pause']",
  "[role='button'][aria-label*='Воспроизвести']",
  "[role='button'][aria-label*='Play']",
  "button[aria-label*='Пауза']",
  "button[aria-label*='Pause']",
  "button[aria-label='Playback']",
  "button[title*='Пауза']",
  "button[title*='Pause']",
  "[data-testid*='play']",
  "[data-testid*='pause']",
]

const PROGRESS_SLIDER = [
  "input[type='range'][class*='PlayerBarDesktopWithBackgroundProgressBar_slider']",
  "input[type='range'][aria-label='Управление таймкодом']",
  "input[type='range'][class*='progress']",
  "input[type='range'][class*='Progress']",
  "input[type='range'][class*='timeline']",
  "input[type='range'][class*='Timeline']",
  "input[type='range'][aria-label*='progress']",
  "input[type='range'][aria-label*='время']",
]

const COVER = [
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_cover'] img",
  "[class*='PlayerBarDesktopWithBackgroundProgressBar_cover']",
  "img",
]

const CURRENT_TIME = ["[class*='TimeBar'] [class*='current']", ".progress__current"]
const TOTAL_TIME = ["[class*='TimeBar'] [class*='total']", ".progress__total"]
const PLAYING = /(?:pause|пауза|playing|is-playing|is_playing|active)/i
const PAUSED = /(?:play|воспроизвести|играть|paused|is-paused|is_paused)/i

function first<T extends Element>(root: ParentNode, selectors: string[]): T | null {
  for (const selector of selectors) {
    const element = root.querySelector<T>(selector)
    if (element) return element
  }
  return null
}

function all<T extends Element>(root: ParentNode, selectors: string[]) {
  return selectors.flatMap((selector) => [...root.querySelectorAll<T>(selector)])
}

export function playbackFromControl(attributes: Record<string, string | undefined>, className = ""): boolean | undefined {
  const value = [attributes["aria-label"], attributes.title, attributes["data-state"], attributes["data-testid"], attributes["data-action"], className]
    .filter(Boolean)
    .join(" ")
  if (PLAYING.test(value)) return true
  if (PAUSED.test(value)) return false
  return undefined
}

function nodeText(element: Element | null) {
  return (element?.getAttribute("data-track-title") || element?.getAttribute("data-track-artist") || element?.textContent || "").replace(/\s+/g, " ").trim()
}

function attributes(element: Element) {
  return {
    "aria-label": element.getAttribute("aria-label") || undefined,
    title: element.getAttribute("title") || undefined,
    "data-state": element.getAttribute("data-state") || undefined,
    "data-testid": element.getAttribute("data-testid") || undefined,
    "data-action": element.getAttribute("data-action") || undefined,
  }
}

function seconds(value: string) {
  const parts = value.trim().split(":").map(Number)
  if (!parts.length || parts.some(Number.isNaN)) return undefined
  return parts.reduce((total, part) => total * 60 + part, 0)
}

function mediaState(media: HTMLMediaElement | null) {
  if (!media) return {}
  return {
    duration: Number.isFinite(media.duration) && media.duration > 0 ? media.duration : undefined,
    position: Number.isFinite(media.currentTime) ? media.currentTime : undefined,
    isPlaying: !media.paused && !media.ended && media.readyState >= 2,
  }
}

function sliderState(player: ParentNode) {
  const slider = first<HTMLInputElement>(player, PROGRESS_SLIDER)
  if (!slider) return {}
  const position = Number.parseFloat(slider.value)
  const duration = Number.parseFloat(slider.max)
  return {
    position: Number.isFinite(position) ? position : undefined,
    duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
  }
}

function textTimeState(player: ParentNode) {
  return {
    position: seconds(nodeText(first(player, CURRENT_TIME))),
    duration: seconds(nodeText(first(player, TOTAL_TIME))),
  }
}

function sessionMetadata(): MediaSessionMetadata | undefined {
  return globalThis.navigator?.mediaSession?.metadata as MediaSessionMetadata | undefined
}

/** Reads only the current player bar or Media Session, never an artist page's track list. */
export function readYandexPlayer(document: Document, media = findYandexMediaElement(document), metadata = sessionMetadata()): YandexState | null {
  const playerRoots = all<HTMLElement>(document, PLAYER_ROOT)
  // Yandex's nested info node matches PLAYER_ROOT before the surrounding bar,
  // but playback controls and progress are siblings outside that node.
  const player = playerRoots.find((root) => first(root, TRACK_TITLE) && first(root, PLAYBACK_CONTROL))
    || playerRoots.find((root) => first(root, TRACK_TITLE))
    || playerRoots[0]
    || null
  const title = metadata?.title || (player ? nodeText(first(player, TRACK_TITLE)) : "")
  if (!title) return null

  const artists = player ? all(player, TRACK_ARTIST).map(nodeText).filter(Boolean) : []
  const cover = player ? first<HTMLImageElement>(player, COVER) : null
  let controlState: boolean | undefined
  if (player) {
    for (const control of all(player, PLAYBACK_CONTROL)) {
      controlState = playbackFromControl(attributes(control), control.className)
      if (controlState !== undefined) break
    }
  }

  const fromMedia = mediaState(media)
  const fromSlider = player ? sliderState(player) : {}
  const fromText = player ? textTimeState(player) : {}
  return {
    title,
    artists: [...new Set(metadata?.artist ? [metadata.artist] : artists)],
    album: metadata?.album || undefined,
    artwork: metadata?.artwork?.at(-1)?.src || cover?.currentSrc || cover?.src || undefined,
    duration: fromMedia.duration ?? fromSlider.duration ?? fromText.duration,
    position: fromMedia.position ?? fromSlider.position ?? fromText.position,
    // Firefox preview audio can remain paused while the visible Pause control confirms playback.
    isPlaying: fromMedia.isPlaying || controlState === true,
  }
}

/** Searches the document and known player hosts' open shadow roots only. */
export function findYandexMediaElements(document: Document): HTMLMediaElement[] {
  const roots: ParentNode[] = [document]
  for (const host of all<HTMLElement>(document, PLAYER_ROOT)) {
    if (host.shadowRoot) roots.push(host.shadowRoot)
  }
  return roots.flatMap((root) => [...root.querySelectorAll<HTMLMediaElement>("audio")])
}

export function findYandexMediaElement(document: Document): HTMLMediaElement | null {
  const audio = findYandexMediaElements(document)
  const score = (media: HTMLMediaElement) =>
    Number(media.readyState >= 2) * 8
    + Number(Boolean(media.currentSrc || media.getAttribute("src"))) * 4
    + Number(Number.isFinite(media.duration) && media.duration > 0) * 2
    + Number(Number.isFinite(media.currentTime) && media.currentTime > 0)
  const preferred = audio.filter((media) => !media.paused && !media.ended && media.readyState >= 2)
  const usable = audio.filter((media) => media.readyState >= 2 && score(media) > 0)
  return (preferred.length ? preferred : usable).sort((left, right) => score(right) - score(left))[0] || null
}
