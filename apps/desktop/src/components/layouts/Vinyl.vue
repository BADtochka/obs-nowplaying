<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
import MarqueeText from '../MarqueeText.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
defineEmits<{ 'artwork-accent': [resource: { src: string; accent: string | null }] }>();
</script>
<template>
  <div class="box-border flex h-[88px] w-[320px] max-w-full items-center gap-3.5">
    <div
      class="relative size-16 shrink-0 overflow-hidden rounded-full border-[5px] border-[#080808] bg-[repeating-radial-gradient(#202024_0_2px,#111_3px_5px)]"
      :class="{ 'animate-[spin_4s_linear_infinite] motion-reduce:animate-none': media.isPlaying }"
    >
      <Artwork v-if="media.artwork" :src="media.artwork" class="block size-full object-cover" @accent="$emit('artwork-accent', $event)" />
      <div v-else class="size-full bg-[linear-gradient(145deg,#303038,#101014)]" />
      <div
        class="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle_at_center,rgb(255_255_255_/_0.04)_0_2px,rgb(0_0_0_/_0.28)_3px_5px,transparent_6px_9px),radial-gradient(circle_at_center,transparent_0_12%,rgb(0_0_0_/_0.48)_12.5%_13%,transparent_13.5%_100%)] shadow-[inset_0_0_0_10px_rgb(0_0_0_/_0.16)] mix-blend-overlay opacity-90"
        aria-hidden="true"
      >
        <div class="absolute left-1/2 top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] bg-[#111] shadow-[0_0_0_5px_rgb(0_0_0_/_0.22)]" />
      </div>
    </div>
    <div class="min-w-0 flex-1">
      <MarqueeText class="font-bold" :text="media.title" :enabled="settings.marqueeEnabled" :style="{ color: settings.primaryColor }" />
      <MarqueeText class="mt-1 text-xs" :text="media.artists.join(', ')" :enabled="settings.marqueeEnabled" :style="{ color: settings.secondaryColor }" />
    </div>
  </div>
</template>
