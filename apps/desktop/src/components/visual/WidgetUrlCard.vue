<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Translate } from '@/core/i18n';

defineProps<{ url: string; copied: boolean; connected: boolean; t: Translate }>();
defineEmits<{ copy: [] }>();
</script>

<template>
  <Card>
    <CardHeader class="pb-3"
      ><CardTitle class="text-base">{{ t('url') }}</CardTitle></CardHeader
    >
    <CardContent>
      <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input :model-value="url" readonly class="min-w-0 font-mono text-xs" /><Button
          class="shrink-0"
          @click="$emit('copy')"
          ><Check v-if="copied" /><Copy v-else />{{ copied ? t('copied') : t('copy') }}</Button
        >
      </div>
      <p class="mt-3 text-xs leading-5 text-muted-foreground">
        {{ t('sourceHint') }}
        <span :class="connected ? 'text-emerald-500' : ''">{{ connected ? t('reachable') : t('checking') }}</span>
      </p>
    </CardContent>
  </Card>
</template>
