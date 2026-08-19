import type { WidgetSettings } from '@/media';

export const MAX_URL_CSS_LENGTH = 1400;

export function buildWidgetUrl(baseUrl: string, layout: string, settings: WidgetSettings): string {
  const url = new URL(baseUrl);
  url.searchParams.set('layout', layout);
  url.searchParams.set('background', settings.backgroundColor);
  url.searchParams.set('primary', settings.primaryColor);
  url.searchParams.set('secondary', settings.secondaryColor);
  url.searchParams.set('radius', String(settings.borderRadius));
  url.searchParams.set('accentMode', settings.accentMode);
  url.searchParams.set('accent', settings.accentColor);
  for (const [event, animation] of Object.entries(settings.animations))
    url.searchParams.set(`animation-${event}`, `${animation.preset},${animation.duration},${animation.easing}`);
  const css = settings.customCss.trim();
  if (css && css.length <= MAX_URL_CSS_LENGTH) {
    const bytes = new TextEncoder().encode(css);
    url.searchParams.set('css', btoa(String.fromCharCode(...bytes)));
  }
  return url.toString();
}
