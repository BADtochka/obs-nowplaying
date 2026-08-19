import { describe, expect, it } from 'vitest';
import { SETTINGS_VERSION, defaultSavedSettings, parseSavedSettings } from '../src/core/settings';

describe('parseSavedSettings', () => {
  it('returns independent defaults for missing or invalid data', () => {
    const first = parseSavedSettings(null);
    first.settings.animations.show.duration = 1;
    expect(parseSavedSettings('{broken').settings.animations.show.duration).toBe(220);
  });

  it('migrates partial legacy data and clamps unsafe values', () => {
    const parsed = parseSavedSettings(
      JSON.stringify({
        version: 2,
        layout: 'vinyl',
        settings: { backgroundColor: '#abcdef', primaryColor: 'red', borderRadius: 90, marqueeEnabled: false },
        transports: { nativeMediaPriority: -900, mode: 'nativeMedia' },
      }),
    );
    expect(parsed.version).toBe(SETTINGS_VERSION);
    expect(parsed.layout).toBe('vinyl');
    expect(parsed.settings.backgroundColor).toBe('#abcdef');
    expect(parsed.settings.primaryColor).toBe(defaultSavedSettings().settings.primaryColor);
    expect(parsed.settings.borderRadius).toBe(32);
    expect(parsed.settings.cardPadding).toBe(12);
    expect(parsed.settings.marqueeEnabled).toBe(false);
    expect(parsed.transports.nativeMediaPriority).toBe(-100);
    expect(parsed.transports.mode).toBe('nativeMedia');
  });

  it('migrates and clamps card padding', () => {
    expect(parseSavedSettings(JSON.stringify({ settings: { cardPadding: 90 } })).settings.cardPadding).toBe(32);
  });

  it('migrates legacy accent mode and validates appearance sources', () => {
    const parsed = parseSavedSettings(JSON.stringify({
      version: 7,
      settings: {
        accentMode: 'custom',
        colorSources: { background: 'artwork', primary: 'invalid' },
        borderEnabled: true,
        borderWidth: 99,
        blurredBackgroundEnabled: true,
        backgroundBlur: 99,
        backgroundOpacity: -10,
      },
    }));
    expect(parsed.settings.colorSources).toEqual({ background: 'artwork', primary: 'custom', secondary: 'custom', accent: 'custom' });
    expect(parsed.settings.borderEnabled).toBe(true);
    expect(parsed.settings.borderWidth).toBe(8);
    expect(parsed.settings.backgroundBlur).toBe(40);
    expect(parsed.settings.backgroundOpacity).toBe(0);
  });

  it('validates extension provider config', () => {
    const parsed = parseSavedSettings(JSON.stringify({ transports: {
      browserExtensionProviders: ['spotify', 'unknown', 'spotify'],
      browserExtensionProvider: 'spotify',
    } }));
    expect(parsed.transports.browserExtensionProviders).toEqual(['spotify']);
    expect(parsed.transports.browserExtensionProvider).toBe('spotify');
  });

  it('maps the removed card preset to compact', () => {
    expect(parseSavedSettings(JSON.stringify({ version: 5, layout: 'card' })).layout).toBe('compact');
  });

  it('rejects unknown layouts and future settings versions', () => {
    expect(parseSavedSettings(JSON.stringify({ layout: 'missing' })).layout).toBe('compact');
    expect(parseSavedSettings(JSON.stringify({ version: SETTINGS_VERSION + 1, layout: 'vinyl' })).layout).toBe(
      'compact',
    );
  });
});
