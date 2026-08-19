<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Translate } from '@/app/i18n';
import { animationEasings, animationPresets, type WidgetSettings } from '@/media';

const props = defineProps<{ settings: WidgetSettings; t: Translate }>();
const events = ['show', 'hide', 'change', 'playback'] as const;
function eventLabel(event: (typeof events)[number]) {
  return props.t(
    event === 'change'
      ? 'trackChange'
      : event === 'playback'
        ? 'pauseResume'
        : event === 'show'
          ? 'trackAppears'
          : 'trackDisappears',
  );
}
</script>

<template>
  <section class="min-w-0 space-y-3">
    <h3 class="font-medium">{{ t('animations') }}</h3>
    <div
      v-for="event in events"
      :key="event"
      class="grid min-w-0 gap-2 border-b border-border pb-3 sm:grid-cols-3 lg:grid-cols-[7rem_repeat(3,minmax(0,1fr))] lg:items-end"
    >
      <strong class="text-sm sm:col-span-3 lg:col-span-1 lg:pb-2">{{ eventLabel(event) }}</strong>
      <label class="grid min-w-0 gap-1 text-xs text-muted-foreground"
        >{{ t('preset')
        }}<Select v-model="settings.animations[event].preset"
          ><SelectTrigger><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem v-for="preset in animationPresets" :key="preset" :value="preset">{{
              preset
            }}</SelectItem></SelectContent
          ></Select
        ></label
      >
      <label class="grid min-w-0 gap-1 text-xs text-muted-foreground"
        >{{ t('duration')
        }}<Input v-model.number="settings.animations[event].duration" type="number" min="0" max="2000" step="10"
      /></label>
      <label class="grid min-w-0 gap-1 text-xs text-muted-foreground"
        >{{ t('easing')
        }}<Select v-model="settings.animations[event].easing"
          ><SelectTrigger><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem v-for="easing in animationEasings" :key="easing" :value="easing">{{
              easing
            }}</SelectItem></SelectContent
          ></Select
        ></label
      >
    </div>
  </section>
</template>
