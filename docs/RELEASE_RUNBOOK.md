# Busy Day V2 release runbook

This is the reproducible path from a clean checkout to a reviewed static-host release. It preserves the distinction between automated evidence, interactive browser review, and physical-device evidence.

## 1. Prerequisites

- Node.js 24 or newer and npm 10 or newer (the committed lockfile was produced with npm 11)
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

`verify:release` checks preservation, expected references, package/lock agreement, required documentation, generated/runtime assets through the typed manifests, audio-manifest coverage, local documentation links, GitHub file-size limits, intended release exclusions, and selected high-risk credential patterns. It does not replace the build or runtime checks.

## 3. Verify or replace optimized runtime backgrounds

The release baseline is 11 runtime backgrounds, all 1280×720 WebP, totaling exactly 1,777,598 bytes (1.695 MiB). Fourteen source-quality environment masters, including predecessor/replacement compositions, remain in `art/generated-masters/`. Dialogue portraits and the runtime character/world atlas sources are documented independently in `docs/ASSET_MANIFEST.md`.

For every release:

1. Run `npm run verify:release` and confirm every path in the runtime background manifest exists, resolves, and remains 1280×720. Do not infer runtime coverage from literal `PreloadScene` calls: only title and Tea Room load up front, while later rooms load on entry.
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
npm run test:e2e:preview
npm run test:e2e:public
npm run qa:visual
```

Inspect every image in `visual-qa/`, including the ending and the assembled contact sheet. Check character visibility, interaction-marker placement, foreground/depth relationships, exit readability, HUD overlap, dialogue wrapping, and accidental placeholder art. A green test process is not visual approval.

V2.1 captured 11 unique checkpoints—every room plus the ending—with zero captured console/page errors, and its contact sheet passed visual review for HUD readability, characters/targets, exits, textures, and no blank rooms. Keep `visual-qa/` ignored and out of the published release; regenerate it for future art or layout changes rather than treating captures as permanent artefacts.

The workflow repeats release/audio/type/lint/unit/build gates and runs both the dev-server and production-preview Playwright projects for each engine. V2.1 implementation head [`61cfdb8`](https://github.com/nacho-android/busy_day/commit/61cfdb8df7df211af7ed7d0516865ef596114dd0) passed Node 24 PR workflow [`29348227739`](https://github.com/nacho-android/busy_day/actions/runs/29348227739): clean install; release/audio/type/lint; 49/49 unit tests; build; 48/48 dev-server and 6/6 preview browser tests. Pages correctly skipped on the PR branch. Any later source, asset, or documentation commit still requires a fresh result for that new head.

The longer public-input journeys are intentionally opt-in:

```powershell
npx playwright test --config=playwright.public.config.ts
```

They use ordinary movement, interaction, exits, dialogue, menus, save/reload, and checkpoint recovery. They may be inappropriate for software-rendered shared hosts: the recorded local attempt was stopped after severe software-WebGL frame starvation prevented a reliable hold interaction. This is not a completed Mel/Josh result and is not, by itself, evidence of a progression defect.

## 5. Production-preview checks

```powershell
npm run preview -- --host 127.0.0.1 --port 4180
```

Against the production bundle, verify:

- title, lead selection, New Shift, Continue, and overwrite confirmation;
- all ten rooms, 18 exit directions, destination spawns/facing, and collision approaches;
- the ordered 18-objective/31-target story, failure/retry, restart, ending, and refresh recovery;
- lazy background transitions and the three-location decoded LRU, including revisiting an evicted room;
- music/SFX start after a user gesture, crossfades, mute/unmute, saved volume, and scene cleanup;
- zero failed requests, missing textures, `console.error`, page errors, unexpected scrolling, or stale listeners;
- the seven automated landscape viewports plus the supported portrait pause/resume path.

Record production resource count, encoded transfer, initial navigation, representative frame timing, and a transition/audio soak. Do not infer phone performance from desktop emulation.

For the reproducible Chromium automation sample, serve the final bundle on the script's default port in one terminal and run the sampler in another:

```powershell
npm run preview -- --host 127.0.0.1 --port 4176
npm run qa:performance
```

Record the reported renderer. SwiftShader/software-WebGL results characterize the automation host and must not be presented as physical-device performance.

## 6. Manual and device matrix

Complete no-shortcut Mel and Josh runs. Test current Chrome/Chromium, Firefox, and Safari/WebKit where available, then use at least one real mid-range Android phone and one real iPhone or iPad in landscape. Include address-bar resize, safe areas/notches, left/right-handed touch controls, simultaneous joystick/action input, largest text, high contrast, reduced motion, Relaxed Shift, background/foreground recovery, and storage refresh.

Test a representative gamepad for world movement, interact, sprint, dodge, D-pad/stick focus, accept, back, Start/pause, dialogue choices, sliders/selects, confirmation, failure, and ending overlays. The synthetic Chromium test is useful regression evidence but is not a hardware-controller result; include disconnect/reconnect and controller-label differences in the manual record.

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
git push -u origin agent/busy-day-v2-hardening
gh pr create --draft --base main --head agent/busy-day-v2-hardening --title "Harden Busy Day V2.1" --body-file .github/PULL_REQUEST_TEMPLATE.md
```

The PR must link the successful final-art workflow and identify its validated commit. Any later code/asset change requires a fresh result. Include approved screenshots without publishing the ignored QA directory, list real-device/manual results, disclose rights gaps, and avoid presenting CI as no-shortcut, physical-device, soak, rights, merge, deployment, or hosted-smoke evidence.

## 8. Static hosting and sign-off

GitHub Pages is configured with workflow build type, HTTPS, and a main-only deployment policy. `.github/workflows/quality.yml` deploys only after a successful non-PR `main` quality job and all three browser jobs; it builds with `VITE_BASE_PATH=/busy_day/` and uploads only `dist/`. The recorded V2.1 production baseline is merge `d5bc627235f70865290b34e8efe28824debb1e54`, successful main workflow [`29350906888`](https://github.com/nacho-android/busy_day/actions/runs/29350906888), successful [Pages job `87149283383`](https://github.com/nacho-android/busy_day/actions/runs/29350906888/job/87149283383), and [public URL](https://nacho-android.github.io/busy_day/).

The V2.1 production index loaded hashed `assets/index-DEBHc20z.js` and `assets/index-CyZvj29T.css`. In-app smoke loaded the title, confirmed New Shift replacement, advanced Sally/Juan opening dialogue, entered Tea Room with “Check the shift board” at 0/1, exposed Continue after refresh, resumed that checkpoint, opened the complete 18-objective drawer, and captured zero console entries. For every future release, repeat these checks and record the URL, branch, SHA, workflow/deployment IDs, browser/device matrix, and accepted limitations. Do not treat this smoke as a no-shortcut ending, physical-device, audio-listening, soak, current-phone-performance, or rights result.
