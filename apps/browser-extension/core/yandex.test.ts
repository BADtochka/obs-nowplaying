import { expect, test } from "bun:test"
import { findYandexMediaElement, playbackFromControl, readYandexPlayer } from "./yandex"

test("recognizes Yandex pause controls as playing", () => {
  expect(playbackFromControl({ "aria-label": "Пауза" })).toBe(true)
  expect(playbackFromControl({ "data-state": "playing" })).toBe(true)
})

test("reads a Firefox-style role button and lets it confirm a preview without active audio", () => {
  const player = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Preview track" }),
    "[role='button'][aria-label*='Pause']": [element({ attributes: { "aria-label": "Pause" } })],
  })
  const document = fixture({ "[class*='PlayerBarDesktop']": player })
  const pausedAudio = media({ paused: true, ended: false, readyState: 4, currentSrc: "https://music.yandex.ru/preview", currentTime: 1, duration: 20 })

  expect(readYandexPlayer(document as unknown as Document, pausedAudio as HTMLMediaElement, { title: "Preview track" })).toMatchObject({
    isPlaying: true,
  })
})

test("recognizes Yandex play controls as paused", () => {
  expect(playbackFromControl({ title: "Воспроизвести" })).toBe(false)
  expect(playbackFromControl({ "data-testid": "player-play" })).toBe(false)
  expect(playbackFromControl({ "aria-label": "Playback" })).toBe(false)
})

test("does not infer playback from an unrelated control", () => {
  expect(playbackFromControl({ "aria-label": "Следующий трек" }, "Button_root")).toBeUndefined()
})

test("reads PlayerBarDesktop metadata, slider, artwork, and pause control", () => {
  const document = fixture({
    "[class*='PlayerBarDesktop']": element(),
  })
  const player = fixture({
    ".track__name a": element({ text: "Current track" }),
    ".track__artists a": [element({ text: "Current artist" })],
    "img": element({ src: "https://example.com/cover.jpg" }),
    "button[aria-label*='Пауза']": [element({ attributes: { "aria-label": "Пауза" } })],
    "input[type='range'][class*='progress']": element({ value: "12", max: "240" }),
  })
  document.set("[class*='PlayerBarDesktop']", player)

  expect(readYandexPlayer(document as unknown as Document, null, undefined)).toEqual({
    title: "Current track",
    artists: ["Current artist"],
    album: undefined,
    artwork: "https://example.com/cover.jpg",
    position: 12,
    duration: 240,
    isPlaying: true,
  })
})

test("skips a generic controls root that has no metadata", () => {
  const document = fixture({
    ".player-controls": element(),
    "[class*='PlayerBarDesktop']": element(),
  })
  const player = fixture({
    ".track__name": element({ text: "Hydrated track" }),
    ".track__artists": [element({ text: "Hydrated artist" })],
  })
  document.set("[class*='PlayerBarDesktop']", player)

  expect(readYandexPlayer(document as unknown as Document, null, undefined)).toMatchObject({
    title: "Hydrated track",
    artists: ["Hydrated artist"],
  })
})

test("uses the surrounding player bar when Yandex's nested info root matches first", () => {
  const info = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Preview track" }),
  })
  const player = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Preview track" }),
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_meta']": [element({ text: "Preview artist" })],
    "button[aria-label*='Pause']": [element({ attributes: { "aria-label": "Pause" } })],
    "input[type='range'][class*='PlayerBarDesktopWithBackgroundProgressBar_slider']": element({ value: "4", max: "10" }),
  })
  const document = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_info']": info,
    "[class*='PlayerBarDesktop']": player,
  })

  expect(readYandexPlayer(document as unknown as Document, null, {
    title: "Preview track",
    artist: "Preview artist",
  })).toMatchObject({
    title: "Preview track",
    artists: ["Preview artist"],
    position: 4,
    duration: 10,
    isPlaying: true,
  })
})

test("marks a MediaSession preview ended when the player control returns to Playback", () => {
  const player = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Ended preview" }),
    "button[aria-label='Playback']": [element({ attributes: { "aria-label": "Playback" } })],
    "input[type='range'][class*='PlayerBarDesktopWithBackgroundProgressBar_slider']": element({ value: "10", max: "10" }),
  })
  const document = fixture({ "[class*='PlayerBarDesktop']": player })

  expect(readYandexPlayer(document as unknown as Document, null, { title: "Ended preview" })).toMatchObject({
    position: 10,
    duration: 10,
    isPlaying: false,
  })
})

test("reads MetaDesktop and audio state without selecting artist page tracks", () => {
  const document = fixture({ "[class*='MetaDesktop']": element() })
  const player = fixture({
    ".d-track__name": element({ text: "Player track" }),
    ".d-track__artists": [element({ text: "Player artist" })],
  })
  document.set("[class*='MetaDesktop']", player)
  const audio = { currentTime: 23, duration: 180, paused: false, ended: false, readyState: 4 }

  expect(readYandexPlayer(document as unknown as Document, audio as HTMLMediaElement, undefined)).toMatchObject({
    title: "Player track",
    artists: ["Player artist"],
    position: 23,
    duration: 180,
    isPlaying: true,
  })
})

test("uses Media Session when player state is not hydrated", () => {
  const document = fixture({})

  expect(readYandexPlayer(document as unknown as Document, null, {
    title: "Session track",
    artist: "Session artist",
    artwork: [{ src: "https://avatars.yandex.net/session-artwork" }],
  })).toEqual({
    title: "Session track",
    artists: ["Session artist"],
    album: undefined,
    artwork: "https://avatars.yandex.net/session-artwork",
    duration: undefined,
    position: undefined,
    isPlaying: false,
  })
})

test("prefers the active Yandex audio and Media Session over the player bar", () => {
  const inactiveAudio = media({ paused: true, ended: false, readyState: 4, currentSrc: "https://music.yandex.ru/inactive", currentTime: 1, duration: 180 })
  const activeAudio = media({ paused: false, ended: false, readyState: 4, currentSrc: "https://music.yandex.ru/active", currentTime: 42, duration: 200 })
  const document = fixture({
    "[class*='PlayerBarDesktop']": element(),
    audio: [inactiveAudio, activeAudio],
    "video.VideoAd_video__j1f_y": [media({ paused: false, ended: false, readyState: 4, currentSrc: "https://music.yandex.ru/ad", currentTime: 8, duration: 30 })],
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Неправильно" }),
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_meta']": [element({ text: "GATASKI, TAKETAKE, OFFCOAST" })],
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_cover'] img": element({ src: "https://music.yandex.ru/dom-cover" }),
    "input[type='range'][class*='PlayerBarDesktopWithBackgroundProgressBar_slider']": element({ value: "42", max: "200", attributes: { "aria-label": "Управление таймкодом" } }),
  })
  const player = fixture({
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_description']": element({ text: "Неправильно" }),
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_meta']": [element({ text: "GATASKI, TAKETAKE, OFFCOAST" })],
    "[class*='PlayerBarDesktopWithBackgroundProgressBar_cover'] img": element({ src: "https://music.yandex.ru/dom-cover" }),
    "input[type='range'][class*='PlayerBarDesktopWithBackgroundProgressBar_slider']": element({ value: "42", max: "200", attributes: { "aria-label": "Управление таймкодом" } }),
  })
  document.set("[class*='PlayerBarDesktop']", player)
  const metadata = {
    title: "END",
    artist: "TAKETAKE, средство",
    album: "END",
    artwork: [{ src: "https://avatars.yandex.net/artwork-400" }],
  }

  expect(findYandexMediaElement(document as unknown as Document)).toBe(activeAudio)
  expect(readYandexPlayer(document as unknown as Document, findYandexMediaElement(document as unknown as Document), metadata)).toMatchObject({
    title: "END",
    artists: ["TAKETAKE, средство"],
    album: "END",
    artwork: "https://avatars.yandex.net/artwork-400",
    position: 42,
    duration: 200,
    isPlaying: true,
  })
})

test("ignores a playing but unready audio in favor of usable media", () => {
  const unready = media({ paused: false, ended: false, readyState: 0, currentSrc: "", currentTime: 0, duration: Number.NaN })
  const usable = media({ paused: true, ended: false, readyState: 4, currentSrc: "https://music.yandex.ru/preview", currentTime: 7, duration: 20 })
  const document = fixture({ audio: [unready, usable] })

  expect(findYandexMediaElement(document as unknown as Document)).toBe(usable)
})

test("returns no state without player or Media Session metadata", () => {
  expect(readYandexPlayer(fixture({}) as unknown as Document, null, undefined)).toBeNull()
})

type FixtureElement = ReturnType<typeof element>
function fixture(values: Record<string, FixtureElement | FixtureElement[]>) {
  return {
    set(selector: string, value: FixtureElement) { values[selector] = value },
    querySelector<T extends Element>(selector: string) {
      const value = values[selector]
      return (Array.isArray(value) ? value[0] : value || null) as T | null
    },
    querySelectorAll<T extends Element>(selector: string) {
      const value = values[selector]
      return (Array.isArray(value) ? value : value ? [value] : []) as T[]
    },
  }
}

function element(options: { text?: string; src?: string; value?: string; max?: string; attributes?: Record<string, string> } = {}) {
  return {
    textContent: options.text || "",
    src: options.src || "",
    currentSrc: options.src || "",
    value: options.value || "",
    max: options.max || "",
    className: "",
    getAttribute(name: string) { return options.attributes?.[name] || null },
    querySelector: () => null,
    querySelectorAll: () => [],
  }
}

function media(options: { paused: boolean; ended: boolean; readyState: number; currentSrc: string; currentTime: number; duration: number }) {
  return {
    ...element(),
    ...options,
  }
}
