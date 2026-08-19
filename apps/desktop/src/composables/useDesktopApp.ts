import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { previewMedia, type MediaState, type WidgetSettings } from '@/media';
import {
  LEGACY_STORAGE_KEY,
  SETTINGS_VERSION,
  STORAGE_KEY,
  defaultSavedSettings,
  parseSavedSettings,
  type SavedSettings,
} from '@/core/settings';
import { buildWidgetUrl } from '@/core/widget-url';
import type { Diagnostics, Section, TransportConfig } from '@/core/types';
import type { Translate } from '@/core/i18n';

export function useDesktopApp(t: Translate) {
  const initial = parseSavedSettings(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY));
  const activeSection = ref<Section>('now');
  const media = ref<MediaState | null>(null);
  const connected = ref(false);
  const widgetBaseUrl = ref('http://127.0.0.1:3030/widget');
  const error = ref('');
  const copied = ref(false);
  const layout = ref(initial.layout);
  const settings = reactive<WidgetSettings>(initial.settings);
  const transports = reactive<TransportConfig>(initial.transports);
  const diagnostics = ref<Diagnostics | null>(null);
  const preview = computed(() => media.value ?? previewMedia);
  const activeMedia = computed(() => media.value ?? diagnostics.value?.activeMedia ?? null);
  const widgetUrl = computed(() => buildWidgetUrl(widgetBaseUrl.value, layout.value, settings));
  let socket: WebSocket | undefined;
  let reconnectTimer: number | undefined;
  let diagnosticsTimer: number | undefined;

  function snapshot(): SavedSettings {
    return {
      version: SETTINGS_VERSION,
      layout: layout.value,
      settings: {
        ...settings,
        animations: {
          show: { ...settings.animations.show },
          hide: { ...settings.animations.hide },
          change: { ...settings.animations.change },
          playback: { ...settings.animations.playback },
        },
      },
      transports: { ...transports },
    };
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  }
  async function refreshDiagnostics() {
    try {
      diagnostics.value = await invoke<Diagnostics>('get_diagnostics');
      if (JSON.stringify(transports) !== JSON.stringify(diagnostics.value.config))
        Object.assign(transports, diagnostics.value.config);
      error.value = '';
    } catch {
      diagnostics.value = null;
    }
  }
  async function syncTransports() {
    try {
      diagnostics.value = await invoke<Diagnostics>('update_transport_config', { config: { ...transports } });
      error.value = '';
    } catch {
      error.value = t('savedLocal');
    }
  }
  function resetSettings() {
    const defaults = defaultSavedSettings();
    layout.value = defaults.layout;
    Object.assign(settings, defaults.settings);
    Object.assign(transports, defaults.transports);
    persist();
    void syncTransports();
  }
  async function copyWidgetUrl() {
    try {
      await navigator.clipboard.writeText(widgetUrl.value);
      copied.value = true;
      window.setTimeout(() => {
        copied.value = false;
      }, 1_500);
    } catch {
      error.value = t('copyFailed');
    }
  }
  function connect() {
    socket = new WebSocket('ws://127.0.0.1:3030/ws');
    socket.onopen = () => {
      connected.value = true;
    };
    socket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as MediaState | null;
        media.value = update && typeof update.title === 'string' && Array.isArray(update.artists) ? update : null;
      } catch {
        media.value = null;
      }
    };
    socket.onclose = () => {
      connected.value = false;
      reconnectTimer = window.setTimeout(connect, 2_000);
    };
    socket.onerror = () => socket?.close();
  }

  onMounted(async () => {
    persist();
    try {
      widgetBaseUrl.value = await invoke<string>('get_widget_url');
    } catch {
      /* Browser preview uses the local default. */
    }
    await syncTransports();
    await refreshDiagnostics();
    diagnosticsTimer = window.setInterval(() => {
      void refreshDiagnostics();
    }, 2_000);
    connect();
  });
  onBeforeUnmount(() => {
    window.clearTimeout(reconnectTimer);
    window.clearInterval(diagnosticsTimer);
    socket?.close();
  });
  watch(
    [layout, settings, transports],
    () => {
      persist();
      void syncTransports();
    },
    { deep: true },
  );

  return {
    activeSection,
    media,
    connected,
    widgetBaseUrl,
    error,
    copied,
    layout,
    settings,
    transports,
    diagnostics,
    preview,
    activeMedia,
    widgetUrl,
    refreshDiagnostics,
    resetSettings,
    copyWidgetUrl,
  };
}
