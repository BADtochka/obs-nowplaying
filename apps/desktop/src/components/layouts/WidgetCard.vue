<script setup lang="ts">
import type { WidgetSettings } from '@/media';

defineProps<{ settings: WidgetSettings; progress: number | null }>();
</script>

<template>
  <div
    class="flex max-w-full flex-col overflow-hidden p-[var(--card-padding)]"
    :style="{ '--card-padding': `${settings.cardPadding}px`, background: settings.backgroundColor, borderRadius: `${settings.borderRadius}px` }"
  >
    <div class="min-w-0"><slot /></div>
    <div v-if="progress !== null" class="pointer-events-none mt-2 h-1 w-full shrink-0 overflow-hidden rounded-sm bg-white/15" aria-hidden="true">
      <i
        class="block h-full bg-[var(--accent)] transition-[width,background-color] duration-500 [transition-timing-function:ease] motion-reduce:transition-none"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>
