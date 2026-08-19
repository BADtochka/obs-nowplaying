<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ src: string }>();
const loaded = ref(false);
watch(
  () => props.src,
  () => {
    loaded.value = false;
  },
);
</script>

<template>
  <img :src="src" alt="" loading="lazy" decoding="async" :class="{ loaded }" @load="loaded = true" />
</template>

<style scoped>
img {
  opacity: 0;
  transition: opacity 0.35s ease;
}
img.loaded {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  img {
    transition: none;
  }
}
</style>
