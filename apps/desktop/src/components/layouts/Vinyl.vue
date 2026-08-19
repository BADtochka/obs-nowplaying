<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';
import Artwork from '../Artwork.vue';
defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div class="vinyl" :style="{ background: settings.backgroundColor, borderRadius: `${settings.borderRadius}px` }">
    <div class="record" :class="{ spin: media.isPlaying }">
      <Artwork v-if="media.artwork" :src="media.artwork" class="cover" />
      <div v-else class="cover fallback" />
      <div class="grooves" aria-hidden="true" />
    </div>
    <div class="copy">
      <b :style="{ color: settings.primaryColor }">{{ media.title }}</b
      ><span :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</span>
    </div>
  </div>
</template>
<style scoped>
.vinyl {
  display: flex;
  align-items: center;
  width: min(320px, 100%);
  gap: 14px;
  box-sizing: border-box;
  padding: 12px;
}
.record {
  position: relative;
  flex: none;
  width: 64px;
  height: 64px;
  box-sizing: border-box;
  overflow: hidden;
  border: 5px solid #080808;
  border-radius: 50%;
  background: repeating-radial-gradient(#202024 0 2px, #111 3px 5px);
}
.record :deep(.cover) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fallback {
  background: linear-gradient(145deg, #303038, #101014);
}
.grooves {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    repeating-radial-gradient(
      circle at center,
      rgb(255 255 255 / 0.04) 0 2px,
      rgb(0 0 0 / 0.28) 3px 5px,
      transparent 6px 9px
    ),
    radial-gradient(circle at center, transparent 0 12%, rgb(0 0 0 / 0.48) 12.5% 13%, transparent 13.5% 100%);
  box-shadow: inset 0 0 0 10px rgb(0 0 0 / 0.16);
  mix-blend-mode: overlay;
  opacity: 0.9;
}
.grooves::after {
  position: absolute;
  inset: 50%;
  width: 7px;
  height: 7px;
  transform: translate(-50%, -50%);
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: #111;
  box-shadow: 0 0 0 5px rgb(0 0 0 / 0.22);
  content: '';
}
.spin {
  animation: rotation 4s linear infinite;
}
.copy {
  flex: 1;
  min-width: 0;
}
.vinyl b,
.vinyl span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vinyl span {
  margin-top: 4px;
  font-size: 12px;
}
@keyframes rotation {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
