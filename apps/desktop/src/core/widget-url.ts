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
  url.searchParams.set('accent', settings.accentColor);
  for (const role of ['background', 'primary', 'secondary', 'accent'] as const)
    url.searchParams.set(`${role}Source`, settings.colorSources[role]);
  // Keep old widget URLs readable by older releases while colorSources is adopted.
  url.searchParams.set('accentMode', settings.colorSources.accent);
  url.searchParams.set('border', settings.borderEnabled ? '1' : '0');
  url.searchParams.set('borderColor', settings.borderColor);
  url.searchParams.set('borderWidth', String(settings.borderWidth));
  url.searchParams.set('blurredBackground', settings.blurredBackgroundEnabled ? '1' : '0');
  url.searchParams.set('backgroundBlur', String(settings.backgroundBlur));
  url.searchParams.set('backgroundOpacity', String(settings.backgroundOpacity));
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

  for (const role of ['background', 'primary', 'secondary', 'accent'] as const) {
    const source = params.get(`${role}Source`);
    if (source === 'custom' || source === 'artwork') settings.colorSources[role] = source;
  }
  const legacyAccentMode = params.get('accentMode');
  if (!params.has('accentSource') && (legacyAccentMode === 'custom' || legacyAccentMode === 'artwork'))
    settings.colorSources.accent = legacyAccentMode;
  for (const [parameter, setting] of [
    ['borderColor', 'borderColor'],
  ] as const) {
    const value = params.get(parameter);
    if (value && /^#[0-9a-f]{6}$/i.test(value)) settings[setting] = value;
  }
  if (params.get('border') === '0' || params.get('border') === '1') settings.borderEnabled = params.get('border') === '1';
  if (params.get('blurredBackground') === '0' || params.get('blurredBackground') === '1')
    settings.blurredBackgroundEnabled = params.get('blurredBackground') === '1';
  for (const [parameter, setting, min, max] of [
    ['borderWidth', 'borderWidth', 1, 8],
    ['backgroundBlur', 'backgroundBlur', 0, 40],
    ['backgroundOpacity', 'backgroundOpacity', 0, 100],
  ] as const) {
    const raw = params.get(parameter);
    const value = Number(raw);
    if (raw !== null && Number.isFinite(value)) settings[setting] = Math.min(max, Math.max(min, value));
  }
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
