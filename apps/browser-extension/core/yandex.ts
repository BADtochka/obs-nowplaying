import type { MediaState } from "@obs-playing/shared"

type YandexState = Omit<MediaState, "source">

const PLAYER_ROOT = [
  ".player-controls",
  ".d-player",
  "[class*='PlayerBar']",
  "[class*='player-bar']",
  "[data-testid*='player']",
].join(", ")

const TRACK_TITLE = [
  ".player-controls__track .track__title",
  ".player-controls .track__title",
  ".d-player .d-track__title",
  "[class*='TrackTitle']",
  "[data-testid*='track-title']",
  "[data-track-title]",
  "a[href*='/track/']",
].join(", ")

const TRACK_ARTIST = [
  ".player-controls__track .track__artists a",
  ".player-controls .track__artists a",
  ".d-player .d-track__artists a",
  "[class*='Artist'] a",
  "[data-testid*='artist'] a",
  "[data-track-artist]",
  "a[href*='/artist/']",
].join(", ")

const PLAYBACK_CONTROL = [
  ".player-controls__btn_pause",
  ".player-controls__btn_play",
  ".d-player .button_playing",
  "[class*='Player'] button",
  "[class*='player'] button",
  "[data-testid*='play']",
  "[data-testid*='pause']",
  "button[aria-label]",
].join(", ")

const PLAYING = /(?:pause|пауза|playing|is-playing|is_playing|active)/i
const PAUSED = /(?:play|воспроизвести|играть|paused|is-paused|is_paused)/i

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

/** Reads only the player bar, never the artist page's track list. */
export function readYandexPlayer(document: Document): YandexState | null {
  const player = document.querySelector<HTMLElement>(PLAYER_ROOT)
  if (!player) return null

  const title = nodeText(player.querySelector(TRACK_TITLE))
  if (!title) return null

  const artists = [...player.querySelectorAll(TRACK_ARTIST)].map(nodeText).filter(Boolean)
  const cover = player.querySelector<HTMLImageElement>("img")
  let isPlaying: boolean | undefined
  for (const control of player.querySelectorAll(PLAYBACK_CONTROL)) {
    isPlaying = playbackFromControl(attributes(control), control.className)
    if (isPlaying !== undefined) break
  }

  return {
    title,
    artists: [...new Set(artists)],
    artwork: cover?.currentSrc || cover?.src || undefined,
    // An unknown control state must not be reported as playback.
    isPlaying: isPlaying ?? false,
  }
}

/** Searches the document and known player hosts' open shadow roots only. */
export function findYandexMediaElement(document: Document): HTMLMediaElement | null {
  const roots: ParentNode[] = [document]
  for (const host of document.querySelectorAll<HTMLElement>(PLAYER_ROOT)) {
    if (host.shadowRoot) roots.push(host.shadowRoot)
  }
  for (const root of roots) {
    const media = root.querySelector<HTMLMediaElement>("audio, video")
    if (media) return media
  }
  return null
}
