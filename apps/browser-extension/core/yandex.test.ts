import { expect, test } from "bun:test"
import { playbackFromControl } from "./yandex"

test("recognizes Yandex pause controls as playing", () => {
  expect(playbackFromControl({ "aria-label": "Пауза" })).toBe(true)
  expect(playbackFromControl({ "data-state": "playing" })).toBe(true)
})

test("recognizes Yandex play controls as paused", () => {
  expect(playbackFromControl({ title: "Воспроизвести" })).toBe(false)
  expect(playbackFromControl({ "data-testid": "player-play" })).toBe(false)
})

test("does not infer playback from an unrelated control", () => {
  expect(playbackFromControl({ "aria-label": "Следующий трек" }, "Button_root")).toBeUndefined()
})
