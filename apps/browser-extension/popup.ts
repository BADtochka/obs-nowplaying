import type { MediaState } from "@obs-playing/shared"
import { extensionStatusFromResponse, sentMedia, type ExtensionStatus } from "./core/status"
import { extensionConfigFromHealth, extensionProviders, type ExtensionConfig, type ExtensionProvider } from "./core/provider-config"
import { providerFromService, providerGateReason } from "./core/provider-pipeline"
import { createPopupComponent } from "./core/popup-entry"
import { sendRuntimeMessage } from "./core/runtime"
import "./popup.css"

const endpoint = "http://127.0.0.1:3030/health"
const configEndpoint = "http://127.0.0.1:3030/extension-config"
let root: HTMLElement

function mediaDetails(media: MediaState | null) {
  if (!media) return "No media received yet"
  return [media.title, media.artists.filter(Boolean).join(", ")].filter(Boolean).join(" - ")
}

const providerLabels: Record<ExtensionProvider, string> = {
  yandexMusic: "Yandex Music", youtubeMusic: "YouTube Music", youtube: "YouTube", spotify: "Spotify", vkMusic: "VK Music",
}

async function saveConfig(config: ExtensionConfig) {
  await fetch(configEndpoint, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  })
  await refresh()
}

function render(status: ExtensionStatus | null, health: "online" | "offline", config: ExtensionConfig | null, diagnostic: string | null = null) {
  const connection = status?.transport.status ?? "disconnected"
  const sent = sentMedia(status)
  const sentAt = status?.transport.lastSentAt
  const detectedProvider = status?.detectedMedia ? providerFromService(status.detectedMedia.source.service || "") : null
  const gateReason = config && detectedProvider ? providerGateReason(config, detectedProvider.id) : null
  root.replaceChildren()
  const card = document.createElement("section")
  card.className = "card"
  const eyebrow = document.createElement("p")
  eyebrow.className = "eyebrow"
  eyebrow.textContent = "OBS Playing"
  const heading = document.createElement("h1")
  heading.textContent = "Browser sync"
  const badge = document.createElement("div")
  badge.className = `status ${connection}`
  badge.append(document.createElement("span"), document.createTextNode(connection))
  const details = document.createElement("dl")
  for (const [label, value] of [
    ["Desktop app", health === "online" ? "Connected" : "Unavailable"],
    ["Last media", mediaDetails(sent)],
    ["Source", sent?.source.service || "Unavailable"],
    ["Artwork", sent?.artwork || "Unavailable"],
    ["Sent", sentAt ? new Date(sentAt).toLocaleTimeString() : "Not sent yet"],
    ["Debug", diagnostic || gateReason || (status?.debug ? `${status.debug.stage}: ${status.debug.reason}` : "No diagnostic yet")],
  ]) {
    const row = document.createElement("div")
    const term = document.createElement("dt")
    term.textContent = label
    const description = document.createElement("dd")
    description.textContent = value
    row.append(term, description)
    details.append(row)
  }
  card.append(eyebrow, heading, badge, details)
  const controls = document.createElement("section")
  controls.className = "provider-controls"
  const controlsHeading = document.createElement("h2")
  controlsHeading.textContent = "Providers"
  controls.append(controlsHeading)
  if (!config) {
    const unavailable = document.createElement("p")
    unavailable.className = "muted"
    unavailable.textContent = health === "online"
      ? "Unavailable because desktop app configuration could not be read"
      : "Unavailable while the desktop app is offline"
    controls.append(unavailable)
  } else {
    const enabledLabel = document.createElement("label")
    enabledLabel.className = "toggle-row"
    enabledLabel.append(document.createTextNode("Browser Extension transport"))
    const enabled = document.createElement("input")
    enabled.type = "checkbox"
    enabled.checked = config.enabled
    enabled.addEventListener("change", () => void saveConfig({ ...config, enabled: enabled.checked }))
    enabledLabel.append(enabled)
    controls.append(enabledLabel)

    const select = document.createElement("select")
    select.disabled = !config.enabled
    for (const [value, label] of [["auto", "Auto"], ...extensionProviders.map((provider) => [provider, providerLabels[provider]])]) {
      const option = document.createElement("option")
      option.value = value
      option.textContent = label
      option.selected = value === config.provider
      option.disabled = value !== "auto" && !config.providers.includes(value as ExtensionProvider)
      select.append(option)
    }
    select.addEventListener("change", () => void saveConfig({ ...config, provider: select.value as ExtensionConfig["provider"] }))
    controls.append(select)

    for (const provider of extensionProviders) {
      const label = document.createElement("label")
      label.className = "toggle-row"
      label.append(document.createTextNode(providerLabels[provider]))
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.disabled = !config.enabled
      checkbox.checked = config.providers.includes(provider)
      checkbox.addEventListener("change", () => void saveConfig({
        ...config,
        providers: checkbox.checked ? [...new Set([...config.providers, provider])] : config.providers.filter((item) => item !== provider),
      }))
      label.append(checkbox)
      controls.append(label)
    }
    if (!config.enabled) {
      const disabled = document.createElement("p")
      disabled.className = "muted"
      disabled.textContent = "Provider publishing is disabled"
      controls.append(disabled)
    }
  }
  root.append(card)
  root.append(controls)
}

async function refresh() {
  const [statusResult, healthResult] = await Promise.all([
    getStatus(),
    getHealth(),
  ])
  const { status, diagnostic: statusDiagnostic } = statusResult
  const { response: healthResponse, diagnostic: healthDiagnostic } = healthResult
  const health = healthResponse ? "online" as const : "offline" as const
  render(status, health, extensionConfigFromHealth(healthResponse), statusDiagnostic || healthDiagnostic)
}

async function getStatus(): Promise<{ status: ExtensionStatus | null; diagnostic: string | null }> {
  try {
    const status = extensionStatusFromResponse(await sendRuntimeMessage({ type: "obs-playing:status" }))
    return { status, diagnostic: status ? null : "status-null" }
  } catch (error) {
    return { status: null, diagnostic: `runtime-message-error: ${errorMessage(error)}` }
  }
}

async function getHealth(): Promise<{ response: unknown | null; diagnostic: string | null }> {
  try {
    const response = await fetch(endpoint)
    if (!response.ok) return { response: null, diagnostic: `health-http-status: ${response.status}` }
    return { response: await response.json() as unknown, diagnostic: null }
  } catch (error) {
    return { response: null, diagnostic: `health-fetch-error: ${errorMessage(error)}` }
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function startPopup(element: HTMLElement) {
  root = element
  render(null, "offline", null)
  void refresh()
  const timer = window.setInterval(() => void refresh(), 2_000)
  return () => window.clearInterval(timer)
}

export default createPopupComponent(startPopup)
