import { expect, test } from "bun:test"
import type { MediaState } from "@obs-playing/shared"
import { extensionStatusFromResponse, sentMedia, statusSnapshot, type ExtensionStatus } from "./status"

const media: MediaState = {
  title: "Track title",
  artists: ["Artist"],
  artwork: "https://example.com/cover.jpg",
  isPlaying: true,
  source: { transportId: "extension", service: "Yandex Music" },
}

test("popup reads the media that transport actually sent from a serialized response", () => {
  const response = statusSnapshot({ status: "connected", lastSentMedia: media, lastSentAt: 123 }, media)
  const messageResponse = JSON.parse(JSON.stringify(response)) as ExtensionStatus

  expect(sentMedia(messageResponse)).toEqual(media)
  expect(messageResponse.detectedMedia).toEqual(media)
  expect(messageResponse.transport.lastSentAt).toBe(123)
  expect(messageResponse.debug).toBeNull()
})

test("explicit clear does not expose detected media as currently sent", () => {
  const response = statusSnapshot({ status: "connected", lastSentMedia: null, lastSentAt: 456 }, media)

  expect(sentMedia(response)).toBeNull()
  expect(response.detectedMedia).toEqual(media)
})

test("accepts the serialized popup runtime status response and rejects missing responses", () => {
  const response = JSON.parse(JSON.stringify(statusSnapshot({ status: "connected", lastSentMedia: media, lastSentAt: 123 }, media)))

  expect(extensionStatusFromResponse(response)).toEqual(response)
  expect(extensionStatusFromResponse(null)).toBeNull()
  expect(extensionStatusFromResponse({ transport: { status: "connected" } })).toBeNull()
})
