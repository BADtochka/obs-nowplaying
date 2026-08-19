import type { WidgetSettings } from '@/media';
import { animationEasings, animationPresets } from '@/media';
import { defaultSavedSettings } from '@/core/settings';
import { layoutOptions } from '@/components/layouts';

export interface WidgetUrlConfig {
  layout: string;
  settings: WidgetSettings;
}

export function buildWidgetUrl(baseUrl: string, layout: string, settings: WidgetSettings): string {
  const url = new URL(baseUrl);
  url.searchParams.set('layout', layout);
  url.searchParams.set('background', settings.backgroundColor);
  url.searchParams.set('primary', settings.primaryColor);
  url.searchParams.set('secondary', settings.secondaryColor);
  url.searchParams.set('radius', String(settings.borderRadius));
  url.searchParams.set('padding', String(settings.cardPadding));
  url.searchParams.set('accentMode', settings.accentMode);
  url.searchParams.set('accent', settings.accentColor);
  url.searchParams.set('marquee', settings.marqueeEnabled ? '1' : '0');
  for (const [event, animation] of Object.entries(settings.animations))
    url.searchParams.set(`animation-${event}`, `${animation.preset},${animation.duration},${animation.easing}`);
  return url.toString();
}

export function parseWidgetUrl(search: string | URLSearchParams): WidgetUrlConfig {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const defaults = defaultSavedSettings();
  const settings = defaults.settings;
  const requestedLayout = params.get('layout');
  const layout = layoutOptions.some(({ id }) => id === requestedLayout) ? requestedLayout! : defaults.layout;

  for (const [parameter, setting] of [
    ['background', 'backgroundColor'],
    ['primary', 'primaryColor'],
    ['secondary', 'secondaryColor'],
    ['accent', 'accentColor'],
  ] as const) {
    const value = params.get(parameter);
    if (value && /^#[0-9a-f]{6}$/i.test(value)) settings[setting] = value;
  }

  settings.accentMode = params.get('accentMode') === 'custom' ? 'custom' : 'artwork';
  const marquee = params.get('marquee');
  if (marquee === '0' || marquee === '1') settings.marqueeEnabled = marquee === '1';
  const radiusValue = params.get('radius');
  const radius = Number(radiusValue);
  if (radiusValue !== null && Number.isFinite(radius)) settings.borderRadius = Math.min(32, Math.max(0, radius));
  const paddingValue = params.get('padding');
  const padding = Number(paddingValue);
  if (paddingValue !== null && Number.isFinite(padding)) settings.cardPadding = Math.min(32, Math.max(0, padding));

  for (const event of ['show', 'hide', 'change', 'playback'] as const) {
    const value = params.get(`animation-${event}`);
    if (!value) continue;
    const [preset, durationValue, easing] = value.split(',');
    const duration = Number(durationValue);
    if (animationPresets.includes(preset as (typeof animationPresets)[number]))
      settings.animations[event].preset = preset as (typeof animationPresets)[number];
    if (Number.isFinite(duration)) settings.animations[event].duration = Math.min(2000, Math.max(0, duration));
    if (animationEasings.includes(easing as (typeof animationEasings)[number]))
      settings.animations[event].easing = easing as (typeof animationEasings)[number];
  }

  return { layout, settings };
}
