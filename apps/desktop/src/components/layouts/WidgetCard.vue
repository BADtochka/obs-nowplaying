<script setup lang="ts">
import type { WidgetSettings } from '@/media';

defineProps<{ settings: WidgetSettings; progress: number | null; artwork?: string | null }>();

function artworkUrl(src: string) {
  const url = new URL('/artwork', 'http://127.0.0.1:3030');
  url.searchParams.set('url', src);
  return url.toString();
}
</script>

<template>
  <div
    class="relative flex max-w-full flex-col overflow-hidden p-[var(--card-padding)]"
    :style="{
      '--card-padding': `${settings.cardPadding}px`,
      background: settings.blurredBackgroundEnabled
        ? `color-mix(in srgb, var(--background) ${settings.backgroundOpacity}%, transparent)`
        : 'var(--background)',
      border: settings.borderEnabled ? `${settings.borderWidth}px solid ${settings.borderColor}` : 'none',
      borderRadius: `${settings.borderRadius}px`,
      backdropFilter: settings.blurredBackgroundEnabled ? `blur(${settings.backgroundBlur}px) saturate(1.4)` : undefined,
      WebkitBackdropFilter: settings.blurredBackgroundEnabled ? `blur(${settings.backgroundBlur}px) saturate(1.4)` : undefined,
    }"
  >
    <img
      v-if="settings.blurredBackgroundEnabled && artwork"
      :src="artworkUrl(artwork)"
      alt=""
      class="pointer-events-none absolute inset-[-12%] size-[124%] object-cover opacity-25"
      :style="{ filter: `blur(${settings.backgroundBlur}px) saturate(1.3)` }"
    />
    <div class="relative z-[1] min-w-0"><slot /></div>
    <div v-if="progress !== null" class="pointer-events-none relative z-[1] mt-2 h-1 w-full shrink-0 overflow-hidden rounded-sm bg-white/15" aria-hidden="true">
      <i
        class="block h-full bg-[var(--accent)] transition-[width,background-color] duration-500 [transition-timing-function:ease] motion-reduce:transition-none"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>
