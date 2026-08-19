import { describe, expect, it } from 'vitest';
import { defaultSavedSettings } from '../src/core/settings';
import { buildWidgetUrl, parseWidgetUrl } from '../src/core/widget-url';

describe('buildWidgetUrl', () => {
  it('serializes layout, appearance, marquee, and animations', () => {
    const settings = defaultSavedSettings().settings;
    settings.marqueeEnabled = false;
    const url = new URL(buildWidgetUrl('http://127.0.0.1:3030/widget', 'vinyl', settings));
    expect(url.searchParams.get('layout')).toBe('vinyl');
    expect(url.searchParams.get('background')).toBe(settings.backgroundColor);
    expect(url.searchParams.get('animation-change')).toBe('slide,260,ease-in-out');
    expect(url.searchParams.get('marquee')).toBe('0');
    expect(url.searchParams.has('css')).toBe(false);
  });

  it('parses the generated URL back into widget settings', () => {
    const settings = defaultSavedSettings().settings;
    settings.backgroundColor = '#123456';
    settings.borderRadius = 14;
    settings.cardPadding = 18;
    settings.animations.show.duration = 0;
    settings.marqueeEnabled = false;

    const url = new URL(buildWidgetUrl('http://127.0.0.1:3030/widget', 'horizontal', settings));
    const parsed = parseWidgetUrl(url.searchParams);

    expect(parsed.layout).toBe('horizontal');
    expect(parsed.settings.backgroundColor).toBe('#123456');
    expect(parsed.settings.borderRadius).toBe(14);
    expect(parsed.settings.cardPadding).toBe(18);
    expect(parsed.settings.animations.show.duration).toBe(0);
    expect(parsed.settings.marqueeEnabled).toBe(false);
  });

  it('falls back for invalid widget parameters', () => {
    const parsed = parseWidgetUrl('?layout=unknown&background=red&radius=100&padding=100&animation-show=boom,-1,nope&marquee=yes&css=legacy');
    expect(parsed.layout).toBe('compact');
    expect(parsed.settings.backgroundColor).toBe('#141416');
    expect(parsed.settings.borderRadius).toBe(32);
    expect(parsed.settings.cardPadding).toBe(32);
    expect(parsed.settings.animations.show.preset).toBe('fade');
    expect(parsed.settings.animations.show.duration).toBe(0);
    expect(parsed.settings.marqueeEnabled).toBe(true);
  });
});
