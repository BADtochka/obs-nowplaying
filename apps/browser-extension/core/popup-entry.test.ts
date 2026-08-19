import { expect, test } from "bun:test"
import { createPopupComponent } from "./popup-entry"

test("popup entry always supplies a Plasmo-compatible default component", () => {
  const component = createPopupComponent(() => undefined)
  expect(component).toBeDefined()
  expect(typeof component).toBe("object")
  expect("setup" in component).toBe(true)
})
