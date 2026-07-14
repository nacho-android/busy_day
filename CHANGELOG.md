# Changelog

All notable changes to Busy Day at the Viv are documented here. The project uses semantic versioning for the V2 application.

## [2.1.0] — 2026-07-14

### Added

- Added three V2-only complications—route-control restoration, baboon-wing interlock calibration, and cath-monitor synchronisation—expanding the critical path to 18 objectives and 31 targets.
- Added schema-three save migration so progress from the deployed 15-objective schema-two route resumes at a coherent new prerequisite without corrupting rewards or checkpoints.
- Added complete renderer/asset/frame/animation/footprint/portrait/voice metadata, executable vector/sprite-sheet/atlas character modes, authored NPC patrols/reactions, and generated foreground occlusion crops.
- Added eight AI-rendered retro-noir dialogue portraits for Mel, Josh, Sally, Juan, Alan, Dhanya, Ross, and Wayne; raw reference photographs remain outside the public release.
- Added a retained Mel/Josh directional character source sheet for later atlas work; it is deliberately not packed, approved, or loaded as a runtime animation atlas.
- Added reproducible dependency/cycle, route-unlock, reciprocal-exit, collision-reachability, dialogue-identity, and exact runtime-asset validation.
- Kept exhaustive grid validation in development/release gates instead of blocking production startup, added patrol-segment validation, transient lazy-art retry/title recovery, privacy-safe gamepad enumeration, and safe rejection of future-schema active progress.
- Added all-18-exit runtime coverage, browser tests for failure/recovery/settings/touch/barriers, a built-bundle preview suite, and an opt-in public-input Mel/Josh journey harness.
- Added controller focus, accept, back, Start/pause, dialogue, choice, slider, and select navigation across the title and blocking overlays.

### Changed

- Added authored acceleration/deceleration and made Josh’s stress-resistance statistic affect positive stress pressure.
- Switched large location backplates to on-entry loading with a three-room decoded LRU; the title and Tea Room remain the only up-front background textures.
- Upgraded dialogue from gradient initials to data-driven rendered portraits for the principal speaking cast while retaining accessible text fallbacks for the wider ensemble.

### Fixed

- Moved Vu to a collision-reachable Feed Store position.
- Reworked exit-test approach selection around collision-valid points and neutralised carried entry input so named destination facing remains stable.
- Added the missing pull-request template referenced by the release runbook.

### Validation status

- Focused Chromium hardening runs crossed all 18 authored exit directions and covered barriers, locked routing, Wayne failure/checkpoint recovery, pause/restart/reset, persisted settings, touch hold-use, longest-dialogue containment, synthetic controller UI, and a test-assisted 18-objective/31-target ending. The built-preview Chromium path also passed its focused run. Record the final consolidated and three-engine workflow results separately before release.
- The opt-in public-input Mel journey reached the visible shift-board prompt but did not complete because shared-host software WebGL stopped delivering reliable update frames during the hold interaction; Josh was not run. This is not a no-shortcut completion claim or an established progression defect.
- Physical touch devices, hardware controllers, screen readers, manual audio listening, soak/current-phone performance, and likeness/publication-rights review remain unverified.

## [2.0.0] — 2026-07-14

### Added

- Rebuilt the game as a Vite 8, strict TypeScript 6, and Phaser 3.90 application with modular scenes, data, state, systems, entities, UI, and audio.
- Added a ten-location connected world: Tea Room, Main Hallway, Feed Store, Pig Housing, Sheep & Scales, Baboon Wing, Procedure Prep, Cath Lab, Car Park, and Coffee Shop.
- Added the complete 15-objective V1-derived story route from Sally's shift board through animal care, pig preparation/cath support, sheep shearing, the car-park crisis, and Juan's coffee.
- Added distinct Mel and Josh statistics, direct movement, sprint, dodge, sub-stepped collision, perspective scaling, runtime depth, hold interactions, reciprocal exits, and transition locking.
- Added a detailed palette-driven vector paper-doll rig with direction-specific redraws, recognisable hair/glasses/facial-hair traits, workwear details, walk/idle motion, interactions, hit response, perspective, and depth.
- Added a DOM-based HUD, objective/kit drawer, dialogue/typewriter/choice system, pause/settings/confirmation menus, failure recovery, and ranked ending.
- Added Ross's corridor trap, Thanh's moving car-park hazard and captioned horn, Wayne pressure/failure, and two Wayne dialogue outcomes.
- Added versioned local persistence for active progress, profile results, audio, controls, and accessibility preferences.
- Added responsive touch controls, gamepad input paths, landscape orientation handling, safe-area layout, larger text, high contrast, reduced motion, subtitles/captions, handedness, and Relaxed Shift.
- Added 11 original generated retro-noir images: title plus all ten gameplay locations. All 11 runtime backgrounds are optimized 1280×720 WebP files, with their 1672×941 PNG masters retained.
- Added 26 deterministic original synthesized WAV files covering six music/ambience loops and 20 interface/world effects.
- Added V1 audit, game design, asset/audio manifests, architecture, implementation checklist, known limitations, setup/deployment documentation, and licensing scope.
- Added Vitest coverage for collision, world validation, save parsing/persistence, objective progression, checkpoints, failures, and full data-driven completion.
- Added Playwright configuration for Chromium, Firefox, and WebKit. Before the five final backplates were integrated, all three seven-test suites passed (21/21 total) with no captured `console.error` or page errors.
- Added a gated GitHub Pages deployment to the quality workflow. After merge, a successful `main` quality/browser run builds with `VITE_BASE_PATH=/busy_day/` before deploying the `dist/` artifact.
- Verified a copied publishable source tree from `npm ci` through typecheck, lint, 27 unit tests, and the production build before the final-art expansion.
- Verified that pre-final-art clean production bundle in local Chromium through title, New Shift, HUD/Tea Room, resource/HTTP checks, scroll lock, and zero captured console/page errors.
- Recorded a pre-final-art 1366×768 Intel UHD 620 desktop automation sample for first navigation, frame pacing, and JavaScript heap; this is not presented as current-payload or phone evidence.

### Changed

- Consolidated the initial 16-location design proposal into ten purposeful locations so the implemented world does not contain empty transition-only rooms.
- Replaced V1's monolithic canvas/script structure with typed, data-driven location, character, objective, save, and interaction definitions.
- Expanded V1's best-results-only persistence into an active-run save and continue system while using a separate V2 storage key.
- Converted the five retired 1672×941 runtime PNG copies, formerly 12,006,717 bytes, to 1280×720 WebP. The conversion saved 11,180,271 bytes; all 11 runtime backgrounds now total exactly 1,818,586 bytes (1.734 MiB).
- Verified post-optimization strict typecheck, ESLint, 27/27 unit tests, the normal Vite production build, and a `/busy_day/` Pages-path build locally. Generated HTML/CSS asset URLs were also checked beneath `/busy_day/`.
- Captured 11 unique post-optimization visual-QA checkpoints covering all ten rooms plus the ending with zero captured console/page errors; accepted the contact sheet for HUD readability, characters/targets, exits, textures, and no blank rooms. QA captures remain ignored and unpublished.

### Preserved

- Kept `Busy_Day_v1.html` as the historical V1 build. Its recorded baseline is 168,208 bytes, 4,315 lines, SHA-256 `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85`.
- Retained V1's central characters, objective spine, Wayne/Ross/Thanh humour, failure concepts, and final coffee payoff.

### Fixed during release hardening

- Derived restored stamina from the selected character definition instead of stale hard-coded values.
- Rebuilt objective prefix, targets, flags, rewards, level, and checkpoint from coherent saved progress instead of trusting contradictory browser data.
- Routed Continue on a failed save through checkpoint recovery.
- Applied Relaxed Shift changes to the active unfinished run.
- Added confirmation before New Shift replaces unfinished progress and feedback when Use is pressed out of range.
- Persisted movement on a throttle and when the page is backgrounded.
- Made audio URLs deployment-base aware and restarted the correct location cue after unmuting.
- Reset transient location-scene state on restart, stopped shutting-down scenes from overwriting destination/checkpoint coordinates, and armed exits only after the player clears the entry trigger.
- Moved 11 destination spawns away from immediate exit overlap and covered a real reciprocal route in Chromium.
- Consolidated world input through `GameUI` and cleared held keys whenever runtime input is reset.
- Added collision footprints for all six car-park vehicles; completing a car plays a drive-away tween and removes its runtime prop/collision obstacle, progressively opening the lane.
- Integrated the five final room backplates through data background keys and realigned collision/exit geometry to their visible fixtures.
- Triggered the original pig, sheep, and baboon cues alongside successful species interactions.
- Replaced the reciprocal-exit E2E's stale pre-art hard-coded Feed Store spawn expectation with data-driven coordinates and made its keyboard assertion cadence-independent. The focused real-route check then passed in Chromium, Firefox, and WebKit (3/3).
- Validated the final-art branch on Node 24 in PR workflow [`29297017450`](https://github.com/nacho-android/busy_day/actions/runs/29297017450), commit [`bf52920`](https://github.com/nacho-android/busy_day/commit/bf52920): clean `npm ci`; release/audio/type/lint checks; 27/27 unit tests; production build; Chromium 7/7 (4.8 minutes), Firefox 7/7 (29.2 seconds), and WebKit 7/7 (1.3 minutes), totaling 21/21. The gated Pages job correctly skipped for the PR event.
- Merged PR #1 to `main` as [`54499b3`](https://github.com/nacho-android/busy_day/commit/54499b368d566f3fa4e7da1af3e7a06ed1942b2f). Main workflow [`29298026940`](https://github.com/nacho-android/busy_day/actions/runs/29298026940) passed under Node 24: clean release/audio/type/lint/27-unit/build gates and Chromium/Firefox/WebKit 7/7 each (21/21). Pages deployment `5433749633` succeeded for that SHA/ref `main`.
- Published [the production game](https://nacho-android.github.io/busy_day/) through workflow-based, HTTPS, main-only GitHub Pages. Cache-busted index, hashed JS/CSS, title WebP, and title WAV returned HTTP 200 with correct types; the index did not expose raw `/src/main.ts`. Hosted title, New Shift, refresh/Continue, and Tea Room resume passed with zero captured warning/error logs.

### Known limitations

- Published and merged [PR #1](https://github.com/nacho-android/busy_day/pull/1) into the public [`nacho-android/busy_day`](https://github.com/nacho-android/busy_day) repository.
- The static verifier's 107-file / 32.73 MiB intended release scope excludes all 43 raw references and `style_ref.png`; no intended file contained the checked high-risk credential/token patterns.
- Characters, animals, props, and vehicles are animated runtime vector constructions rather than final sprite sheets/atlases.
- Pointer/tap-to-move, navigation pathfinding, a physical pushable cart/trolley, and a spatial car-sliding puzzle are not implemented.
- Complete no-shortcut Mel/Josh runs, physical-device/controller checks, audio listening, screen-reader review, soak/current-phone performance, and rights review remain pending. V2.1 adds focused Chromium all-18-exit evidence, but the expanded final CI result is tracked separately from this V2.0 release history.
- See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the full impact and workaround list.

## [1.0.0] — Historical single-file version

- Original playable canvas game preserved as `Busy_Day_v1.html`.
- Its observed implementation is documented in [`docs/V1_AUDIT.md`](docs/V1_AUDIT.md); this changelog does not retroactively claim a package or Git release for V1.
