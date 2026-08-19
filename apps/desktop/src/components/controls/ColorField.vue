<script setup lang="ts">
import { ref, watch } from 'vue';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ColorSource } from '@/media';

const props = withDefaults(defineProps<{ label: string; hexLabel: string; customLabel: string; artworkLabel: string; allowSource?: boolean }>(), { allowSource: true });
const model = defineModel<string>({ required: true });
const source = defineModel<ColorSource>('source', { default: 'custom' });
const draft = ref(model.value);
watch(model, (value) => {
  draft.value = value;
});
function update(value: string) {
  draft.value = value;
  if (/^#[0-9a-f]{6}$/i.test(value)) model.value = value.toLowerCase();
}
</script>

<template>
  <div class="grid min-w-0 gap-2" :class="allowSource ? 'grid-cols-[minmax(0,1fr)_8.5rem]' : 'grid-cols-1'">
    <Popover>
      <PopoverTrigger as-child>
        <Button variant="outline" class="h-9 min-w-0 justify-start gap-2 px-2 font-mono text-xs" :aria-label="props.label">
          <span class="size-5 shrink-0 rounded-sm border border-white/20" :style="{ backgroundColor: model }" /><span class="truncate">{{ model }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[19rem] overflow-hidden p-3" align="start">
        <div class="min-w-0 space-y-3 overflow-hidden [&_.vc-colorpicker]:!box-border [&_.vc-colorpicker]:!w-full [&_.vc-colorpicker]:!min-w-0 [&_.vc-colorpicker]:!overflow-hidden">
          <ColorPicker
            :pure-color="model"
            is-widget
            disable-alpha
            disable-history
            format="hex"
            theme="black"
            @update:pure-color="update(String($event))"
          />
          <Input
            :model-value="draft"
            :aria-label="props.hexLabel"
            class="box-border w-full font-mono text-xs"
            @update:model-value="update(String($event))"
          />
        </div>
      </PopoverContent>
    </Popover>
    <Select v-if="allowSource" v-model="source">
      <SelectTrigger :aria-label="`${props.label} source`"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="custom">{{ props.customLabel }}</SelectItem>
        <SelectItem value="artwork">{{ props.artworkLabel }}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
