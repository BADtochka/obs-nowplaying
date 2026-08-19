import { describe, expect, it } from 'vitest';
import { detectLocale } from '../src/core/i18n';

describe('detectLocale', () => {
  it('prefers a persisted supported locale', () => {
    expect(detectLocale('en', ['ru-RU'])).toBe('en');
    expect(detectLocale('ru', ['en-US'])).toBe('ru');
  });

  it('detects Russian from any OS language and otherwise uses English', () => {
    expect(detectLocale(null, ['uk-UA', 'ru-RU'])).toBe('ru');
    expect(detectLocale(null, ['de-DE'])).toBe('en');
  });
});
