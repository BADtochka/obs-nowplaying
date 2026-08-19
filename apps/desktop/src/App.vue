<script setup lang="ts">
import { computed } from 'vue';
import AppShell from '@/components/app/AppShell.vue';
import AppSidebar from '@/components/app/AppSidebar.vue';
import PageHeader from '@/components/app/PageHeader.vue';
import NowPlayingPage from '@/components/pages/NowPlayingPage.vue';
import TransportsPage from '@/components/pages/TransportsPage.vue';
import VisualPage from '@/components/pages/VisualPage.vue';
import { useDesktopApp } from '@/composables/useDesktopApp';
import { useI18n } from '@/app/i18n';

const { locale, t } = useI18n();
const app = useDesktopApp(t);
const title = computed(() => t(app.activeSection.value));
</script>

<template>
  <AppShell>
    <template #sidebar
      ><AppSidebar
        v-model:section="app.activeSection.value"
        v-model:locale="locale"
        :connected="app.connected.value"
        :t="t"
    /></template>
    <PageHeader
      :eyebrow="t('configuration')"
      :title="title"
      :refresh-label="t('refresh')"
      @refresh="app.refreshDiagnostics"
    />
    <p
      v-if="app.error.value"
      class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {{ app.error.value }}
    </p>
    <NowPlayingPage
      v-if="app.activeSection.value === 'now'"
      :media="app.activeMedia.value"
      :locale="locale"
      :t="t"
      @open-transports="app.activeSection.value = 'transports'"
    />
    <TransportsPage
      v-else-if="app.activeSection.value === 'transports'"
      :transports="app.transports"
      :diagnostics="app.diagnostics.value"
      :locale="locale"
      :t="t"
    />
    <VisualPage
      v-else
      v-model:layout="app.layout.value"
      :locale="locale"
      :settings="app.settings"
      :media="app.preview.value"
      :widget-url="app.widgetUrl.value"
      :connected="app.connected.value"
      :copied="app.copied.value"
      :css-too-long="app.customCssTooLong.value"
      :t="t"
      @copy="app.copyWidgetUrl"
      @reset="app.resetSettings"
    />
  </AppShell>
</template>
