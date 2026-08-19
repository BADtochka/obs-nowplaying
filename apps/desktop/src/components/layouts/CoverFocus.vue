<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; accent: string | null }] }>();
</script>
<template>
  <div class="relative aspect-square w-[260px] max-w-full">
    <Artwork v-if="media.artwork" :src="media.artwork" class="size-full object-cover" @accent="$emit('artwork-accent', $event)" />
    <div v-else class="size-full bg-[linear-gradient(145deg,#303038,#101014)]" />
    <div class="absolute inset-x-0 bottom-0 grid gap-1 bg-[linear-gradient(transparent,rgb(0_0_0_/_0.84))] px-4 pb-4 pt-[34px]">
      <MarqueeText class="font-bold" :text="media.title" :enabled="settings.marqueeEnabled" :style="{ color: settings.primaryColor }" />
      <MarqueeText class="text-xs" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" :style="{ color: settings.secondaryColor }" />
    </div>
  </div>
</template>
