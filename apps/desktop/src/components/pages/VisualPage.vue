<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronDown, Image, LayoutPanelTop, RectangleHorizontal, Rows3, Disc3 } from 'lucide-vue-next';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Widget from '@/components/Widget.vue';
import { layoutOptions, widgetDimensions } from '@/components/layouts';
import AppearanceControls from '@/components/visual/AppearanceControls.vue';
import AnimationControls from '@/components/visual/AnimationControls.vue';
import WidgetUrlCard from '@/components/visual/WidgetUrlCard.vue';
import { layoutLabels, type Translate } from '@/core/i18n';
import type { Locale } from '@/core/types';
import type { MediaState, WidgetSettings } from '@/media';

const props = defineProps<{
  locale: Locale;
  settings: WidgetSettings;
  media: MediaState;
  widgetUrl: string;
  connected: boolean;
  copied: boolean;
  t: Translate;
}>();
const layout = defineModel<string>('layout', { required: true });
defineEmits<{ copy: []; reset: [] }>();

const previewSlot = ref<HTMLElement | null>(null);
const previewPanel = ref<HTMLElement | null>(null);
const showFixedPreview = ref(false);
const previewSeen = ref(false);
const previewHeight = ref(0);
const previewWidth = ref(0);
const previewLeft = ref(0);
const previewTop = ref(0);
let intersectionObserver: IntersectionObserver | undefined;
let resizeObserver: ResizeObserver | undefined;
let visibilityFrame: number | undefined;
let previewRefresh = 0;
let refreshingPreview = false;

const fixedPreviewWidth = computed(() => Math.min(previewWidth.value, Math.max(0, window.innerWidth - 24)));
const fixedPreviewScale = computed(() => {
  if (layout.value !== 'coverFocus' || !previewHeight.value) return 1;
  return Math.min(1, Math.max(0.5, (window.innerHeight - 24) / previewHeight.value));
});
const fixedPreviewStyle = computed(() => ({
  width: `${fixedPreviewWidth.value}px`,
  top: `${Math.min(
    Math.max(previewTop.value, 12),
    Math.max(12, window.innerHeight - previewHeight.value * fixedPreviewScale.value - 12),
  )}px`,
  left: `${Math.min(Math.max(previewLeft.value, 12), Math.max(12, window.innerWidth - fixedPreviewWidth.value - 12))}px`,
  transform: `scale(${fixedPreviewScale.value})`,
}));
const presetIcons = { compact: Image, minimal: Rows3, coverFocus: LayoutPanelTop, horizontal: RectangleHorizontal, vinyl: Disc3 };

function layoutName(id: string) {
  return layoutLabels[props.locale][id as keyof typeof layoutLabels.en]?.[0] ?? id;
}
function layoutDescription(id: string) {
  return layoutLabels[props.locale][id as keyof typeof layoutLabels.en]?.[1] ?? '';
}
function layoutDimensions(id: string) {
  const option = layoutOptions.find((candidate) => candidate.id === id);
  return option ? widgetDimensions(option, props.settings.cardPadding) : null;
}
function measurePreview() {
  if (!previewSlot.value) return;
  previewWidth.value = previewSlot.value.clientWidth;
  const rect = previewSlot.value.getBoundingClientRect();
  previewLeft.value = rect.left;
  previewTop.value = rect.top;
  if (!showFixedPreview.value && previewPanel.value) previewHeight.value = previewPanel.value.offsetHeight;
}
function updatePreviewVisibility() {
  if (!previewSlot.value) return;
  const rect = previewSlot.value.getBoundingClientRect();
  previewLeft.value = rect.left;
  previewTop.value = rect.top;
  if (refreshingPreview) return;
  const fullyVisible = rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
  if (fullyVisible) previewSeen.value = true;
  showFixedPreview.value = previewSeen.value && !fullyVisible;
}
function schedulePreviewVisibility() {
  if (visibilityFrame !== undefined) return;
  visibilityFrame = window.requestAnimationFrame(() => {
    visibilityFrame = undefined;
    updatePreviewVisibility();
  });
}
watch(
  [layout, () => props.settings.cardPadding],
  async () => {
    const refresh = ++previewRefresh;
    refreshingPreview = true;
    showFixedPreview.value = false;
    previewHeight.value = 0;
    await nextTick();
    if (refresh !== previewRefresh) return;
    measurePreview();
    await nextTick();
    if (refresh !== previewRefresh) return;
    refreshingPreview = false;
    updatePreviewVisibility();
  },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(measurePreview);
  if (previewSlot.value) resizeObserver.observe(previewSlot.value);
  if (previewPanel.value) resizeObserver.observe(previewPanel.value);
  intersectionObserver = new IntersectionObserver(
    () => updatePreviewVisibility(),
    { threshold: [0, 1] },
  );
  if (previewSlot.value) intersectionObserver.observe(previewSlot.value);
  window.addEventListener('scroll', schedulePreviewVisibility, { passive: true });
  window.addEventListener('resize', schedulePreviewVisibility);
  measurePreview();
  updatePreviewVisibility();
});
onBeforeUnmount(() => {
  intersectionObserver?.disconnect();
  resizeObserver?.disconnect();
  window.removeEventListener('scroll', schedulePreviewVisibility);
  window.removeEventListener('resize', schedulePreviewVisibility);
  if (visibilityFrame !== undefined) window.cancelAnimationFrame(visibilityFrame);
});
</script>

<template>
  <section class="min-w-0 max-w-7xl py-6">
    <p class="max-w-2xl text-sm leading-6 text-muted-foreground">{{ t('visualIntro') }}</p>

    <div class="mt-6 min-w-0">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">{{ t('preview') }}</CardTitle>
          <CardDescription>{{ layoutName(layout) }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref="previewSlot"
            class="mx-auto max-w-3xl"
            :style="previewHeight ? { minHeight: `${previewHeight}px` } : undefined"
          >
            <div
              ref="previewPanel"
              class="grid min-h-52 min-w-0 place-items-center overflow-hidden rounded-lg border border-border bg-black/40 p-4 sm:p-7"
              :class="showFixedPreview ? 'fixed z-40 origin-top-left shadow-2xl' : ''"
              :style="showFixedPreview ? fixedPreviewStyle : undefined"
            >
              <Widget :media="media" :layout="layout" :settings="settings" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(28rem,1.1fr)] xl:items-start">
      <div class="min-w-0 space-y-6">
        <Card>
          <CardHeader class="pb-4">
            <CardTitle class="text-base">{{ t('layoutSection') }}</CardTitle>
            <CardDescription>{{ t('layoutHint') }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button
              v-for="option in layoutOptions"
              :key="option.id"
              type="button"
              class="group flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="layout === option.id ? 'border-primary bg-primary/5' : 'border-border bg-background/40'"
              :aria-pressed="layout === option.id"
              @click="layout = option.id"
            >
              <span class="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-card">
                <component :is="presetIcons[option.id as keyof typeof presetIcons]" class="size-5 text-primary" />
              </span>
              <span class="min-w-0">
                <strong class="block text-sm">{{ layoutName(option.id) }}</strong>
                <span class="mt-0.5 block text-xs leading-4 text-muted-foreground">{{ layoutDescription(option.id) }}</span>
                <span class="mt-1 block font-mono text-[10px] text-muted-foreground"
                  >{{ layoutDimensions(option.id)?.width }} x {{ layoutDimensions(option.id)?.height }}</span
                >
              </span>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base">{{ t('customizeSection') }}</CardTitle>
            <CardDescription>{{ t('customizeHint') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <AccordionRoot type="multiple" :default-value="['appearance']" class="divide-y divide-border">
              <AccordionItem value="appearance">
                <AccordionHeader>
                  <AccordionTrigger class="group flex w-full items-center justify-between py-4 text-left text-sm font-medium">
                    {{ t('appearance') }}
                    <ChevronDown class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent class="overflow-hidden pb-5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <AppearanceControls :settings="settings" :t="t" />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="motion">
                <AccordionHeader>
                  <AccordionTrigger class="group flex w-full items-center justify-between py-4 text-left text-sm font-medium">
                    {{ t('animations') }}
                    <ChevronDown class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent class="overflow-hidden pb-5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <AnimationControls :settings="settings" :t="t" />
                </AccordionContent>
              </AccordionItem>
            </AccordionRoot>
          </CardContent>
        </Card>
        <Button variant="ghost" class="text-muted-foreground" @click="$emit('reset')">{{ t('reset') }}</Button>
      </div>

      <div class="min-w-0 space-y-6">
        <WidgetUrlCard
          :url="widgetUrl"
          :copied="copied"
          :connected="connected"
          :t="t"
          @copy="$emit('copy')"
        />
      </div>
    </div>
  </section>
</template>
