# Busy Day V2 release runbook

This is the reproducible path from a clean checkout to a reviewed static-host release. It preserves the distinction between automated evidence, interactive browser review, and physical-device evidence.

## 1. Prerequisites

- Node.js 20.20 or newer and npm 10 or newer
- Python 3.11 or newer
- Git 2.40 or newer
- GitHub CLI authenticated to the target account
- Playwright's Chromium, Firefox, and WebKit runtimes
- Confirmed publication/likeness rights for every generated asset that uses a supplied person or location as a reference

Check the toolchain:

```powershell
node --version
npm --version
python --version
git --version
gh auth status
```

## 2. Clean install and static gates

From a fresh checkout:

```powershell
npm ci
npm run verify:release
python scripts/verify_audio.py
npm run typecheck
npm run lint
npm test
npm run build
```

`verify:release` checks preservation, expected references, package/lock agreement, required documentation, all generated masters/runtime backgrounds, preload paths, audio-manifest coverage, local documentation links, GitHub file-size limits, intended release exclusions, and selected high-risk credential patterns. It does not replace the build or runtime checks.

## 3. Finish final-room image optimisation

The five final rooms currently load full-size PNGs. Before a public release:

1. Run `npm run assets:optimize`.
2. Confirm that `feed-store.webp`, `sheep-scales.webp`, `baboon-wing.webp`, `procedure-prep.webp`, and `coffee-shop.webp` exist at 1280×720.
3. Change the corresponding five paths in `src/scenes/PreloadScene.ts` from `.png` to `.webp`.
4. Update `docs/ASSET_MANIFEST.md` with exact byte sizes and compression details.
5. Rerun every command in sections 2–5 and commit the generated WebPs plus source/manifest changes together.

Do not delete the 1672×941 masters in `art/generated-masters/`.

## 4. Cross-browser and visual automation

Install the browser runtimes once, then run all projects:

```powershell
npx playwright install chromium firefox webkit
npm run test:e2e
npm run qa:visual
```

Inspect every image in `visual-qa/`, including the ending and the assembled contact sheet. Check character visibility, interaction-marker placement, foreground/depth relationships, exit readability, HUD overlap, dialogue wrapping, and accidental placeholder art. A green test process is not visual approval.

The GitHub workflow in `.github/workflows/quality.yml` repeats the static/unit/build gate and runs the seven-test Playwright suite independently in Chromium, Firefox, and WebKit.

## 5. Production-preview checks

```powershell
npm run preview -- --host 127.0.0.1 --port 4180
```

Against the production bundle, verify:

- title, lead selection, New Shift, Continue, and overwrite confirmation;
- all ten rooms, 18 exit directions, destination spawns/facing, and collision approaches;
- the ordered 15-objective/28-target story, failure/retry, restart, ending, and refresh recovery;
- music/SFX start after a user gesture, crossfades, mute/unmute, saved volume, and scene cleanup;
- zero failed requests, missing textures, `console.error`, page errors, unexpected scrolling, or stale listeners;
- the seven automated landscape viewports plus the supported portrait pause/resume path.

Record production resource count, encoded transfer, initial navigation, representative frame timing, and a transition/audio soak. Do not infer phone performance from desktop emulation.

## 6. Manual and device matrix

Complete no-shortcut Mel and Josh runs. Test current Chrome/Chromium, Firefox, and Safari/WebKit where available, then use at least one real mid-range Android phone and one real iPhone or iPad in landscape. Include address-bar resize, safe areas/notches, left/right-handed touch controls, simultaneous joystick/action input, largest text, high contrast, reduced motion, Relaxed Shift, background/foreground recovery, and storage refresh.

Test a representative gamepad for world movement, interact, sprint, and dodge. Menus/dialogue are not controller-only and must remain documented as such.

## 7. Git and pull request

Review exactly what will be published:

```powershell
git status -sb
git diff --check
git diff --stat
git ls-files
```

Raw root reference images, `style_ref.png`, browser/session data, reports, dependencies, builds, caches, logs, `.env` files, and generated QA captures must remain excluded. Run the hosting platform's secret scan in addition to `verify:release`.

Push the feature branch without force and open a draft PR:

```powershell
git push -u origin agent/busy-day-v2
gh pr create --draft --base main --head agent/busy-day-v2 --title "Build Busy Day V2 retro-noir adventure" --body-file .github/PULL_REQUEST_TEMPLATE.md
```

The PR must state which evidence predates the five final backplates, link the current CI checks, include approved screenshots, list real-device/manual results, disclose unoptimised assets or rights gaps, and avoid claiming unpublished validation.

## 8. Static hosting and sign-off

Deploy only `dist/`. Verify the exact public root/subpath, direct refresh, all asset/audio URLs, save/Continue, orientation restoration, and a complete ending on the published URL. Record the deployment URL, branch, commit SHA, CI result, browser/device matrix, performance sample, and any accepted limitation in the checklist and changelog before declaring the release complete.
