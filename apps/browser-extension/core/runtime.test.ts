import { afterEach, expect, test } from "bun:test"
import { sendRuntimeMessage } from "./runtime"

const extensionGlobal = globalThis as typeof globalThis & {
  browser?: { runtime?: { sendMessage(message: unknown): unknown } }
  chrome?: { runtime?: { sendMessage(message: unknown): unknown } }
}
const originalBrowser = extensionGlobal.browser
const originalChrome = extensionGlobal.chrome

afterEach(() => {
  extensionGlobal.browser = originalBrowser
  extensionGlobal.chrome = originalChrome
})

test("uses Firefox browser.runtime before the Chromium compatibility namespace", async () => {
  const calls: string[] = []
  extensionGlobal.browser = { runtime: { sendMessage: () => { calls.push("browser"); return "firefox" } } }
  extensionGlobal.chrome = { runtime: { sendMessage: () => { calls.push("chrome"); return "chrome" } } }

  await expect(sendRuntimeMessage({ type: "state" })).resolves.toBe("firefox")
  expect(calls).toEqual(["browser"])
})

test("falls back to chrome.runtime and reports an unavailable runtime", async () => {
  extensionGlobal.browser = undefined
  extensionGlobal.chrome = { runtime: { sendMessage: () => "chrome" } }
  await expect(sendRuntimeMessage({ type: "state" })).resolves.toBe("chrome")

  extensionGlobal.chrome = undefined
  await expect(sendRuntimeMessage({ type: "state" })).rejects.toThrow("Extension runtime unavailable")
})

test("uses Chromium's callback response when sendMessage does not return a Promise", async () => {
  extensionGlobal.browser = undefined
  extensionGlobal.chrome = { runtime: { sendMessage: (_message, callback) => callback?.("chrome callback") } }

  await expect(sendRuntimeMessage({ type: "obs-playing:status" })).resolves.toBe("chrome callback")
})

test("reports Chromium callback errors", async () => {
  extensionGlobal.browser = undefined
  const runtime = {
    lastError: { message: "The message port closed before a response was received." },
    sendMessage: (_message: unknown, callback?: (response: unknown) => void) => callback?.(undefined),
  }
  extensionGlobal.chrome = { runtime }

  await expect(sendRuntimeMessage({ type: "obs-playing:status" })).rejects.toThrow("message port closed")
})
