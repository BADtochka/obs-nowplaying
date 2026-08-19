export const extensionProviders = ["yandexMusic", "youtubeMusic", "youtube", "spotify", "vkMusic"] as const
export type ExtensionProvider = typeof extensionProviders[number]
export type ExtensionProviderSelection = "auto" | ExtensionProvider

export interface ExtensionConfig {
  enabled: boolean
  providers: ExtensionProvider[]
  provider: ExtensionProviderSelection
}

export function isExtensionConfig(value: unknown): value is ExtensionConfig {
  if (!value || typeof value !== "object") return false
  const config = value as Partial<ExtensionConfig>
  return typeof config.enabled === "boolean"
    && Array.isArray(config.providers)
    && config.providers.every((provider) => extensionProviders.includes(provider as ExtensionProvider))
    && (config.provider === "auto" || extensionProviders.includes(config.provider as ExtensionProvider))
}

export function extensionConfigFromHealth(value: unknown): ExtensionConfig | null {
  if (!value || typeof value !== "object") return null
  const config = (value as { extensionConfig?: unknown }).extensionConfig
  return isExtensionConfig(config) ? config : null
}
