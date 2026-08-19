import { afterEach, expect, test } from "bun:test"
import type { MediaState } from "@obs-playing/shared"
import { ExtensionTransport } from "./transport"

const media: MediaState = {
  title: "Track title",
  artists: ["Artist"],
  artwork: "https://example.com/cover.jpg",
  isPlaying: true,
  source: { transportId: "extension", service: "Yandex Music" },
}

const originalWebSocket = globalThis.WebSocket
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
  globalThis.fetch = originalFetch
})

test("WebSocket send records media and a later clear", () => {
  class SocketMock {
    static OPEN = 1
    static CLOSED = 3
    static instance: SocketMock
    readyState = SocketMock.OPEN
    sent: string[] = []
    onopen: (() => void) | null = null
    onclose: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor() { SocketMock.instance = this }
    send(value: string) { this.sent.push(value) }
    close() { this.readyState = SocketMock.CLOSED }
  }
  globalThis.WebSocket = SocketMock as unknown as typeof WebSocket
  const transport = new ExtensionTransport()

  transport.publish(media)
  SocketMock.instance.onopen?.()
  expect(transport.snapshot().lastSentMedia).toEqual(media)
  transport.publish(null)
  expect(transport.snapshot().lastSentMedia).toBeNull()
  expect(transport.snapshot().lastSentAt).not.toBeNull()
})

test("successful HTTP fallback records the same snapshot contract", async () => {
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch
  const transport = new ExtensionTransport()
  const internals = transport as unknown as {
    pending: MediaState | null
    hasPending: boolean
    flushHttp(): Promise<void>
  }
  internals.pending = media
  internals.hasPending = true

  await internals.flushHttp()

  expect(transport.snapshot().lastSentMedia).toEqual(media)
  expect(transport.snapshot().lastSentAt).not.toBeNull()
})
