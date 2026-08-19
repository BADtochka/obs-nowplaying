<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; accent: string | null }] }>();
</script>
<template>
  <div class="box-border flex h-[68px] w-[440px] max-w-full min-w-0 items-center gap-3">
    <Artwork v-if="media.artwork" :src="media.artwork" class="size-10 shrink-0 rounded object-cover" @accent="$emit('artwork-accent', $event)" />
    <span v-else class="h-9 w-[3px] shrink-0 rounded-[3px]" :style="{ background: settings.primaryColor }" />
    <div class="min-w-0 flex-1">
      <MarqueeText class="font-bold" :text="media.title" :enabled="settings.marqueeEnabled" :style="{ color: settings.primaryColor }" />
      <MarqueeText class="mt-[3px] text-xs" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" :style="{ color: settings.secondaryColor }" />
    </div>
  </div>
</template>
