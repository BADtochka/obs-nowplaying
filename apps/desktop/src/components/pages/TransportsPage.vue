<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Translate } from '@/core/i18n';
import { extensionProviders, type Diagnostics, type ExtensionProvider, type TransportConfig } from '@/core/types';

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
const providerLabel = (provider: ExtensionProvider) => props.t(provider);
const providerEnabled = (provider: ExtensionProvider) => props.transports.browserExtensionProviders.includes(provider);
function setProviderEnabled(provider: ExtensionProvider, enabled: boolean) {
  props.transports.browserExtensionProviders = enabled
    ? [...new Set([...props.transports.browserExtensionProviders, provider])]
    : props.transports.browserExtensionProviders.filter((item) => item !== provider);
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
    <Card class="mt-4">
      <CardContent class="space-y-4 pt-6">
        <div>
          <h3 class="font-medium">{{ t('extensionProviders') }}</h3>
          <p class="mt-1 text-xs text-muted-foreground">{{ t('extensionProvidersHint') }}</p>
        </div>
        <div class="max-w-xs space-y-2">
          <Label>{{ t('selectedProvider') }}</Label>
          <Select v-model="transports.browserExtensionProvider" :disabled="!transports.browserExtensionEnabled">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{{ t('auto') }}</SelectItem>
              <SelectItem v-for="provider in extensionProviders" :key="provider" :value="provider" :disabled="!providerEnabled(provider)">{{ providerLabel(provider) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="provider in extensionProviders" :key="provider" class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            {{ providerLabel(provider) }}
            <Switch :model-value="providerEnabled(provider)" :disabled="!transports.browserExtensionEnabled" @update:model-value="setProviderEnabled(provider, $event)" />
          </label>
        </div>
        <p v-if="!transports.browserExtensionEnabled" class="text-xs text-muted-foreground">{{ t('providerDisabled') }}</p>
      </CardContent>
    </Card>
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
