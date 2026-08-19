<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div
    class="cover-focus"
    :style="{ background: settings.backgroundColor, borderRadius: `${settings.borderRadius}px` }"
  >
    <Artwork v-if="media.artwork" :src="media.artwork" class="artwork" />
    <div v-else class="fallback" />
    <div class="overlay">
      <strong :style="{ color: settings.primaryColor }">{{ media.title }}</strong
      ><span :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</span>
    </div>
  </div>
</template>
<style scoped>
.cover-focus {
  position: relative;
  width: 260px;
  height: 260px;
  overflow: hidden;
}
.artwork,
.fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: linear-gradient(145deg, #303038, #101014);
}
.overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 4px;
  padding: 34px 16px 16px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.84));
}
.overlay strong,
.overlay span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overlay span {
  font-size: 12px;
}
</style>
