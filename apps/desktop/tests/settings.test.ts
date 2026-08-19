import { describe, expect, it } from 'vitest';
import { SETTINGS_VERSION, defaultSavedSettings, parseSavedSettings } from '../src/app/settings';

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
        settings: { backgroundColor: '#abcdef', primaryColor: 'red', borderRadius: 90, customCss: 'font-size: 14px' },
        transports: { nativeMediaPriority: -900, mode: 'nativeMedia' },
      }),
    );
    expect(parsed.version).toBe(SETTINGS_VERSION);
    expect(parsed.layout).toBe('vinyl');
    expect(parsed.settings.backgroundColor).toBe('#abcdef');
    expect(parsed.settings.primaryColor).toBe(defaultSavedSettings().settings.primaryColor);
    expect(parsed.settings.borderRadius).toBe(32);
    expect(parsed.transports.nativeMediaPriority).toBe(-100);
    expect(parsed.transports.mode).toBe('nativeMedia');
  });

  it('rejects unknown layouts and future settings versions', () => {
    expect(parseSavedSettings(JSON.stringify({ layout: 'missing' })).layout).toBe('compact');
    expect(parseSavedSettings(JSON.stringify({ version: SETTINGS_VERSION + 1, layout: 'vinyl' })).layout).toBe(
      'compact',
    );
  });
});
