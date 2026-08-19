<script setup lang="ts">
import { ref, watch } from 'vue';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const props = defineProps<{ label: string; hexLabel: string }>();
const model = defineModel<string>({ required: true });
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
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" class="h-9 justify-start gap-2 px-2 font-mono text-xs" :aria-label="props.label">
        <span class="size-5 rounded-sm border border-white/20" :style="{ backgroundColor: model }" />{{ model }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[18rem] space-y-3 p-3" align="start">
      <ColorPicker
        class="!w-full !overflow-visible pr-4"
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
        class="font-mono text-xs"
        @update:model-value="update(String($event))"
      />
    </PopoverContent>
  </Popover>
</template>
