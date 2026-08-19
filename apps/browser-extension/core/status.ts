import type { MediaState } from "@obs-playing/shared"
import type { TransportSnapshot } from "./transport"

export interface ExtensionStatus {
  transport: TransportSnapshot
  detectedMedia: MediaState | null
}

export function statusSnapshot(transport: TransportSnapshot, detectedMedia: MediaState | null): ExtensionStatus {
  return { transport, detectedMedia }
}

export function sentMedia(status: ExtensionStatus | null): MediaState | null {
  return status?.transport.lastSentMedia ?? null
}
