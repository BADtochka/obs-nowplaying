<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';

defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; palette: import('@/artwork-cache').ArtworkPalette | null }] }>();
</script>
<template>
  <div class="relative box-border grid h-16 w-[320px] max-w-full content-center">
    <Artwork v-if="media.artwork" :src="media.artwork" class="pointer-events-none absolute size-px opacity-0" @accent="$emit('artwork-accent', $event)" />
    <MarqueeText class="text-sm font-bold leading-5 text-[var(--primary)]" :text="media.title" :enabled="settings.marqueeEnabled" />
    <MarqueeText class="text-xs leading-4 text-[var(--secondary)]" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" />
  </div>
</template>
