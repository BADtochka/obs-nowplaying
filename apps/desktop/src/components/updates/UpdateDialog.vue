<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { Translate } from '@/core/i18n';

defineProps<{ t: Translate }>();

const open = ref(false);
const status = ref<'ready' | 'downloading' | 'installing' | 'installed' | 'error'>('ready');
const downloaded = ref(0);
const contentLength = ref<number>();
let checking = false;
let pendingUpdate: Update | null = null;

const progress = computed(() => {
  if (!contentLength.value) return 0;
  return Math.min(100, Math.round((downloaded.value / contentLength.value) * 100));
});
const formattedSize = computed(() => {
  if (!contentLength.value) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(contentLength.value) / Math.log(1024)), units.length - 1);
  return `${(contentLength.value / 1024 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
});

async function checkForUpdate() {
  if (checking || import.meta.env.DEV || !('__TAURI_INTERNALS__' in window)) return;
  checking = true;
  try {
    pendingUpdate = await check({ timeout: 30_000 });
    if (pendingUpdate) open.value = true;
  } catch (error) {
    console.warn('[updater] update check failed', error);
  } finally {
    checking = false;
  }
}

async function installUpdate() {
  if (!pendingUpdate || status.value === 'downloading' || status.value === 'installing') return;
  status.value = 'downloading';
  downloaded.value = 0;
  try {
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') contentLength.value = event.data.contentLength ?? undefined;
      if (event.event === 'Progress') downloaded.value += event.data.chunkLength;
      if (event.event === 'Finished') status.value = 'installing';
    });
    status.value = 'installed';
  } catch (error) {
    console.error('[updater] update installation failed', error);
    status.value = 'error';
  }
}

function setOpen(value: boolean) {
  if (status.value === 'downloading' || status.value === 'installing') return;
  open.value = value;
}

onMounted(() => void checkForUpdate());
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent @escape-key-down="setOpen(false)" @pointer-down-outside="setOpen(false)">
      <div class="space-y-2">
        <DialogTitle>{{ status === 'installed' ? t('updateInstalled') : t('updateAvailable') }}</DialogTitle>
        <DialogDescription>
          {{ status === 'installed' ? t('updateInstalledDescription') : t('updateDescription') }}
        </DialogDescription>
      </div>

      <dl v-if="pendingUpdate && status !== 'installed'" class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-md border bg-muted/40 p-3 text-sm">
        <dt class="text-muted-foreground">{{ t('updateCurrentVersion') }}</dt>
        <dd class="font-medium">{{ pendingUpdate.currentVersion }}</dd>
        <dt class="text-muted-foreground">{{ t('updateNewVersion') }}</dt>
        <dd class="font-medium">{{ pendingUpdate.version }}</dd>
        <dt class="text-muted-foreground">{{ t('updateSize') }}</dt>
        <dd class="text-right font-medium">{{ formattedSize || t('updateSizeUnknown') }}</dd>
      </dl>

      <div v-if="status === 'downloading' || status === 'installing'" class="space-y-2" aria-live="polite">
        <div class="flex justify-between text-sm">
          <span>{{ status === 'installing' ? t('updateInstalling') : t('updateDownloading') }}</span>
          <span v-if="contentLength">{{ progress }}%</span>
        </div>
        <Progress :model-value="status === 'installing' ? 100 : contentLength ? progress : null" />
      </div>

      <p v-if="status === 'error'" class="text-sm text-destructive" role="alert">{{ t('updateFailed') }}</p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button v-if="status !== 'installed'" variant="outline" :disabled="status === 'downloading' || status === 'installing'" @click="setOpen(false)">
          {{ t('updateLater') }}
        </Button>
        <Button v-if="status === 'installed'" @click="relaunch">{{ t('updateRestart') }}</Button>
        <Button v-else :disabled="status === 'downloading' || status === 'installing'" @click="installUpdate">
          {{ status === 'error' ? t('updateRetry') : status === 'ready' ? t('updateNow') : status === 'installing' ? t('updateInstalling') : t('updateDownloading') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
