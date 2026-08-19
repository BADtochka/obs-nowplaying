<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

defineProps<{ eyebrow: string; title: string; refreshLabel: string }>();
defineEmits<{ refresh: [] }>();
</script>

<template>
  <header class="flex items-end justify-between gap-4 border-b border-border pb-5">
    <div>
      <p class="mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-primary">{{ eyebrow }}</p>
      <h2 class="text-2xl font-semibold tracking-tight">{{ title }}</h2>
    </div>
    <Button variant="outline" size="sm" @click="$emit('refresh')"
      ><RefreshCw /> <span class="hidden sm:inline">{{ refreshLabel }}</span></Button
    >
  </header>
</template>
