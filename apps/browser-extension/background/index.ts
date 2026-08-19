import { ExtensionTransport } from "../core/transport"
import { statusSnapshot } from "../core/status"
import type { MediaState } from "@obs-playing/shared"

const transport = new ExtensionTransport()
const tabs = new Map<number, { state: MediaState; lastSeen: number }>()
const STALE_TAB_MS = 8_000

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (isPopupRequest(message)) {
    return Promise.resolve(statusSnapshot(transport.snapshot(), detectedMediaState()))
  }
  const tabId = sender.tab?.id
  if (tabId === undefined || !isMediaState(message)) return

  tabs.set(tabId, { state: message, lastSeen: Date.now() })
  publishActiveTab()
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabs.delete(tabId)
  publishActiveTab()
})

setInterval(() => {
  const cutoff = Date.now() - STALE_TAB_MS
  for (const [tabId, entry] of tabs) {
    if (entry.lastSeen < cutoff) tabs.delete(tabId)
  }
  publishActiveTab()
}, 2_000)

function publishActiveTab() {
  const now = Date.now()
  const active = [...tabs.values()]
    .filter((entry) => entry.lastSeen >= now - STALE_TAB_MS && entry.state.isPlaying)
    .sort((left, right) => right.lastSeen - left.lastSeen)[0]

  transport.publish(active?.state ?? null)
}

function isMediaState(value: unknown): value is MediaState {
  if (!value || typeof value !== "object") return false
  const media = value as Partial<MediaState>
  return typeof media.title === "string"
    && Array.isArray(media.artists)
    && typeof media.isPlaying === "boolean"
    && typeof media.source?.service === "string"
}

function detectedMediaState() {
  return [...tabs.values()].sort((left, right) => right.lastSeen - left.lastSeen)[0]?.state ?? null
}

function isPopupRequest(value: unknown): value is { type: "obs-playing:status" } {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === "obs-playing:status")
}
