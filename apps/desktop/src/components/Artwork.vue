<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue';
import { extractArtworkAccent } from '../artwork-cache';

defineOptions({ inheritAttrs: false });
const props = defineProps<{ src: string }>();
const emit = defineEmits<{ accent: [resource: Awaited<ReturnType<typeof extractArtworkAccent>>] }>();
const attrs = useAttrs();
const loaded = ref(false);
const proxyFailed = ref(false);
const imageSrc = computed(() => {
  if (proxyFailed.value) return props.src;
  const url = new URL('/artwork', 'http://127.0.0.1:3030');
  url.searchParams.set('url', props.src);
  return url.toString();
});
watch(
  () => props.src,
  () => {
    loaded.value = false;
    proxyFailed.value = false;
  },
  { immediate: true },
);

function onLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  loaded.value = true;
  const src = image.getAttribute('data-artwork-src') ?? props.src;
  void extractArtworkAccent(src, image).then((resource) => emit('accent', resource));
}

function onError() {
  // The proxy may be rate-limited upstream. Keep a directly loadable cover visible;
  // canvas sampling will safely fail if that image does not grant CORS access.
  if (!proxyFailed.value) proxyFailed.value = true;
}
</script>

<template>
  <img
    :key="src"
    :crossorigin="proxyFailed ? undefined : 'anonymous'"
    :src="imageSrc"
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
    @error="onError"
  />
</template>
