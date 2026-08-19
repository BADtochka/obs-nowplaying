import { expect, test } from "bun:test"
import { extensionConfigFromHealth, extensionProviders, isExtensionConfig } from "./provider-config"

test("accepts only the extension-scoped provider contract", () => {
  expect(isExtensionConfig({ enabled: true, providers: ["yandexMusic", "spotify"], provider: "spotify" })).toBe(true)
  expect(isExtensionConfig({ enabled: true, providers: ["unknown"], provider: "auto" })).toBe(false)
  expect(isExtensionConfig({ enabled: true, providers: [], provider: "nativeMedia" })).toBe(false)
})

test("Yandex is present in the default extension provider contract", () => {
  expect(extensionProviders).toContain("yandexMusic")
})

test("accepts the extension config embedded in a health response", () => {
  expect(extensionConfigFromHealth({
    status: "ok",
    hasActiveMedia: false,
    extensionConfig: { enabled: true, providers: ["yandexMusic", "youtube"], provider: "auto" },
  })).toEqual({ enabled: true, providers: ["yandexMusic", "youtube"], provider: "auto" })
})
