import type { Component } from 'vue';
import Card from './layouts/Card.vue';
import Compact from './layouts/Compact.vue';
import CoverFocus from './layouts/CoverFocus.vue';
import Horizontal from './layouts/Horizontal.vue';
import Minimal from './layouts/Minimal.vue';
import Vinyl from './layouts/Vinyl.vue';

export const layoutRegistry: Record<string, Component> = {
  compact: Compact,
  minimal: Minimal,
  card: Card,
  coverFocus: CoverFocus,
  horizontal: Horizontal,
  vinyl: Vinyl,
};
export const layoutOptions = [
  { id: 'compact', name: 'Compact', description: 'Artwork and metadata' },
  { id: 'minimal', name: 'Minimal', description: 'Text-only lower third' },
  { id: 'card', name: 'Card', description: 'Raised information panel' },
  { id: 'coverFocus', name: 'Cover Focus', description: 'Artwork-led square' },
  { id: 'horizontal', name: 'Horizontal', description: 'Wide broadcast strip' },
  { id: 'vinyl', name: 'Vinyl', description: 'Rotating record accent' },
];
