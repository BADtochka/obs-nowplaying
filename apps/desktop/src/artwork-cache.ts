const MAX_ENTRIES = 64;

export interface ArtworkResource {
  src: string;
  palette: ArtworkPalette | null;
}

export interface ArtworkPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
}

const cache = new Map<string, Promise<ArtworkResource>>();

function trimCache() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) return;
    cache.delete(oldest);
  }
}

function hex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(color: number[], target: number, amount: number) {
  return hex(...color.map((value) => value + (target - value) * amount) as [number, number, number]);
}

function extractPalette(image: HTMLImageElement): ArtworkPalette | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 64, 64);
    const data = context.getImageData(0, 0, 64, 64).data;
    const buckets = new Map<string, { red: number; green: number; blue: number; count: number }>();
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, count: 0 };
      bucket.red += r; bucket.green += g; bucket.blue += b; bucket.count += 1;
      buckets.set(key, bucket);
    }
    let best: [number, number, number] | null = null;
    let bestScore = -1;
    for (const bucket of buckets.values()) {
      const color: [number, number, number] = [bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count];
      const max = Math.max(...color);
      const min = Math.min(...color);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = (max + min) / 510;
      if (saturation < 0.25 || luminance < 0.1 || luminance > 0.92) continue;
      const score = saturation * bucket.count * (1 - Math.abs(luminance - 0.55));
      if (score > bestScore) { best = color; bestScore = score; }
    }
    if (!best) return null;
    const scale = 220 / Math.max(...best);
    const accent = best.map((value) => Math.min(255, value * scale));
    return {
      accent: hex(...accent as [number, number, number]),
      background: mix(accent, 0, 0.82),
      primary: mix(accent, 255, 0.86),
      secondary: mix(accent, 255, 0.58),
    };
  } catch {
    // Sampling can fail even after a successful image load, so keep the custom accent fallback.
    return null;
  }
}

export function extractArtworkAccent(src: string, image: HTMLImageElement) {
  const cached = cache.get(src);
  if (cached) return cached;

  // The image has already loaded in Artwork.vue; sampling it cannot trigger another request.
  const resource = Promise.resolve({ src, palette: extractPalette(image) });
  cache.set(src, resource);
  void resource.then(({ palette }) => {
    if (!palette && cache.get(src) === resource) cache.delete(src);
  });
  trimCache();
  return resource;
}
