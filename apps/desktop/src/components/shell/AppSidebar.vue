<script setup lang="ts">
import { Home, Palette, Radio } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Locale, Section } from '@/core/types';
import type { Translate } from '@/core/i18n';

defineProps<{ connected: boolean; t: Translate }>();
const section = defineModel<Section>('section', { required: true });
const locale = defineModel<Locale>('locale', { required: true });
const sections = [
  { id: 'now' as const, label: 'now' as const, icon: Home },
  { id: 'transports' as const, label: 'transports' as const, icon: Radio },
  { id: 'visual' as const, label: 'visual' as const, icon: Palette },
];
</script>

<template>
  <aside
    class="flex min-h-0 flex-col items-center overflow-y-auto border-r border-border bg-card px-2 py-4 md:items-stretch md:px-3 md:py-5"
  >
    <div class="mb-6 flex items-center gap-2 px-1 md:px-2">
      <span
        class="grid size-8 shrink-0 place-items-center rounded-sm border border-primary font-mono text-[10px] font-bold text-primary"
        >OP</span
      >
      <div class="hidden min-w-0 md:block">
        <h1 class="truncate text-sm font-semibold">OBS Playing</h1>
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="size-1.5 rounded-full" :class="connected ? 'bg-emerald-500' : 'bg-destructive'" />
          {{ connected ? t('connectedShort') : t('reconnectingShort') }}
        </p>
      </div>
    </div>
    <nav class="grid w-full gap-1" :aria-label="t('configuration')">
      <Button
        v-for="item in sections"
        :key="item.id"
        :variant="section === item.id ? 'secondary' : 'ghost'"
        :size="'default'"
        class="w-full px-0 md:justify-start md:px-3"
        :title="t(item.label)"
        :aria-label="t(item.label)"
        @click="section = item.id"
      >
        <component :is="item.icon" aria-hidden="true" />
        <span class="hidden md:inline">{{ t(item.label) }}</span>
      </Button>
    </nav>
    <div class="mt-auto w-full pt-6 md:px-2">
      <label class="mb-1 hidden text-xs text-muted-foreground md:block">{{ t('language') }}</label>
      <Select v-model="locale">
        <SelectTrigger class="h-9 w-full px-2" :aria-label="t('language')"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="en">EN</SelectItem><SelectItem value="ru">RU</SelectItem></SelectContent>
      </Select>
    </div>
  </aside>
</template>
