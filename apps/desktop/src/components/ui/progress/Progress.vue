<script setup lang="ts">
import type { ProgressRootProps } from 'reka-ui';
import { ProgressIndicator, ProgressRoot } from 'reka-ui';

const props = withDefaults(defineProps<ProgressRootProps>(), { max: 100 });
</script>

<template>
  <ProgressRoot v-bind="props" class="relative h-2 w-full overflow-hidden rounded-full bg-secondary data-[state=indeterminate]:animate-pulse">
    <ProgressIndicator
      class="h-full w-full flex-1 bg-primary transition-transform duration-300"
      :style="{ transform: `translateX(-${props.modelValue === null ? 0 : 100 - (props.modelValue ?? 0)}%)` }"
    />
  </ProgressRoot>
</template>
