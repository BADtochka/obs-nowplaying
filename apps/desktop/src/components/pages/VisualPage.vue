<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Widget from '@/components/Widget.vue';
import { layoutOptions } from '@/components/layouts';
import AppearanceControls from '@/components/visual/AppearanceControls.vue';
import AnimationControls from '@/components/visual/AnimationControls.vue';
import WidgetUrlCard from '@/components/visual/WidgetUrlCard.vue';
import { layoutLabels, type Translate } from '@/app/i18n';
import type { Locale } from '@/app/types';
import type { MediaState, WidgetSettings } from '@/media';

const props = defineProps<{
  locale: Locale;
  settings: WidgetSettings;
  media: MediaState;
  widgetUrl: string;
  connected: boolean;
  copied: boolean;
  cssTooLong: boolean;
  t: Translate;
}>();
const layout = defineModel<string>('layout', { required: true });
defineEmits<{ copy: []; reset: [] }>();
function layoutName(id: string) {
  return layoutLabels[props.locale][id as keyof typeof layoutLabels.en]?.[0] ?? id;
}
function layoutDescription(id: string) {
  return layoutLabels[props.locale][id as keyof typeof layoutLabels.en]?.[1] ?? '';
}
</script>

<template>
  <section class="min-w-0 max-w-6xl py-6">
    <p class="max-w-2xl text-sm leading-6 text-muted-foreground">{{ t('visualIntro') }}</p>
    <div class="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <Button
        v-for="option in layoutOptions"
        :key="option.id"
        :variant="layout === option.id ? 'secondary' : 'outline'"
        class="h-auto min-w-0 justify-start whitespace-normal px-4 py-3 text-left"
        @click="layout = option.id"
      >
        <span class="min-w-0"
          ><strong class="block">{{ layoutName(option.id) }}</strong
          ><span class="block truncate text-xs font-normal text-muted-foreground">{{
            layoutDescription(option.id)
          }}</span></span
        >
      </Button>
    </div>
    <Card class="mt-6 min-w-0"
      ><CardContent class="grid min-w-0 gap-8 pt-6 xl:grid-cols-[minmax(16rem,.8fr)_minmax(28rem,1.4fr)]"
        ><AppearanceControls :settings="settings" :t="t" /><AnimationControls
          :settings="settings"
          :t="t" /></CardContent
    ></Card>
    <div class="mt-6 grid gap-2">
      <Label for="custom-css">{{ t('css') }}</Label
      ><Textarea
        id="custom-css"
        v-model="settings.customCss"
        class="min-h-28 resize-y font-mono text-xs"
        placeholder="--widget-padding: 14px; font-size: 16px;"
      />
      <p class="text-xs text-muted-foreground">
        <code>{{ t('cssExample') }}</code> --widget-padding: 14px; {{ t('cssRest') }}
      </p>
    </div>
    <WidgetUrlCard
      class="mt-6"
      :url="widgetUrl"
      :copied="copied"
      :connected="connected"
      :css-too-long="cssTooLong"
      :t="t"
      @copy="$emit('copy')"
    />
    <div
      class="mt-6 grid min-h-48 min-w-0 place-items-center overflow-auto rounded-lg border border-border bg-black/40 p-4 sm:p-7"
    >
      <div class="min-w-max"><Widget :media="media" :layout="layout" :settings="settings" /></div>
    </div>
    <Button variant="ghost" class="mt-4 text-muted-foreground" @click="$emit('reset')">{{ t('reset') }}</Button>
  </section>
</template>
