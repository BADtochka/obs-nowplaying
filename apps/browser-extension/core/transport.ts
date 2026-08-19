import type { MediaState } from "@obs-playing/shared"

const WS_URL = "ws://127.0.0.1:3030/ws"
const INGEST_URL = "http://127.0.0.1:3030/ingest"

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected" | "error"

export interface TransportSnapshot {
  status: ConnectionStatus
  lastSentMedia: MediaState | null
  lastSentAt: number | null
}

/** Realtime extension transport with HTTP fallback while the desktop app starts. */
export class ExtensionTransport {
  private socket: WebSocket | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private fallbackTimer: ReturnType<typeof setTimeout> | undefined
  private pending: MediaState | null = null
  private hasPending = false
  private retryDelay = 1_000
  private status: ConnectionStatus = "disconnected"
  private lastSentMedia: MediaState | null = null
  private lastSentAt: number | null = null

  snapshot(): TransportSnapshot {
    return { status: this.status, lastSentMedia: this.lastSentMedia, lastSentAt: this.lastSentAt }
  }

  publish(state: MediaState | null) {
    if (!this.hasPending && state === null && this.lastSentAt !== null && this.lastSentMedia === null) return

    this.pending = state
    this.hasPending = true

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.flushSocket()
      return
    }

    this.connect()
    if (!this.fallbackTimer) {
      this.fallbackTimer = setTimeout(() => {
        this.fallbackTimer = undefined
        void this.flushHttp()
      }, 2_000)
    }
  }

  private connect() {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return

    this.status = "reconnecting"
    const socket = new WebSocket(WS_URL)
    this.socket = socket
    socket.onopen = () => {
      this.status = "connected"
      this.retryDelay = 1_000
      this.flushSocket()
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = undefined
      this.status = "reconnecting"
      this.scheduleReconnect()
    }
    socket.onerror = () => {
      this.status = "error"
      socket.close()
    }
  }

  private flushSocket() {
    if (!this.hasPending || this.socket?.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(this.pending))
    this.recordSent(this.pending)
    this.pending = null
    this.hasPending = false
    this.retryDelay = 1_000
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.connect()
    }, this.retryDelay)
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000)
  }

  private async flushHttp() {
    if (!this.hasPending) return
    const state = this.pending
    try {
      const response = await fetch(INGEST_URL, {
        method: state ? "POST" : "DELETE",
        headers: state ? { "content-type": "application/json" } : undefined,
        body: state ? JSON.stringify(state) : undefined,
      })
      if (!response.ok) throw new Error(`ingest failed: ${response.status}`)
      if (this.hasPending && this.pending === state) {
        this.recordSent(state)
        this.pending = null
        this.hasPending = false
      }
      this.retryDelay = 1_000
    } catch {
      this.scheduleReconnect()
    }
  }

  private recordSent(state: MediaState | null) {
    this.lastSentMedia = state
    this.lastSentAt = Date.now()
  }
}
