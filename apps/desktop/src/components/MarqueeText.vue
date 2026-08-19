<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ text: string; enabled: boolean }>();
const viewport = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const overflowing = ref(false);
const reducedMotion = ref(false);
const distance = ref(0);
let resizeObserver: ResizeObserver | undefined;
let motionQuery: MediaQueryList | undefined;

const active = computed(() => props.enabled && overflowing.value && !reducedMotion.value);
const marqueeStyle = computed(() => ({
  '--marquee-distance': `${distance.value}px`,
  '--marquee-duration': `${Math.max(6, distance.value / 28).toFixed(2)}s`,
}));

function measure() {
  if (!viewport.value || !content.value) return;
  distance.value = Math.max(0, content.value.scrollWidth - viewport.value.clientWidth);
  overflowing.value = distance.value > 1;
}
function syncMotionPreference(event?: MediaQueryListEvent) {
  reducedMotion.value = event?.matches ?? motionQuery?.matches ?? false;
}

onMounted(() => {
  resizeObserver = new ResizeObserver(measure);
  if (viewport.value) resizeObserver.observe(viewport.value);
  if (content.value) resizeObserver.observe(content.value);
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  syncMotionPreference();
  motionQuery.addEventListener('change', syncMotionPreference);
  measure();
});
watch(() => props.text, () => void nextTick(measure));
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  motionQuery?.removeEventListener('change', syncMotionPreference);
});
</script>

<template>
  <span ref="viewport" class="block min-w-0 overflow-hidden whitespace-nowrap" :title="active ? text : undefined">
    <span
      ref="content"
      class="inline-block min-w-full"
      :class="active ? 'animate-marquee hover:[animation-play-state:paused]' : 'truncate'"
      :style="active ? marqueeStyle : undefined"
    >{{ text }}</span>
  </span>
</template>
