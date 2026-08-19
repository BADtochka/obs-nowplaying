<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';

defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; palette: import('@/artwork-cache').ArtworkPalette | null }] }>();
</script>
<template>
  <div class="box-border flex h-[72px] w-[300px] max-w-full items-center gap-3">
    <Artwork v-if="media.artwork" :src="media.artwork" class="size-12 shrink-0 rounded object-cover" @accent="$emit('artwork-accent', $event)" />
    <div class="min-w-0">
      <MarqueeText class="text-sm font-bold text-[var(--primary)]" :text="media.title" :enabled="settings.marqueeEnabled" />
      <MarqueeText class="text-xs text-[var(--secondary)]" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" />
    </div>
  </div>
</template>
