<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import ColorField from '@/components/controls/ColorField.vue';
import type { Translate } from '@/core/i18n';
import type { WidgetSettings } from '@/media';

defineProps<{ settings: WidgetSettings; t: Translate }>();
</script>

<template>
  <section class="min-w-0 space-y-4">
    <div
      v-for="field in [
        ['backgroundColor', 'background'],
        ['primaryColor', 'primary'],
        ['secondaryColor', 'secondary'],
      ] as const"
      :key="field[0]"
      class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
    >
      <Label>{{ t(field[1]) }}</Label
      ><ColorField v-model="settings[field[0]]" :label="t(field[1])" :hex-label="t('hexColor')" />
    </div>
    <div class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
      <Label>{{ t('accentSource') }}</Label
      ><Select v-model="settings.accentMode"
        ><SelectTrigger><SelectValue /></SelectTrigger
        ><SelectContent
          ><SelectItem value="artwork">{{ t('fromArtwork') }}</SelectItem
          ><SelectItem value="custom">{{ t('custom') }}</SelectItem></SelectContent
        ></Select
      >
    </div>
    <div v-if="settings.accentMode === 'custom'" class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
      <Label>{{ t('customAccent') }}</Label
      ><ColorField v-model="settings.accentColor" :label="t('customAccent')" :hex-label="t('hexColor')" />
    </div>
    <div class="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
      <Label
        >{{ t('radius') }} <span class="text-muted-foreground">{{ settings.borderRadius }}px</span></Label
      ><Slider
        :model-value="[settings.borderRadius]"
        :min="0"
        :max="32"
        :step="1"
        @update:model-value="settings.borderRadius = $event?.[0] ?? 0"
      />
    </div>
    <div class="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
      <div>
        <Label>{{ t('cardPadding') }} <span class="text-muted-foreground">{{ settings.cardPadding }}px</span></Label>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ t('cardPaddingHint') }}</p>
      </div>
      <Slider :model-value="[settings.cardPadding]" :min="0" :max="32" :step="1" @update:model-value="settings.cardPadding = $event?.[0] ?? 0" />
    </div>
    <div class="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
      <div>
        <Label for="marquee">{{ t('marquee') }}</Label>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ t('marqueeHint') }}</p>
      </div>
      <Switch id="marquee" v-model="settings.marqueeEnabled" />
    </div>
  </section>
</template>
