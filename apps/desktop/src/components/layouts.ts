import type { Component } from 'vue';
import Compact from './layouts/Compact.vue';
import CoverFocus from './layouts/CoverFocus.vue';
import Horizontal from './layouts/Horizontal.vue';
import Minimal from './layouts/Minimal.vue';
import Vinyl from './layouts/Vinyl.vue';

interface LayoutDefinition {
  component: Component;
}

export const layoutRegistry: Record<string, LayoutDefinition> = {
  compact: { component: Compact },
  minimal: { component: Minimal },
  coverFocus: { component: CoverFocus },
  horizontal: { component: Horizontal },
  vinyl: { component: Vinyl },
};
export const layoutOptions = [
  { id: 'compact', width: 300, height: 72 },
  { id: 'minimal', width: 320, height: 64 },
  { id: 'coverFocus', width: 260, height: 260 },
  { id: 'horizontal', width: 440, height: 68 },
  { id: 'vinyl', width: 320, height: 88 },
];

export function widgetDimensions(layout: (typeof layoutOptions)[number], cardPadding: number) {
  return {
    width: layout.width + cardPadding * 2,
    // The track is 4px tall with an 8px document-flow gap above it.
    height: layout.height + cardPadding * 2 + 12,
  };
}
