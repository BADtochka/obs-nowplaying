export interface MediaState {
  trackId?: string | null;
  title: string;
  artists: string[];
  album?: string | null;
  artwork?: string | null;
  duration?: number | null;
  position?: number | null;
  isPlaying: boolean;
  source: {
    transportId: string;
    service?: string | null;
  };
  timestamps?: {
    startedAt?: number | null;
    updatedAt: number;
  } | null;
}

export type TransportStatus = "connected" | "disconnected" | "error" | "loading";

const PROVIDER_NAMES = ["YouTube Music", "YouTube", "Spotify", "Yandex Music", "Яндекс Музыка", "VK Music"];

export function normalizeMediaTitle(value: string): string {
  let title = value.replace(/\s+/g, " ").trim();
  for (const provider of PROVIDER_NAMES) {
    const escaped = provider.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title
      .replace(new RegExp(`\\s*[-|•—–:]\\s*${escaped}$`, "i"), "")
      .replace(new RegExp(`^${escaped}\\s*[-|•—–:]\\s*`, "i"), "")
      .trim();
  }
  return title || value.trim();
}
