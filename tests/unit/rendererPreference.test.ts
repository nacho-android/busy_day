import { describe, expect, it } from 'vitest';
import { shouldUseCanvasRenderer } from '../../src/utils/rendererPreference';

describe('renderer preference', () => {
  it('uses Canvas for desktop Safari and Playwright WebKit', () => {
    expect(shouldUseCanvasRenderer(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    )).toBe(true);
  });

  it('uses Canvas for every iOS browser because they share WebKit', () => {
    expect(shouldUseCanvasRenderer(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1',
    )).toBe(true);
    expect(shouldUseCanvasRenderer(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1',
    )).toBe(true);
  });

  it('keeps automatic WebGL selection for Chromium and Firefox desktops', () => {
    expect(shouldUseCanvasRenderer(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    )).toBe(false);
    expect(shouldUseCanvasRenderer(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    )).toBe(false);
  });
});
