import {
  animationEasings,
  animationPresets,
  defaultAnimations,
  type WidgetAnimations,
  type WidgetSettings,
} from '@/media';
import { layoutOptions } from '@/components/layouts';
import type { TransportConfig, TransportMode } from './types';

export const STORAGE_KEY = 'obs-playing.desktop-settings';
export const LEGACY_STORAGE_KEY = 'obs-playing.settings';
export const SETTINGS_VERSION = 7;

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
  accentMode: 'artwork',
  accentColor: '#d4a56a',
  marqueeEnabled: true,
};

export const DEFAULT_TRANSPORTS: TransportConfig = {
  nativeMediaEnabled: true,
  browserExtensionEnabled: true,
  nativeMediaPriority: 10,
  browserExtensionPriority: 20,
  mode: 'auto',
};

export function defaultSavedSettings(): SavedSettings {
  return {
    version: SETTINGS_VERSION,
    layout: 'compact',
    settings: { ...DEFAULT_SETTINGS, animations: defaultAnimations() },
    transports: { ...DEFAULT_TRANSPORTS },
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
      for (const key of ['backgroundColor', 'primaryColor', 'secondaryColor', 'accentColor'] as const)
        if (validColor(saved[key])) result.settings[key] = saved[key];
      if (saved.accentMode === 'custom' || saved.accentMode === 'artwork')
        result.settings.accentMode = saved.accentMode;
      if (typeof saved.borderRadius === 'number' && Number.isFinite(saved.borderRadius))
        result.settings.borderRadius = clamp(saved.borderRadius, 0, 32);
      if (typeof saved.cardPadding === 'number' && Number.isFinite(saved.cardPadding))
        result.settings.cardPadding = clamp(saved.cardPadding, 0, 32);
      if (typeof saved.marqueeEnabled === 'boolean') result.settings.marqueeEnabled = saved.marqueeEnabled;
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
    }
    return result;
  } catch {
    return result;
  }
}
