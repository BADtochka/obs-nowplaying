<script setup lang="ts">
import type { DialogDescriptionProps } from 'reka-ui';
import { DialogDescription } from 'reka-ui';

defineProps<DialogDescriptionProps>();
</script>

<template>
  <DialogDescription v-bind="$props" class="text-sm text-muted-foreground"><slot /></DialogDescription>
</template>
