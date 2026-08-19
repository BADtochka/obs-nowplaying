<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';

defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div
    class="layout-compact"
    :style="{ background: settings.backgroundColor, borderRadius: settings.borderRadius + 'px' }"
  >
    <Artwork v-if="media.artwork" :src="media.artwork" class="artwork" />
    <div class="info">
      <div class="title" :style="{ color: settings.primaryColor }">{{ media.title }}</div>
      <div class="artist" :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</div>
    </div>
  </div>
</template>
<style scoped>
.layout-compact {
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 12px;
}
.artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}
.title {
  font-weight: bold;
  font-size: 14px;
}
.artist {
  font-size: 12px;
}
</style>
