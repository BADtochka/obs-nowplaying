<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div class="card" :style="{ background: settings.backgroundColor, borderRadius: `${settings.borderRadius}px` }">
    <Artwork v-if="media.artwork" :src="media.artwork" class="artwork" />
    <div class="copy">
      <div :style="{ color: settings.primaryColor }">{{ media.title }}</div>
      <small :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</small>
    </div>
  </div>
</template>
<style scoped>
.card {
  width: 300px;
  min-height: 96px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  box-shadow: 0 12px 30px rgb(0 0 0 / 0.28);
}
.artwork {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
}
.copy {
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
}
.copy > div,
small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.copy small {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 500;
}
</style>
