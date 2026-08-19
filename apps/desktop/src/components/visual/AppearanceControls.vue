<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import ColorField from '@/components/controls/ColorField.vue';
import type { Translate } from '@/app/i18n';
import type { WidgetSettings } from '@/media';

defineProps<{ settings: WidgetSettings; t: Translate }>();
</script>

<template>
  <section class="min-w-0 space-y-4">
    <h3 class="font-medium">{{ t('appearance') }}</h3>
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
  </section>
</template>
