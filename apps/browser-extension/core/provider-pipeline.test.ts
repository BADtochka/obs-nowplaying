import { expect, test } from "bun:test"
import type { MediaState } from "@obs-playing/shared"
import { matchProvider, mediaValidationReason, providerGateReason, selectTabMedia } from "./provider-pipeline"

const yandex: MediaState = {
  title: "Track", artists: ["Artist"], isPlaying: true,
  source: { transportId: "extension", service: "Yandex Music" },
}

test("matches the real Yandex artist route by hostname", () => {
  expect(matchProvider("music.yandex.ru", "/artist/6456325/tracks")).toEqual({ id: "yandexMusic", service: "Yandex Music" })
  expect(matchProvider("yandex.ru", "/artist/6456325/tracks")).toBeNull()
})

test("validates the background media contract and known service", () => {
  expect(mediaValidationReason(yandex)).toBeNull()
  expect(mediaValidationReason({ ...yandex, title: "" })).toBe("missing-title")
  expect(mediaValidationReason({ ...yandex, source: { transportId: "extension", service: "Yandex" } })).toBe("unknown-service")
})

test("reports every provider config gate", () => {
  expect(providerGateReason({ enabled: false, providers: ["yandexMusic"], provider: "auto" }, "yandexMusic")).toBe("transport-disabled")
  expect(providerGateReason({ enabled: true, providers: ["spotify"], provider: "auto" }, "yandexMusic")).toBe("provider-disabled")
  expect(providerGateReason({ enabled: true, providers: ["yandexMusic", "spotify"], provider: "spotify" }, "yandexMusic")).toBe("provider-not-selected:spotify")
  expect(providerGateReason({ enabled: true, providers: ["yandexMusic"], provider: "auto" }, "yandexMusic")).toBeNull()
})

test("keeps fresh paused media while preferring a playing tab", () => {
  const paused = { ...yandex, title: "Paused", isPlaying: false }
  expect(selectTabMedia([{ state: paused, lastSeen: 9_000, hasPlayed: true }], 10_000, 15_000)).toEqual(paused)
  expect(selectTabMedia([
    { state: paused, lastSeen: 9_500, hasPlayed: true },
    { state: yandex, lastSeen: 9_000, hasPlayed: true },
  ], 10_000, 15_000)).toEqual(yandex)
  expect(selectTabMedia([{ state: yandex, lastSeen: 1_000, hasPlayed: true }], 20_000, 15_000)).toBeNull()
})

test("ignores initial paused entries until playback is confirmed", () => {
  const paused = { ...yandex, isPlaying: false }
  expect(selectTabMedia([{ state: paused, lastSeen: 10_000, hasPlayed: false }], 10_000, 15_000)).toBeNull()
})

test("first playing update activates a tab immediately", () => {
  const playing = { ...yandex, isPlaying: true }
  expect(selectTabMedia([{ state: playing, lastSeen: 10_000, hasPlayed: true }], 10_000, 15_000)).toEqual(playing)
})

test("a previously played tab remains eligible after pausing", () => {
  const paused = { ...yandex, isPlaying: false }
  expect(selectTabMedia([{ state: paused, lastSeen: 10_000, hasPlayed: true }], 10_000, 15_000)).toEqual(paused)
})

test("selects playing media over eligible paused media from another tab", () => {
  const paused = { ...yandex, title: "Paused", isPlaying: false }
  const playing = { ...yandex, title: "Playing", isPlaying: true }
  expect(selectTabMedia([
    { state: paused, lastSeen: 10_500, hasPlayed: true },
    { state: playing, lastSeen: 10_000, hasPlayed: true },
  ], 11_000, 15_000)).toEqual(playing)
})
