import type { MediaState } from '@obs-playing/shared';

export type { MediaState };

export interface WidgetSettings {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  borderRadius: number;
  cardPadding: number;
  accentMode: 'custom' | 'artwork';
  accentColor: string;
  marqueeEnabled: boolean;
  animations: WidgetAnimations;
}

export type AnimationPreset = 'none' | 'fade' | 'slide' | 'scale' | 'blur';
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export interface AnimationSetting {
  preset: AnimationPreset;
  duration: number;
  easing: AnimationEasing;
}

export interface WidgetAnimations {
  show: AnimationSetting;
  hide: AnimationSetting;
  change: AnimationSetting;
  playback: AnimationSetting;
}

export const animationPresets: AnimationPreset[] = ['none', 'fade', 'slide', 'scale', 'blur'];
export const animationEasings: AnimationEasing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];
export function defaultAnimations(): WidgetAnimations {
  return {
    show: { preset: 'fade', duration: 220, easing: 'ease-out' },
    hide: { preset: 'fade', duration: 180, easing: 'ease-in' },
    change: { preset: 'slide', duration: 260, easing: 'ease-in-out' },
    playback: { preset: 'scale', duration: 160, easing: 'ease-out' },
  };
}

export const previewMedia: MediaState = {
  trackId: 'preview',
  title: 'Waiting for media',
  artists: ['OBS Playing'],
  isPlaying: false,
  source: { transportId: 'preview', service: 'Preview' },
};
