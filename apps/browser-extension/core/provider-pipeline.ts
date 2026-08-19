import type { MediaState } from "@obs-playing/shared"
import type { ExtensionConfig, ExtensionProvider } from "./provider-config"

export interface ProviderMatch {
  id: ExtensionProvider
  service: string
}

export interface TabMediaEntry {
  state: MediaState
  lastSeen: number
  hasPlayed: boolean
}

const providers: Array<ProviderMatch & { hostname: string }> = [
  { id: "yandexMusic", service: "Yandex Music", hostname: "music.yandex.ru" },
  { id: "youtubeMusic", service: "YouTube Music", hostname: "music.youtube.com" },
  { id: "youtube", service: "YouTube", hostname: "www.youtube.com" },
  { id: "spotify", service: "Spotify", hostname: "open.spotify.com" },
  { id: "vkMusic", service: "VK Music", hostname: "vk.com" },
]

export function matchProvider(hostname: string, _pathname = "/"): ProviderMatch | null {
  const provider = providers.find((candidate) => candidate.hostname === hostname)
  return provider ? { id: provider.id, service: provider.service } : null
}

export function providerFromService(service: string): ProviderMatch | null {
  const provider = providers.find((candidate) => candidate.service === service)
  return provider ? { id: provider.id, service: provider.service } : null
}

export function mediaValidationReason(value: unknown): string | null {
  if (!value || typeof value !== "object") return "invalid-message"
  const media = value as Partial<MediaState>
  if (typeof media.title !== "string" || !media.title.trim()) return "missing-title"
  if (!Array.isArray(media.artists) || media.artists.some((artist) => typeof artist !== "string")) return "invalid-artists"
  if (typeof media.isPlaying !== "boolean") return "invalid-playback"
  if (typeof media.source?.service !== "string" || !providerFromService(media.source.service)) return "unknown-service"
  return null
}

export function providerGateReason(config: ExtensionConfig, provider: ExtensionProvider): string | null {
  if (!config.enabled) return "transport-disabled"
  if (!config.providers.includes(provider)) return "provider-disabled"
  if (config.provider !== "auto" && config.provider !== provider) return `provider-not-selected:${config.provider}`
  return null
}

export function selectTabMedia(entries: Iterable<TabMediaEntry>, now: number, staleMs: number): MediaState | null {
  const fresh = [...entries].filter((entry) => entry.hasPlayed && entry.lastSeen >= now - staleMs)
  return fresh
    .sort((left, right) => Number(right.state.isPlaying) - Number(left.state.isPlaying) || right.lastSeen - left.lastSeen)[0]?.state ?? null
}
