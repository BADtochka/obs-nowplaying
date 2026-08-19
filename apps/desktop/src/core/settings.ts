import {
  animationEasings,
  animationPresets,
  defaultAnimations,
  type WidgetAnimations,
  type WidgetSettings,
} from '@/media';
import { layoutOptions } from '@/components/layouts';
import { extensionProviders, type ExtensionProvider, type TransportConfig, type TransportMode } from './types';

export const STORAGE_KEY = 'obs-playing.desktop-settings';
export const LEGACY_STORAGE_KEY = 'obs-playing.settings';
export const SETTINGS_VERSION = 8;

export interface SavedSettings {
  version: number;
  layout: string;
  settings: WidgetSettings;
  transports: TransportConfig;
}

export const DEFAULT_SETTINGS: Omit<WidgetSettings, 'animations'> = {
  backgroundColor: '#141416',
  primaryColor: '#f6f2ea',
  secondaryColor: '#aaa7a1',
  borderRadius: 8,
  cardPadding: 12,
  accentColor: '#d4a56a',
  colorSources: { background: 'custom', primary: 'custom', secondary: 'custom', accent: 'artwork' },
  borderEnabled: false,
  borderColor: '#ffffff',
  borderWidth: 1,
  blurredBackgroundEnabled: false,
  backgroundBlur: 20,
  backgroundOpacity: 88,
  marqueeEnabled: true,
};

export const DEFAULT_TRANSPORTS: TransportConfig = {
  nativeMediaEnabled: true,
  browserExtensionEnabled: true,
  nativeMediaPriority: 10,
  browserExtensionPriority: 20,
  browserExtensionProviders: [...extensionProviders],
  browserExtensionProvider: 'auto',
  mode: 'auto',
};

export function defaultSavedSettings(): SavedSettings {
  return {
    version: SETTINGS_VERSION,
    layout: 'compact',
    settings: { ...DEFAULT_SETTINGS, colorSources: { ...DEFAULT_SETTINGS.colorSources }, animations: defaultAnimations() },
    transports: { ...DEFAULT_TRANSPORTS, browserExtensionProviders: [...DEFAULT_TRANSPORTS.browserExtensionProviders] },
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const validColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function parseSavedSettings(raw: string | null): SavedSettings {
  const result = defaultSavedSettings();
  if (!raw) return result;
  try {
    const value = JSON.parse(raw) as Partial<SavedSettings>;
    if ((value.version ?? 1) > SETTINGS_VERSION) return result;
    if (value.layout === 'card') result.layout = 'compact';
    else if (value.layout && layoutOptions.some((option) => option.id === value.layout)) result.layout = value.layout;
    const saved = value.settings as Partial<WidgetSettings> | undefined;
    if (saved) {
      for (const key of ['backgroundColor', 'primaryColor', 'secondaryColor', 'accentColor', 'borderColor'] as const)
        if (validColor(saved[key])) result.settings[key] = saved[key];
      const legacyAccentMode = (saved as Partial<WidgetSettings> & { accentMode?: unknown }).accentMode;
      if (legacyAccentMode === 'custom' || legacyAccentMode === 'artwork')
        result.settings.colorSources.accent = legacyAccentMode;
      if (saved.colorSources)
        for (const role of ['background', 'primary', 'secondary', 'accent'] as const)
          if (saved.colorSources[role] === 'custom' || saved.colorSources[role] === 'artwork')
            result.settings.colorSources[role] = saved.colorSources[role];
      if (typeof saved.borderRadius === 'number' && Number.isFinite(saved.borderRadius))
        result.settings.borderRadius = clamp(saved.borderRadius, 0, 32);
      if (typeof saved.cardPadding === 'number' && Number.isFinite(saved.cardPadding))
        result.settings.cardPadding = clamp(saved.cardPadding, 0, 32);
      if (typeof saved.marqueeEnabled === 'boolean') result.settings.marqueeEnabled = saved.marqueeEnabled;
      if (typeof saved.borderEnabled === 'boolean') result.settings.borderEnabled = saved.borderEnabled;
      if (typeof saved.borderWidth === 'number' && Number.isFinite(saved.borderWidth))
        result.settings.borderWidth = clamp(saved.borderWidth, 1, 8);
      if (typeof saved.blurredBackgroundEnabled === 'boolean')
        result.settings.blurredBackgroundEnabled = saved.blurredBackgroundEnabled;
      if (typeof saved.backgroundBlur === 'number' && Number.isFinite(saved.backgroundBlur))
        result.settings.backgroundBlur = clamp(saved.backgroundBlur, 0, 40);
      if (typeof saved.backgroundOpacity === 'number' && Number.isFinite(saved.backgroundOpacity))
        result.settings.backgroundOpacity = clamp(saved.backgroundOpacity, 0, 100);
      const animations = saved.animations as Partial<WidgetAnimations> | undefined;
      if (animations)
        for (const event of ['show', 'hide', 'change', 'playback'] as const) {
          const candidate = animations[event];
          if (!candidate) continue;
          if (candidate.preset && animationPresets.includes(candidate.preset))
            result.settings.animations[event].preset = candidate.preset;
          if (typeof candidate.duration === 'number' && Number.isFinite(candidate.duration))
            result.settings.animations[event].duration = clamp(candidate.duration, 0, 2000);
          if (candidate.easing && animationEasings.includes(candidate.easing))
            result.settings.animations[event].easing = candidate.easing;
        }
    }
    const transports = value.transports as Partial<TransportConfig> | undefined;
    if (transports) {
      if (typeof transports.nativeMediaEnabled === 'boolean')
        result.transports.nativeMediaEnabled = transports.nativeMediaEnabled;
      if (typeof transports.browserExtensionEnabled === 'boolean')
        result.transports.browserExtensionEnabled = transports.browserExtensionEnabled;
      if (typeof transports.nativeMediaPriority === 'number' && Number.isFinite(transports.nativeMediaPriority))
        result.transports.nativeMediaPriority = clamp(transports.nativeMediaPriority, -100, 100);
      if (
        typeof transports.browserExtensionPriority === 'number' &&
        Number.isFinite(transports.browserExtensionPriority)
      )
        result.transports.browserExtensionPriority = clamp(transports.browserExtensionPriority, -100, 100);
      if (['auto', 'browserExtension', 'nativeMedia', 'mock'].includes(transports.mode ?? ''))
        result.transports.mode = transports.mode as TransportMode;
      if (Array.isArray(transports.browserExtensionProviders))
        result.transports.browserExtensionProviders = [...new Set(transports.browserExtensionProviders.filter(
          (provider): provider is ExtensionProvider => extensionProviders.includes(provider as ExtensionProvider),
        ))];
      if (transports.browserExtensionProvider === 'auto' || extensionProviders.includes(transports.browserExtensionProvider as ExtensionProvider))
        result.transports.browserExtensionProvider = transports.browserExtensionProvider as TransportConfig['browserExtensionProvider'];
    }
    return result;
  } catch {
    return result;
  }
}
