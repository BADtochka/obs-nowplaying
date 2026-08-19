<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { layoutRegistry } from './layouts';
import type { AnimationSetting, MediaState, WidgetSettings } from '../media';

const props = defineProps<{ media: MediaState | null; layout: string; settings: WidgetSettings }>();
const currentLayout = computed(() => {
  return layoutRegistry[props.layout] ?? layoutRegistry.compact;
});
const accentCache = new Map<string, string>();
const artworkAccent = ref(props.settings.accentColor);
const now = ref(Date.now());
let animationFrame = 0;
function updateClock() {
  now.value = Date.now();
  animationFrame = window.requestAnimationFrame(updateClock);
}
updateClock();
const renderedMedia = ref<MediaState | null>(props.media);
const visible = ref(Boolean(props.media));
const progressAnchor = ref<{
  trackKey: string;
  position: number;
  updatedAt: number;
  duration: number;
  isPlaying: boolean;
} | null>(null);
const animation = ref<AnimationSetting>(props.settings.animations.show);
const playbackPulse = ref(false);
let playbackTimer: number | undefined;
const accent = computed(() =>
  props.settings.accentMode === 'artwork' ? artworkAccent.value : props.settings.accentColor,
);
const progress = computed(() => {
  const anchor = progressAnchor.value;
  if (!anchor || anchor.duration <= 0) return null;
  const position = anchor.position + (anchor.isPlaying ? (now.value - anchor.updatedAt) / 1_000 : 0);
  return Math.min(100, Math.max(0, (position / anchor.duration) * 100));
});

const transitionName = computed(() => `motion-${animation.value.preset}`);
const transitionStyle = computed(() => ({
  '--motion-duration': `${animation.value.duration}ms`,
  '--motion-easing': animation.value.easing,
}));
const customStyle = computed(() => {
  const style: Record<string, string> = {};
  for (const declaration of props.settings.customCss.split(';')) {
    const [property, ...values] = declaration.split(':');
    const value = values.join(':').trim();
    if (
      /^(--[a-z0-9-]+|[a-z-]+)$/i.test(property?.trim() ?? '') &&
      value &&
      !/[<>{}]|url\s*\(|expression\s*\(|@import/i.test(value)
    )
      style[property.trim()] = value;
  }
  return style;
});

function trackKey(media: MediaState | null) {
  return media ? media.trackId || `${media.title}:${media.artists.join(',')}` : '';
}
function syncProgress(next: MediaState | null, previous: MediaState | null) {
  if (!next || !next.duration || next.duration <= 0 || next.position == null || !Number.isFinite(next.position)) {
    progressAnchor.value = null;
    return;
  }
  const key = trackKey(next);
  const incomingPosition = Math.min(next.duration, Math.max(0, next.position));
  const incomingUpdatedAt = next.timestamps?.updatedAt;
  const timestamp = incomingUpdatedAt && Number.isFinite(incomingUpdatedAt) ? incomingUpdatedAt : Date.now();
  const current = progressAnchor.value;
  const projected = current && current.isPlaying ? current.position + (Date.now() - current.updatedAt) / 1_000 : current?.position;
  const sameTrack = current?.trackKey === key && trackKey(previous) === key;
  const drift = projected == null ? Number.POSITIVE_INFINITY : incomingPosition - projected;
  const seekDetected = !sameTrack || Math.abs(drift) > 2 || current?.duration !== next.duration;

  if (seekDetected || !next.isPlaying || projected == null) {
    progressAnchor.value = { trackKey: key, position: incomingPosition, updatedAt: timestamp, duration: next.duration, isPlaying: next.isPlaying };
  } else {
    progressAnchor.value = { ...current, isPlaying: true };
  }
}
function afterLeave() {
  if (!visible.value) renderedMedia.value = null;
}

watch(
  () => props.media,
  (next, previous) => {
    syncProgress(next, previous ?? null);
    const nextKey = trackKey(next);
    const previousKey = trackKey(previous ?? null);
    if (!next) {
      animation.value = props.settings.animations.hide;
      visible.value = false;
      return;
    }
    renderedMedia.value = next;
    if (!previous) {
      animation.value = props.settings.animations.show;
      visible.value = true;
      return;
    }
    if (nextKey !== previousKey) animation.value = props.settings.animations.change;
    if (next.isPlaying !== previous.isPlaying) {
      animation.value = props.settings.animations.playback;
      playbackPulse.value = false;
      window.clearTimeout(playbackTimer);
      requestAnimationFrame(() => {
        playbackPulse.value = true;
      });
      playbackTimer = window.setTimeout(() => {
        playbackPulse.value = false;
      }, animation.value.duration);
    }
  },
  { immediate: true },
);

watch(
  () => [props.media?.artwork, props.settings.accentMode, props.settings.accentColor] as const,
  ([url, mode, fallback], _, onCleanup) => {
    if (mode !== 'artwork' || !url) {
      artworkAccent.value = fallback;
      return;
    }
    const cached = accentCache.get(url);
    if (cached) {
      artworkAccent.value = cached;
      return;
    }
    const image = new Image();
    let active = true;
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, 24, 24);
        const data = context.getImageData(0, 0, 24, 24).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let weight = 0;
        for (let index = 0; index < data.length; index += 16) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 510;
          const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
          if (lightness < 0.12 || lightness > 0.88 || saturation < 0.15) continue;
          const pixelWeight = 0.25 + saturation;
          red += r * pixelWeight;
          green += g * pixelWeight;
          blue += b * pixelWeight;
          weight += pixelWeight;
        }
        if (!weight) return;
        const color = `rgb(${Math.round(red / weight)} ${Math.round(green / weight)} ${Math.round(blue / weight)})`;
        accentCache.set(url, color);
        artworkAccent.value = color;
      } catch {
        artworkAccent.value = fallback;
      }
    };
    image.onerror = () => {
      if (active) artworkAccent.value = fallback;
    };
    image.src = url;
    onCleanup(() => {
      active = false;
    });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame);
  window.clearTimeout(playbackTimer);
});
</script>
<template>
  <div
    class="widget-frame"
    :class="{ 'playback-pulse': playbackPulse }"
    :style="[{ '--accent': accent }, customStyle, transitionStyle]"
  >
    <Transition :name="transitionName" mode="out-in" :duration="animation.duration" @after-leave="afterLeave">
      <component
        v-if="visible && renderedMedia"
        :is="currentLayout"
        :key="trackKey(renderedMedia)"
        :media="renderedMedia"
        :settings="settings"
      />
    </Transition>
    <div v-if="progress !== null" class="progress" aria-hidden="true"><i :style="{ width: `${progress}%` }" /></div>
  </div>
</template>

<style scoped>
.widget-frame {
  position: relative;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 18%, transparent));
  transition: filter 0.5s ease;
}
.progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 2px;
  background: rgb(255 255 255 / 0.15);
}
.progress i {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: background-color 0.5s ease;
}
.motion-fade-enter-active,
.motion-fade-leave-active,
.motion-slide-enter-active,
.motion-slide-leave-active,
.motion-scale-enter-active,
.motion-scale-leave-active,
.motion-blur-enter-active,
.motion-blur-leave-active {
  transition:
    opacity var(--motion-duration) var(--motion-easing),
    transform var(--motion-duration) var(--motion-easing),
    filter var(--motion-duration) var(--motion-easing);
}
.motion-fade-enter-from,
.motion-fade-leave-to {
  opacity: 0;
}
.motion-slide-enter-from {
  opacity: 0;
  transform: translateX(18px);
}
.motion-slide-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}
.motion-scale-enter-from,
.motion-scale-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
.motion-blur-enter-from,
.motion-blur-leave-to {
  opacity: 0;
  filter: blur(8px);
}
.motion-none-enter-active,
.motion-none-leave-active {
  transition: none;
}
.playback-pulse {
  animation: playback-pulse var(--motion-duration) var(--motion-easing);
}
@keyframes playback-pulse {
  50% {
    transform: scale(1.018);
    filter: brightness(1.14);
  }
}
@media (prefers-reduced-motion: reduce) {
  .widget-frame,
  .progress i,
  [class*='motion-'],
  .playback-pulse {
    transition: none !important;
    animation: none !important;
  }
}
</style>
