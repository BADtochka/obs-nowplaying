<script setup lang="ts">
import type { DialogTitleProps } from 'reka-ui';
import { DialogTitle } from 'reka-ui';

defineProps<DialogTitleProps>();
</script>

<template>
  <DialogTitle v-bind="$props" class="text-lg font-semibold leading-none tracking-tight"><slot /></DialogTitle>
</template>
