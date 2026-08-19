<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; accent: string | null }] }>();
</script>
<template>
  <div class="box-border flex min-h-24 w-[300px] max-w-full items-center gap-3.5">
    <Artwork v-if="media.artwork" :src="media.artwork" class="size-16 shrink-0 rounded-md object-cover" @accent="$emit('artwork-accent', $event)" />
    <div class="min-w-0 text-base font-bold">
      <MarqueeText :text="media.title" :enabled="settings.marqueeEnabled" :style="{ color: settings.primaryColor }" />
      <MarqueeText class="mt-[5px] text-xs font-medium" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" :style="{ color: settings.secondaryColor }" />
    </div>
  </div>
</template>
