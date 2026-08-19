const MAX_ENTRIES = 64;

export interface ArtworkResource {
  src: string;
  accent: string | null;
}

const cache = new Map<string, Promise<ArtworkResource>>();

function trimCache() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) return;
    cache.delete(oldest);
  }
}

function extractAccent(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 24, 24);
    const data = context.getImageData(0, 0, 24, 24).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let weight = 0;
    for (let index = 0; index < data.length; index += 16) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 510;
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      if (lightness < 0.12 || lightness > 0.88 || saturation < 0.15) continue;
      const pixelWeight = 0.25 + saturation;
      red += r * pixelWeight;
      green += g * pixelWeight;
      blue += b * pixelWeight;
      weight += pixelWeight;
    }
    if (!weight) return null;
    return `rgb(${Math.round(red / weight)} ${Math.round(green / weight)} ${Math.round(blue / weight)})`;
  } catch {
    // Sampling can fail even after a successful image load, so keep the custom accent fallback.
    return null;
  }
}

export function extractArtworkAccent(src: string, image: HTMLImageElement) {
  const cached = cache.get(src);
  if (cached) return cached;

  // The image has already loaded in Artwork.vue; sampling it cannot trigger another request.
  const resource = Promise.resolve({ src, accent: extractAccent(image) });
  cache.set(src, resource);
  void resource.then(({ accent }) => {
    if (!accent && cache.get(src) === resource) cache.delete(src);
  });
  trimCache();
  return resource;
}
