<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { MediaState } from '@/media';
import type { Translate } from '@/core/i18n';

const props = defineProps<{ media: MediaState | null; locale: string; t: Translate }>();
defineEmits<{ openTransports: [] }>();
function dateTime(value: number | null) {
  return value
    ? new Intl.DateTimeFormat(props.locale, { dateStyle: 'short', timeStyle: 'medium' }).format(value)
    : props.t('noUpdate');
}
</script>

<template>
  <section class="max-w-3xl py-6">
    <Badge variant="outline" class="gap-2"
      ><span class="size-1.5 rounded-full" :class="media ? 'bg-emerald-500' : 'bg-muted-foreground'" />{{
        media ? t('active') : t('noMedia')
      }}</Badge
    >
    <template v-if="media">
      <h3 class="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">{{ media.title }}</h3>
      <p class="mt-2 text-muted-foreground">
        {{ media.artists.length ? media.artists.join(', ') : t('unknownArtist') }}
      </p>
      <dl class="mt-8 grid gap-5 sm:grid-cols-3">
        <div>
          <dt class="text-xs uppercase tracking-wider text-muted-foreground">{{ t('source') }}</dt>
          <dd class="mt-1 text-sm">{{ media.source.service || media.source.transportId }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wider text-muted-foreground">{{ t('playback') }}</dt>
          <dd class="mt-1 text-sm">{{ media.isPlaying ? t('playing') : t('paused') }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wider text-muted-foreground">{{ t('updated') }}</dt>
          <dd class="mt-1 text-sm">{{ dateTime(media.timestamps?.updatedAt ?? null) }}</dd>
        </div>
      </dl>
    </template>
    <Card v-else class="mt-7"
      ><CardContent class="pt-6"
        ><strong>{{ t('waiting') }}</strong>
        <p class="my-3 max-w-xl text-sm leading-6 text-muted-foreground">{{ t('waitingText') }}</p>
        <Button @click="$emit('openTransports')">{{ t('openTransports') }}</Button></CardContent
      ></Card
    >
    <details class="mt-8 border-t border-border pt-4">
      <summary class="cursor-pointer text-sm text-muted-foreground">{{ t('raw') }}</summary>
      <pre class="mt-3 max-h-72 overflow-auto rounded-md bg-card p-4 text-xs text-emerald-200">{{
        JSON.stringify(media, null, 2)
      }}</pre>
    </details>
  </section>
</template>
