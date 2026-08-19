<script setup lang="ts">
import { ref, useAttrs, watch } from 'vue';
import { extractArtworkAccent } from '../artwork-cache';

defineOptions({ inheritAttrs: false });
const props = defineProps<{ src: string }>();
const emit = defineEmits<{ accent: [resource: { src: string; accent: string | null }] }>();
const attrs = useAttrs();
const loaded = ref(false);
const imageSrc = () => {
  const url = new URL('/artwork', 'http://127.0.0.1:3030');
  url.searchParams.set('url', props.src);
  return url.toString();
};
watch(
  () => props.src,
  () => {
    loaded.value = false;
  },
  { immediate: true },
);

function onLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  loaded.value = true;
  const src = image.getAttribute('data-artwork-src') ?? props.src;
  void extractArtworkAccent(src, image).then((resource) => emit('accent', resource));
}
</script>

<template>
  <img
    :key="src"
    crossorigin="anonymous"
    :src="imageSrc()"
    :data-artwork-src="src"
    alt=""
    loading="eager"
    decoding="async"
    :class="[
      'opacity-0 transition-opacity [transition-duration:350ms] [transition-timing-function:ease] motion-reduce:transition-none',
      { 'opacity-100': loaded },
    ]"
    v-bind="attrs"
    @load="onLoad"
  />
</template>
