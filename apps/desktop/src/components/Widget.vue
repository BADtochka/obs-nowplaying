<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { layoutRegistry } from './layouts';
import WidgetCard from './layouts/WidgetCard.vue';
import type { AnimationSetting, MediaState, WidgetSettings } from '../media';
import type { ArtworkPalette, ArtworkResource } from '../artwork-cache';

const props = defineProps<{ media: MediaState | null; layout: string; settings: WidgetSettings }>();
const currentLayout = computed(() => {
  return layoutRegistry[props.layout] ?? layoutRegistry.compact;
});
const artworkPalette = ref<ArtworkPalette | null>(null);
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
const customColors = computed(() => ({
  background: props.settings.backgroundColor,
  primary: props.settings.primaryColor,
  secondary: props.settings.secondaryColor,
  accent: props.settings.accentColor,
}));
const colors = computed(() => Object.fromEntries(
  (['background', 'primary', 'secondary', 'accent'] as const).map((role) => [
    role,
    props.settings.colorSources[role] === 'artwork'
      ? artworkPalette.value?.[role] ?? customColors.value[role]
      : customColors.value[role],
  ]),
) as typeof customColors.value);
const progress = computed(() => {
  const anchor = progressAnchor.value;
  if (!anchor || anchor.duration <= 0) return null;
  const position = anchor.position + (anchor.isPlaying ? (now.value - anchor.updatedAt) / 1_000 : 0);
  return Math.min(100, Math.max(0, (position / anchor.duration) * 100));
});

const transitionStyle = computed(() => ({
  '--motion-duration': `${animation.value.duration}ms`,
  '--motion-easing': animation.value.easing,
}));
const transitionClasses = computed(() => {
  const active =
    'transition-[opacity,transform,filter] [transition-duration:var(--motion-duration)] [transition-timing-function:var(--motion-easing)] motion-reduce:transition-none';
  switch (animation.value.preset) {
    case 'slide':
      return { active, enterFrom: 'opacity-0 translate-x-[18px]', leaveTo: 'opacity-0 -translate-x-[18px]' };
    case 'scale':
      return { active, enterFrom: 'opacity-0 scale-[0.92]', leaveTo: 'opacity-0 scale-[0.92]' };
    case 'blur':
      return { active, enterFrom: 'opacity-0 blur-[8px]', leaveTo: 'opacity-0 blur-[8px]' };
    case 'none':
      return { active: 'transition-none', enterFrom: '', leaveTo: '' };
    default:
      return { active, enterFrom: 'opacity-0', leaveTo: 'opacity-0' };
  }
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

function applyArtworkAccent(resource: ArtworkResource) {
  if (props.media?.artwork !== resource.src) return;
  artworkPalette.value = resource.palette;
}

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame);
  window.clearTimeout(playbackTimer);
});
</script>
<template>
  <div
    class="relative inline-flex max-w-full min-w-0 flex-col transition-[filter] duration-500 [transition-timing-function:ease] motion-reduce:transition-none"
    :class="{
      'animate-playback-pulse [animation-duration:var(--motion-duration)] [animation-timing-function:var(--motion-easing)] motion-reduce:animate-none': playbackPulse,
    }"
    :style="[{ '--background': colors.background, '--primary': colors.primary, '--secondary': colors.secondary, '--accent': colors.accent }, transitionStyle]"
  >
    <Transition
      :enter-active-class="transitionClasses.active"
      :leave-active-class="transitionClasses.active"
      :enter-from-class="transitionClasses.enterFrom"
      :leave-to-class="transitionClasses.leaveTo"
      mode="out-in"
      :duration="animation.duration"
      @after-leave="afterLeave"
    >
      <WidgetCard
        v-if="visible && renderedMedia"
        :key="trackKey(renderedMedia)"
        :settings="settings"
        :progress="progress"
        :artwork="renderedMedia.artwork"
      >
        <component :is="currentLayout.component" :media="renderedMedia" :settings="settings" @artwork-accent="applyArtworkAccent" />
      </WidgetCard>
    </Transition>
  </div>
</template>
