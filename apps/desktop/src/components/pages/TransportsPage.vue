<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Translate } from '@/core/i18n';
import type { Diagnostics, TransportConfig } from '@/core/types';

const props = defineProps<{
  transports: TransportConfig;
  diagnostics: Diagnostics | null;
  locale: string;
  t: Translate;
}>();
function dateTime(value: number | null) {
  return value
    ? new Intl.DateTimeFormat(props.locale, { dateStyle: 'short', timeStyle: 'medium' }).format(value)
    : props.t('noUpdate');
}
</script>

<template>
  <section class="max-w-5xl py-6">
    <p class="max-w-2xl text-sm leading-6 text-muted-foreground">{{ t('choose') }}</p>
    <div class="mt-5 max-w-xs space-y-2">
      <Label>{{ t('selection') }}</Label>
      <Select v-model="transports.mode">
        <SelectTrigger :aria-label="t('selection')"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">{{ t('auto') }}</SelectItem
          ><SelectItem value="browserExtension">{{ t('extension') }}</SelectItem
          ><SelectItem value="nativeMedia">{{ t('native') }}</SelectItem
          ><SelectItem value="mock" :disabled="!diagnostics?.transports.some((item) => item.id === 'mock')">{{
            t('mock')
          }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div v-if="diagnostics" class="mt-7 grid gap-3">
      <Card v-for="transport in diagnostics.transports.filter((item) => item.id !== 'mock')" :key="transport.id">
        <CardContent class="grid gap-4 pt-6 sm:grid-cols-[minmax(0,1fr)_auto_6rem_9rem] sm:items-center">
          <div>
            <h3 class="font-medium">{{ transport.id === 'native_media' ? t('native') : t('extension') }}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{{ transport.message }}</p>
          </div>
          <Switch
            v-if="transport.id === 'native_media'"
            v-model="transports.nativeMediaEnabled"
            :aria-label="`${t('enable')} ${t('native')}`"
          />
          <Switch
            v-else
            v-model="transports.browserExtensionEnabled"
            :aria-label="`${t('enable')} ${t('extension')}`"
          />
          <label class="grid gap-1 text-xs text-muted-foreground"
            >{{ t('priority')
            }}<Input
              v-if="transport.id === 'native_media'"
              v-model.number="transports.nativeMediaPriority"
              type="number"
              min="-100"
              max="100" /><Input
              v-else
              v-model.number="transports.browserExtensionPriority"
              type="number"
              min="-100"
              max="100"
          /></label>
          <div class="sm:text-right">
            <Badge :variant="transport.status === 'connected' ? 'default' : 'secondary'">{{ transport.status }}</Badge>
            <p class="mt-1 text-[10px] text-muted-foreground">{{ dateTime(transport.lastUpdatedAt) }}</p>
          </div>
        </CardContent>
      </Card>
    </div>
    <Card v-else class="mt-7"
      ><CardContent class="pt-6"
        ><strong>{{ t('unavailable') }}</strong>
        <p class="mt-2 text-sm text-muted-foreground">{{ t('unavailableText') }}</p></CardContent
      ></Card
    >
  </section>
</template>
