<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Widget from '@/components/Widget.vue';
import { parseWidgetUrl } from '@/core/widget-url';
import type { MediaState } from '@/media';

const { layout, settings } = parseWidgetUrl(window.location.search);
const media = ref<MediaState | null>(null);
let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
let disposed = false;

function connect() {
  socket = new WebSocket('ws://127.0.0.1:3030/ws');
  socket.onmessage = (event) => {
    try {
      const update = JSON.parse(event.data) as MediaState | null;
      media.value = update && typeof update.title === 'string' && Array.isArray(update.artists) ? update : null;
    } catch {
      media.value = null;
    }
  };
  socket.onclose = () => {
    if (!disposed) reconnectTimer = window.setTimeout(connect, 2_000);
  };
  socket.onerror = () => socket?.close();
}

onMounted(connect);
onBeforeUnmount(() => {
  disposed = true;
  window.clearTimeout(reconnectTimer);
  socket?.close();
});
</script>

<template>
  <main class="box-border flex min-h-full w-full min-w-0 overflow-hidden bg-transparent">
    <Widget :media="media" :layout="layout" :settings="settings" />
  </main>
</template>
