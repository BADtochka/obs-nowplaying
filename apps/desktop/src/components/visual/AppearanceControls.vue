<script setup lang="ts">
import { Label } from '@/components/ui/label';
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
        ['backgroundColor', 'background', 'background'],
        ['primaryColor', 'primary', 'primary'],
        ['secondaryColor', 'secondary', 'secondary'],
        ['accentColor', 'accent', 'accent'],
      ] as const"
      :key="field[0]"
      class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
    >
      <Label>{{ t(field[1]) }}</Label
      ><ColorField
        v-model="settings[field[0]]"
        v-model:source="settings.colorSources[field[2]]"
        :label="t(field[1])"
        :hex-label="t('hexColor')"
        :custom-label="t('custom')"
        :artwork-label="t('fromArtwork')"
      />
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
    <div class="rounded-md border border-border p-3">
      <div class="flex items-center justify-between gap-4">
        <div><Label for="card-border">{{ t('cardBorder') }}</Label><p class="mt-0.5 text-xs text-muted-foreground">{{ t('cardBorderHint') }}</p></div>
        <Switch id="card-border" v-model="settings.borderEnabled" />
      </div>
      <div v-if="settings.borderEnabled" class="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
        <Label>{{ t('borderColor') }}</Label>
        <ColorField v-model="settings.borderColor" :allow-source="false" :label="t('borderColor')" :hex-label="t('hexColor')" :custom-label="t('custom')" :artwork-label="t('fromArtwork')" />
        <Label>{{ t('borderWidth') }} <span class="text-muted-foreground">{{ settings.borderWidth }}px</span></Label>
        <Slider :model-value="[settings.borderWidth]" :min="1" :max="8" :step="1" @update:model-value="settings.borderWidth = $event?.[0] ?? 1" />
      </div>
    </div>
    <div class="rounded-md border border-border p-3">
      <div class="flex items-center justify-between gap-4">
        <div><Label for="blurred-background">{{ t('blurredBackground') }}</Label><p class="mt-0.5 text-xs text-muted-foreground">{{ t('blurredBackgroundHint') }}</p></div>
        <Switch id="blurred-background" v-model="settings.blurredBackgroundEnabled" />
      </div>
      <div v-if="settings.blurredBackgroundEnabled" class="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
        <Label>{{ t('blurAmount') }} <span class="text-muted-foreground">{{ settings.backgroundBlur }}px</span></Label>
        <Slider :model-value="[settings.backgroundBlur]" :min="0" :max="40" :step="1" @update:model-value="settings.backgroundBlur = $event?.[0] ?? 0" />
        <Label>{{ t('backgroundOpacity') }} <span class="text-muted-foreground">{{ settings.backgroundOpacity }}%</span></Label>
        <Slider :model-value="[settings.backgroundOpacity]" :min="0" :max="100" :step="1" @update:model-value="settings.backgroundOpacity = $event?.[0] ?? 0" />
      </div>
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
