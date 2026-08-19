import type { MediaState } from "@obs-playing/shared"
import { sentMedia, type ExtensionStatus } from "./core/status"
import "./popup.css"

const endpoint = "http://127.0.0.1:3030/health"
const root = document.createElement("main")
root.className = "popup"
document.body.append(root)

function mediaDetails(media: MediaState | null) {
  if (!media) return "No media received yet"
  return [media.title, media.artists.filter(Boolean).join(", ")].filter(Boolean).join(" - ")
}

function render(status: ExtensionStatus | null, health: "online" | "offline") {
  const connection = status?.transport.status ?? "disconnected"
  const sent = sentMedia(status)
  const sentAt = status?.transport.lastSentAt
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
  root.append(card)
}

async function refresh() {
  const [status, health] = await Promise.all([
    chrome.runtime.sendMessage({ type: "obs-playing:status" }).catch(() => null) as Promise<ExtensionStatus | null>,
    fetch(endpoint).then((response) => response.ok ? "online" as const : "offline" as const).catch(() => "offline" as const),
  ])
  render(status, health)
}

render(null, "offline")
void refresh()
setInterval(() => void refresh(), 2_000)
