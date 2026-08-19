<script setup lang="ts">
import type { MediaState, WidgetSettings } from '@/media';

defineProps<{ media: MediaState; settings: WidgetSettings }>();
</script>
<template>
  <div
    class="layout-minimal"
    :style="{ background: settings.backgroundColor, borderRadius: settings.borderRadius + 'px' }"
  >
    <div class="title" :style="{ color: settings.primaryColor }">{{ media.title }}</div>
    <div class="artist" :style="{ color: settings.secondaryColor }">{{ media.artists.join(', ') }}</div>
  </div>
</template>
<style scoped>
.layout-minimal {
  padding: 10px 14px;
}
.title {
  font-weight: bold;
}
</style>
