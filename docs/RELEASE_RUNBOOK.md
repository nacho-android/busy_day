# Busy Day V2 release runbook

This is the reproducible path from a clean checkout to a reviewed static-host release. It preserves the distinction between automated evidence, interactive browser review, and physical-device evidence.

## 1. Prerequisites

- Node.js 24 or newer and npm 11 or newer
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

## 3. Verify or replace optimized runtime backgrounds

The release baseline is 11 runtime backgrounds, all 1280×720 WebP, totaling exactly 1,818,586 bytes (1.734 MiB). The five retired runtime PNG copies totaled 12,006,717 bytes; conversion saved 11,180,271 bytes. All 11 source-quality 1672×941 PNG masters must remain in `art/generated-masters/`.

For every release:

1. Run `npm run verify:release` and confirm the expected 11 `.webp` preload paths exist, resolve, and remain 1280×720.
2. Confirm there are no retired runtime `.png` paths or copies in `public/assets/backgrounds/`.
3. Compare the current files and aggregate byte total with `docs/ASSET_MANIFEST.md`; investigate any unexplained drift.
4. If a master changes, run `npm run assets:optimize`, keep the runtime filename/key stable where practical, and update collision/exit/interaction geometry when the composition moves a gameplay landmark.
5. Update `docs/ASSET_MANIFEST.md` with the new exact bytes, compression details, provenance, and visual findings.
6. Rerun every command and review in sections 2–5, including the three-engine reciprocal route and integrated visual QA, then commit the master/runtime/manifest/data changes together.

Never replace or delete a retained master merely to reduce the runtime bundle.

## 4. Cross-browser and visual automation

Install the browser runtimes once, then run all projects:

```powershell
npx playwright install chromium firefox webkit
npm run test:e2e
npm run qa:visual
```

Inspect every image in `visual-qa/`, including the ending and the assembled contact sheet. Check character visibility, interaction-marker placement, foreground/depth relationships, exit readability, HUD overlap, dialogue wrapping, and accidental placeholder art. A green test process is not visual approval.

The current post-optimization baseline captured 11 unique checkpoints—every room plus the ending—with zero captured console/page errors, and its contact sheet passed visual review for HUD readability, characters/targets, exits, textures, and no blank rooms. Keep `visual-qa/` ignored and out of the published release; regenerate it for review rather than treating the prior captures as permanent artefacts.

The workflow repeats release/audio/type/lint/unit/build gates and runs seven Playwright tests per engine. Node 24 baseline [`29297017450`](https://github.com/nacho-android/busy_day/actions/runs/29297017450) on [`bf52920`](https://github.com/nacho-android/busy_day/commit/bf52920) passed clean install, 27/27 unit tests, build, and Playwright 21/21; exact engine timings are in the implementation checklist.

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

The PR must link the successful final-art workflow and identify its validated commit. Any later code/asset change requires a fresh result. Include approved screenshots without publishing the ignored QA directory, list real-device/manual results, disclose rights gaps, and avoid presenting CI as no-shortcut, physical-device, soak, rights, merge, deployment, or hosted-smoke evidence.

## 8. Static hosting and sign-off

GitHub Pages is configured with workflow build type, HTTPS, and a main-only deployment policy. `.github/workflows/quality.yml` deploys only after a successful non-PR `main` quality job and all three browser jobs; it builds with `VITE_BASE_PATH=/busy_day/` and uploads only `dist/`. Production baseline: merge `54499b368d566f3fa4e7da1af3e7a06ed1942b2f`, successful workflow `29298026940`, successful deployment `5433749633`, and [public URL](https://nacho-android.github.io/busy_day/).

The baseline cache-busted index and hashed JS/CSS, title WebP, and title WAV returned HTTP 200 with correct types; the index did not expose `/src/main.ts`. In-app smoke loaded the title, entered Tea Room through New Shift, exposed Continue after refresh, resumed the Tea Room objective, and captured no warning/error logs. For every future release, repeat these checks and record the URL, branch, SHA, workflow/deployment IDs, browser/device matrix, and accepted limitations. Do not treat this smoke as a no-shortcut ending, physical-device, audio-listening, soak, current-phone-performance, or rights result.
