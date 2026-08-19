import { ExtensionTransport } from "../core/transport"
import { statusSnapshot } from "../core/status"
import type { MediaState } from "@obs-playing/shared"
import { mediaValidationReason, selectTabMedia } from "../core/provider-pipeline"
import type { ProviderDebug } from "../core/status"

const transport = new ExtensionTransport()
interface TabState {
  state: MediaState
  lastSeen: number
  hasPlayed: boolean
}

const tabs = new Map<number, TabState>()
const STALE_TAB_MS = 15_000
let debug: ProviderDebug | null = null

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isPopupRequest(message)) {
    sendResponse(statusSnapshot(transport.snapshot(), detectedMediaState(), debug))
    // Chromium closes callback channels unless the listener explicitly keeps one open.
    return true
  }
  if (isDebugMessage(message)) {
    debug = { provider: message.provider, stage: message.stage, reason: message.reason, updatedAt: Date.now() }
    return
  }
  const tabId = sender.tab?.id
  const validationReason = mediaValidationReason(message)
  if (tabId === undefined || validationReason) {
    if (tabId !== undefined) debug = { provider: "unknown", stage: "validation", reason: validationReason || "missing-tab", updatedAt: Date.now() }
    return
  }

  const media = message as MediaState
  const hasPlayed = tabs.get(tabId)?.hasPlayed || media.isPlaying
  tabs.set(tabId, { state: media, lastSeen: Date.now(), hasPlayed })
  debug = {
    provider: media.source.service || "unknown",
    stage: "playback",
    reason: hasPlayed ? "state-accepted" : "rejected:initial-paused",
    updatedAt: Date.now(),
  }
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
  transport.publish(selectTabMedia(tabs.values(), Date.now(), STALE_TAB_MS))
}

function detectedMediaState() {
  return selectTabMedia(tabs.values(), Date.now(), STALE_TAB_MS)
}

function isPopupRequest(value: unknown): value is { type: "obs-playing:status" } {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === "obs-playing:status")
}

function isDebugMessage(value: unknown): value is { type: "obs-playing:debug"; provider: string; stage: string; reason: string } {
  if (!value || typeof value !== "object") return false
  const message = value as Record<string, unknown>
  return message.type === "obs-playing:debug" && typeof message.provider === "string"
    && typeof message.stage === "string" && typeof message.reason === "string"
}
