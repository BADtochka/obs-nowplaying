import { describe, expect, it } from 'vitest';
import { shouldResetArtworkAccent } from '../src/artwork-accent';

describe('shouldResetArtworkAccent', () => {
  it('keeps an extracted accent when media updates without changing artwork or mode', () => {
    const current = ['https://images.example/cover.jpg', 'artwork'] as const;
    expect(shouldResetArtworkAccent(current, current)).toBe(false);
  });

  it('uses the fallback when artwork or accent mode changes', () => {
    expect(shouldResetArtworkAccent(['first', 'artwork'], ['second', 'artwork'])).toBe(true);
    expect(shouldResetArtworkAccent(['first', 'artwork'], ['first', 'custom'])).toBe(true);
  });
});
