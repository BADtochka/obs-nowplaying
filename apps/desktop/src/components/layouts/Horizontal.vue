<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div class="horizontal" :style="{ background: settings.backgroundColor, borderRadius: `${settings.borderRadius}px` }">
    <Artwork v-if="media.artwork" :src="media.artwork" class="artwork" />
    <span v-else class="playing" :style="{ background: settings.primaryColor }" />
    <div>
      <b :style="{ color: settings.primaryColor }">{{ media.title }}</b
      ><span :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</span>
    </div>
    <em :style="{ color: settings.secondaryColor }">{{ media.isPlaying ? 'LIVE' : 'PAUSED' }}</em>
  </div>
</template>
<style scoped>
.horizontal {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: min(440px, 100%);
  min-width: 0;
  gap: 12px;
  padding: 12px 16px;
}
.artwork,
.playing {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 4px;
}
.artwork {
  object-fit: cover;
}
.playing {
  width: 3px;
  height: 36px;
  border-radius: 3px;
}
.horizontal > div {
  min-width: 0;
  flex: 1;
}
.horizontal b,
.horizontal > div span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.horizontal > div span {
  margin-top: 3px;
  font-size: 12px;
}
.horizontal em {
  flex: none;
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.1em;
}
</style>
