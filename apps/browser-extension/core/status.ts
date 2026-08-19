import type { MediaState } from "@obs-playing/shared"
import type { TransportSnapshot } from "./transport"

export interface ExtensionStatus {
  transport: TransportSnapshot
  detectedMedia: MediaState | null
  debug: ProviderDebug | null
}

export interface ProviderDebug {
  provider: string
  stage: string
  reason: string
  updatedAt: number
}

export function statusSnapshot(transport: TransportSnapshot, detectedMedia: MediaState | null, debug: ProviderDebug | null = null): ExtensionStatus {
  return { transport, detectedMedia, debug }
}

export function sentMedia(status: ExtensionStatus | null): MediaState | null {
  return status?.transport.lastSentMedia ?? null
}

/** Reject an unrelated runtime response before rendering it in the popup. */
export function extensionStatusFromResponse(value: unknown): ExtensionStatus | null {
  if (!value || typeof value !== "object") return null
  const status = value as Partial<ExtensionStatus>
  const transport = status.transport
  if (!transport || typeof transport !== "object") return null
  const snapshot = transport as Partial<TransportSnapshot>
  if (!isConnectionStatus(snapshot.status)
    || !hasNullableMedia(snapshot.lastSentMedia)
    || !hasNullableTimestamp(snapshot.lastSentAt)
    || !hasNullableMedia(status.detectedMedia)
    || !hasNullableDebug(status.debug)) return null
  return status as ExtensionStatus
}

function isConnectionStatus(value: unknown): value is TransportSnapshot["status"] {
  return value === "connected" || value === "reconnecting" || value === "disconnected" || value === "error"
}

function hasNullableMedia(value: unknown): value is MediaState | null {
  return value === null || (typeof value === "object" && value !== null)
}

function hasNullableTimestamp(value: unknown): value is number | null {
  return value === null || typeof value === "number"
}

function hasNullableDebug(value: unknown): value is ProviderDebug | null {
  if (value === null) return true
  if (!value || typeof value !== "object") return false
  const debug = value as Partial<ProviderDebug>
  return typeof debug.provider === "string" && typeof debug.stage === "string"
    && typeof debug.reason === "string" && typeof debug.updatedAt === "number"
}
