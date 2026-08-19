import { describe, expect, it } from 'vitest';
import { defaultSavedSettings } from '../src/app/settings';
import { MAX_URL_CSS_LENGTH, buildWidgetUrl } from '../src/app/widget-url';

describe('buildWidgetUrl', () => {
  it('serializes layout, appearance, animations, and Unicode CSS', () => {
    const settings = defaultSavedSettings().settings;
    settings.customCss = 'font-family: "Тест"';
    const url = new URL(buildWidgetUrl('http://127.0.0.1:3030/widget', 'vinyl', settings));
    expect(url.searchParams.get('layout')).toBe('vinyl');
    expect(url.searchParams.get('background')).toBe(settings.backgroundColor);
    expect(url.searchParams.get('animation-change')).toBe('slide,260,ease-in-out');
    expect(url.searchParams.get('css')).toBeTruthy();
  });

  it('omits CSS above the safe URL limit', () => {
    const settings = defaultSavedSettings().settings;
    settings.customCss = 'x'.repeat(MAX_URL_CSS_LENGTH + 1);
    const url = new URL(buildWidgetUrl('http://localhost/widget', 'compact', settings));
    expect(url.searchParams.has('css')).toBe(false);
  });
});
