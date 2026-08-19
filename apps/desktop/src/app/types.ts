import type { MediaState } from '@/media';

export type Section = 'now' | 'transports' | 'visual';
export type Locale = 'en' | 'ru';
export type TransportMode = 'auto' | 'browserExtension' | 'nativeMedia' | 'mock';

export interface TransportConfig {
  nativeMediaEnabled: boolean;
  browserExtensionEnabled: boolean;
  nativeMediaPriority: number;
  browserExtensionPriority: number;
  mode: TransportMode;
}

export interface TransportDiagnostic {
  id: string;
  enabled: boolean;
  priority: number;
  status: string;
  lastUpdatedAt: number | null;
  active: boolean;
  message: string;
}

export interface Diagnostics {
  config: TransportConfig;
  activeMedia: MediaState | null;
  transports: TransportDiagnostic[];
}
