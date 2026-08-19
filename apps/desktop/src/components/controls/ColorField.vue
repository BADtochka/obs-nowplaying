<script setup lang="ts">
import { ref, watch } from 'vue';
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
    <PopoverContent class="flex w-52 gap-2 p-2" align="start">
      <label
        class="relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-input"
      >
        <span class="size-5 rounded-sm" :style="{ backgroundColor: model }" />
        <input
          :value="model"
          type="color"
          class="absolute inset-0 cursor-pointer opacity-0"
          :aria-label="props.label"
          @input="update(($event.target as HTMLInputElement).value)"
        />
      </label>
      <Input
        :model-value="draft"
        :aria-label="props.hexLabel"
        class="font-mono text-xs"
        @update:model-value="update(String($event))"
      />
    </PopoverContent>
  </Popover>
</template>
