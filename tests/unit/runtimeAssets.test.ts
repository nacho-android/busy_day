/// <reference types="node" />

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BACKGROUND_ASSETS, MUSIC_ASSETS, PORTRAIT_ASSETS, RUNTIME_ASSET_PATHS, SFX_ASSETS } from '../../src/data/assets';
import { LOCATION_LIST } from '../../src/data/locations';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ASSET_ROOT = resolve(PROJECT_ROOT, 'public/assets');

function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...listFiles(absolute));
    else files.push(relative(ASSET_ROOT, absolute).replaceAll('\\', '/'));
  }
  return files;
}

describe('runtime asset manifest', () => {
  it('contains each runtime asset exactly once and matches public/assets on disk', () => {
    const paths = [...RUNTIME_ASSET_PATHS];
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      const absolute = resolve(ASSET_ROOT, path);
      expect(existsSync(absolute), `missing runtime asset ${path}`).toBe(true);
      expect(statSync(absolute).size, `empty runtime asset ${path}`).toBeGreaterThan(0);
    }
    expect(listFiles(ASSET_ROOT).sort()).toEqual(paths.sort());
  });

  it('resolves every authored background and music cue through the runtime manifest', () => {
    for (const location of LOCATION_LIST) {
      expect(location.backgroundKey, `${location.id} has no background`).toBeTruthy();
      expect(location.backgroundKey! in BACKGROUND_ASSETS, `${location.id} background is unmanifested`).toBe(true);
      expect(location.music in MUSIC_ASSETS, `${location.id} music is unmanifested`).toBe(true);
    }
  });

  it('keeps the human-readable asset and audio manifests in sync with runtime files', () => {
    const assetManifest = readFileSync(resolve(PROJECT_ROOT, 'docs/ASSET_MANIFEST.md'), 'utf8');
    const audioManifest = readFileSync(resolve(PROJECT_ROOT, 'docs/AUDIO_MANIFEST.md'), 'utf8');
    for (const path of Object.values(BACKGROUND_ASSETS)) {
      expect(assetManifest, `${path} is absent from ASSET_MANIFEST.md`).toContain(`\`${basename(path)}\``);
    }
    for (const path of Object.values(PORTRAIT_ASSETS)) {
      expect(assetManifest, `${path} is absent from ASSET_MANIFEST.md`).toContain(`\`public/assets/${path}\``);
    }
    for (const path of [...Object.values(MUSIC_ASSETS), ...Object.values(SFX_ASSETS)]) {
      expect(audioManifest, `${path} is absent from AUDIO_MANIFEST.md`).toContain(`\`${basename(path)}\``);
    }
  });
});
