# Busy Day at the Viv V2 — Implementation Checklist

**Status date:** 2026-07-14
**Legend:** `[x]` is implemented or verified exactly as written; `[ ]` is incomplete, unverified, or intentionally deferred. A source-code feature is not treated as a browser/device test.

## 1. Audit and preservation

- [x] Review `Busy_Day_v1.html` storyline, cast, objectives, controls, mechanics, hazards, win/failure flow, persistence, artwork, audio, and limitations.
- [x] Create `docs/V1_AUDIT.md` from the actual V1 file.
- [x] Record V1 baseline: 168,208 bytes, 4,315 lines, SHA-256 `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85`.
- [x] Recheck that hash during the 2026-07-14 documentation pass; it still matches.
- [x] Recheck the V1 hash before the current published branch/PR; it remained unchanged.
- [x] Count and inspect the actual supplied image set: 43 files (38 `.jpeg`, 4 `.jpg`, 1 `.png`; 15.23 MiB).
- [x] Catalogue every reference with filename, dimensions, size, hash, visible subject/location/prop, uncertainty, privacy/brand concerns, and proposed use in `docs/ASSET_MANIFEST.md`.
- [x] Preserve supplied references in the local workspace root without deleting or replacing them; exclude them from the published repository and catalogue them in `docs/REFERENCE_INVENTORY.json`.
- [x] Create the initial design and keep this checklist evidence-based.

## 2. Repository and project foundation

- [x] Preserve `Busy_Day_v1.html`; V2 uses `index.html` and modular sources instead of replacing it.
- [x] Scaffold Vite, strict TypeScript, and Phaser 3.
- [x] Pin exact dependency versions and include `package-lock.json`.
- [x] Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, unused checks, and no implicit fallthrough/override.
- [x] Configure ESLint for application, tests, scripts, and configuration.
- [x] Configure Vitest for unit tests.
- [x] Configure Playwright projects for Chromium, Firefox, and WebKit.
- [x] Add `.gitignore` coverage for dependencies, builds, coverage, Playwright output, Vite cache, environment files, logs, local files, and screenshots.
- [x] Add development, typecheck, lint, unit, E2E, build, preview, and art-export scripts.
- [x] Organise `src/`, `public/assets/`, `art/`, `scripts/`, `tests/`, and `docs/`.
- [x] Add GitHub Actions quality/browser jobs plus a gated Pages deployment for successful non-PR `main` runs using `VITE_BASE_PATH=/busy_day/`.
- [x] Establish repository remote and branch `agent/busy-day-v2` without overwriting unrelated history.

## 3. Architecture and data integrity

- [x] Implement `BootScene`, `PreloadScene`, `TitleScene`, generic `LocationScene`, persistent `UIScene`, and `EndingScene` registration.
- [x] Keep authoritative active progress/settings/profile in `GameSession`, not mutable production globals.
- [x] Expose the frozen `window.__busyDayTest` adapter only in development/test builds.
- [x] Define typed location, spawn, exit, character, direction, interaction, objective, dialogue, settings, save, audio, and failure models.
- [x] Keep lead gameplay statistics separate from character visual definitions.
- [x] Store location bounds, spawns, exits, obstacles, interactions, NPCs, music, perspective, and background keys as structured data.
- [x] Store objective sequence, targets, flags, kit, rewards, hints, checkpoints, and dialogue as structured data.
- [x] Validate duplicate spawn/interaction/objective IDs.
- [x] Validate spawn bounds and fixed-obstacle occupancy.
- [x] Validate every exit destination, destination spawn, and reciprocal route.
- [x] Validate that each objective location exists and each target interaction ID exists globally.
- [x] Separately audit all 15 production objectives: every target is in its declared location and every required flag is granted earlier.
- [x] Stop boot with a readable diagnostic if world validation fails.
- [x] Re-audit Car Park with all six car obstacles and after every sequential removal: both spawns/exits and every hotspot remain reachable at player radii 20 and 22.
- [x] Run a 5-pixel-grid reachability audit across all ten rooms and 19 spawns; no required interaction/exit is unreachable in current data.
- [x] Rerun a radius-22, 5-pixel-grid audit after final-art geometry changes: Feed Store 10,644 cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, Coffee Shop 13,348; all spawns/targets/exits pass after moving the unreachable optional `dinosaur_toy`.
- [ ] Automate same-room objective/flag-order/reachability checks in the boot validator and unit suite.
- [ ] Validate dialogue speaker/portrait/effect references and every asset/audio definition against files on disk.
- [ ] Add an explicit objective-dependency graph/cycle validator; current progression is ordered by array index.

## 4. Implemented story route

- [x] Select Mel or Josh with meaningfully different stats.
- [x] Start a new shift at 06:45 in the Tea Room.
- [x] Establish Sally's board-first instruction and Juan's coffee promise through opening dialogue.
- [x] Complete the shift-board and feed-cart objectives.
- [x] Feed three pigs, three sheep, and three baboons individually.
- [x] Collect three distinct baboon samples.
- [x] Complete pig preparation and anaesthesia support with Alan/Luther present.
- [x] Load, weigh, and deliver the pig trolley through ordered flags/prerequisites.
- [x] Complete cath handover and cardiac-support console objectives.
- [x] Complete sheep shearing.
- [x] Clear six car targets with owner-specific Juan/Wayne handling and a Wayne dialogue choice.
- [x] Complete Juan's coffee target, profile completion, final dialogue, and ranked ending in the data/session path.
- [x] Include Ross's corridor trap and Dodge recovery.
- [x] Include Thanh's moving vehicle, captioned horn, impact feedback, and health damage.
- [x] Give all six cars collision footprints and remove each completed car prop/collider to open the lane.
- [x] Include visible Wayne pressure, standard/Relaxed accumulation, dialogue effects, and Wayne failure.
- [x] Include health failure, checkpoint retry, restart shift, and title recovery.
- [x] Unit-test the full ordered 15-objective/28-target state path to completion.
- [ ] Complete a full public-control Mel run without test shortcuts.
- [ ] Complete a full public-control Josh run without test shortcuts.
- [ ] Confirm out-of-order, leave/re-enter, failure, and refresh behaviour across every act without developer intervention.

## 5. Playable locations

| Location | Purpose present | Reciprocal route data valid | Final generated backplate | Post-final-art runtime browser pass |
| --- | :---: | :---: | :---: | :---: |
| Tea Room | [x] | [x] | [x] | [x] visual QA |
| Main Hallway | [x] | [x] | [x] | [x] visual QA |
| Feed Store | [x] | [x] | [x] | [x] visual QA + route |
| Pig Housing | [x] | [x] | [x] | [x] visual QA |
| Sheep & Scales | [x] | [x] | [x] | [x] visual QA |
| Baboon Wing | [x] | [x] | [x] | [x] visual QA |
| Procedure Prep | [x] | [x] | [x] | [x] visual QA |
| Cath Lab | [x] | [x] | [x] | [x] visual QA |
| Car Park | [x] | [x] | [x] | [x] visual QA |
| Coffee Shop | [x] | [x] | [x] | [x] visual QA |

- [x] All ten locations contain required, narrative, or optional interactions; none exists only to inflate screen count.
- [x] Locked Main Hall → Car Park, Prep → Cath, and Car Park → Coffee routes explain their required flags.
- [x] Current world graph has 18 exit definitions forming nine reciprocal route pairs.
- [ ] Traverse all 18 exit directions at runtime and assert destination position/facing.
- [x] Verify every target/exit approach remains statically reachable around the five revised final-art room geometries; all rooms render in integrated visual QA, while complete movement traversal of all exits remains pending.

## 6. Movement, collision, animation, and transitions

- [x] Implement normalized eight-direction keyboard/touch/gamepad movement.
- [x] Implement lead-specific walk/sprint speed, stamina consumption/recovery, and trolley speed factor.
- [x] Implement collision as a circle within rectangular bounds against fixed rectangular obstacles.
- [x] Sub-step movement/dodge to reduce tunnelling and resolve axes separately for wall sliding.
- [x] Unit-test bounds, exact obstacle contact, high-speed barrier collision, wall sliding, and geometric helpers.
- [x] Implement Dodge with stamina cost and cooldown.
- [x] Implement per-location perspective scale and Y-based actor/prop depth.
- [x] Implement transition lock, fade/sound, named destination spawn, reduced-motion cut, and entry cooldown.
- [x] Implement procedural four-direction facing, idle/walk motion, interaction, and hit reaction for the lead rig.
- [x] Polish the vector paper doll with tapered workwear, boots/hands/cuffs, seams/pockets/ID badge, face shading/features, glasses/facial hair, six hair styles, directional redraws, purposeful interaction, and mirrored left profile.
- [x] Keep character visual IDs/definitions separate enough to replace rendering without changing objectives.
- [ ] Add smooth acceleration/deceleration; current movement changes velocity directly.
- [ ] Add pointer/tap-to-move and pathfinding, or formally exclude them from the supported control set.
- [ ] Add separate feed-cart/pig-trolley bodies, animation, and collision footprints; current carrying is flag/speed based.
- [ ] Add foreground occlusion layers/depth gates and verify behind/in-front traversal.
- [ ] Add NPC patrols/schedules/pathing; current NPCs have stationary idle motion.
- [ ] Verify collision and transition behaviour manually in every room, including held input and narrow approaches.

## 7. Dialogue, objectives, interactions, and UI

- [x] Support speaker, expression state, wrapped multiline text, optional typewriter, reveal-all, advance, and queued sequences.
- [x] Support keyboard and pointer/touch dialogue advancement paths.
- [ ] Support gamepad focus, dialogue advancement/choices, and menus for a controller-only path.
- [x] Support button/number-key dialogue choices and typed effects for Wayne/stress.
- [x] Disable typewriter delay when Reduced Motion is active.
- [x] Show concise current objective/progress/time in the HUD.
- [x] Show all tasks, current/completed state, kit flags, and an authored hint in the objective drawer.
- [x] Highlight interaction affordances without relying on hover and show hold progress.
- [x] Cancel hold progress when input/range changes and scale hold duration by lead interaction rate.
- [x] Provide prerequisite, already-completed, out-of-order, optional, success, and failure feedback.
- [x] Provide rate-limited feedback when Use is pressed with nothing in range.
- [x] Provide pause, objectives, settings, restart checkpoint, restart shift, and title actions.
- [x] Require confirmation for checkpoint restart, shift restart, and reset-all actions.
- [x] Require confirmation before New Shift replaces an unfinished run.
- [x] Show cause-specific failure and rank/task/coin/lead/time/meter ending information.
- [ ] Add final rendered portrait/expression artwork; current portraits are initial/gradient treatments.
- [ ] Validate longest real dialogue and every menu at normal/large text across supported viewports.
- [ ] Perform a full keyboard focus-order/screen-reader review.

## 8. Artwork and visual production

- [x] Retain all 11 generated 1672×941 PNG masters in `art/generated-masters/`.
- [x] Export all 11 runtime backgrounds as 1280×720 WebP at quality 88 / effort 5; exact total 1,818,586 bytes (1.734 MiB).
- [x] Retire the five 1672×941 runtime PNG copies, formerly 12,006,717 bytes; their WebP replacements save 11,180,271 bytes.
- [x] Integrate generated title art and a generated backplate for every gameplay location through data background keys.
- [x] Keep unedited supplied photographs out of the runtime.
- [x] Visually inspect all 11 generated masters and accept an integrated 11-checkpoint contact sheet covering all ten runtime rooms plus the ending.
- [x] Record provenance, dimensions, format/compression state, visual findings, and replacement notes for all 11 generated assets.
- [x] Generate and integrate final backplates for the former five procedural gameplay rooms.
- [x] Realign those five locations' collision and exit geometry to visible fixtures.
- [x] Export browser-sized WebP files for the five final rooms, switch runtime paths, pass both production builds, and complete integrated all-room visual QA plus the focused three-engine reciprocal route.
- [ ] Generate/approve final lead/NPC sprite atlases and dialogue portraits, or explicitly approve the procedural vector character style.
- [ ] Generate/approve dedicated foreground layers, transition/loading art, ending art, and full prop/VFX/icon set.
- [ ] Visually inspect every final runtime room, character, prop, effect, and depth relationship in motion.
- [ ] Confirm publication/likeness rights for references and likeness-derived generated art, or replace affected outputs.

## 9. Audio

- [x] Generate 26 original deterministic mono PCM16 WAV files: six loops and 20 SFX.
- [x] Verify file set, RIFF readability, channels, sample width/rate, frames, duration, peak, DC offset, and loop-edge delta with `scripts/verify_audio.py`.
- [x] Document per-file purpose, duration, method, seed/provenance, loop notes, and CC0 audio licence.
- [x] Integrate all six music IDs and map all 20 SFX IDs through `AudioDirector`.
- [x] Trigger mapped pig, sheep, and baboon vocalisations at restrained gain on successful species interactions.
- [ ] Manually listen-test the species/task cue layering for repetition and perceived level.
- [x] Delay playback until user activation.
- [x] Implement loop switching/crossfade, dialogue/pause ducking, saved music/SFX volumes, and mute.
- [x] Caption Thanh's important off-screen horn/impact information.
- [ ] Add independent ambience/UI buses; current user-facing categories are music and SFX.
- [x] Use `BASE_URL`-aware audio paths and Vite-processed title/ending image URLs for static subpath deployment.
- [ ] Add compressed browser audio mirrors if profiling justifies them.
- [ ] Manually listen through title, facility, animal, cath, car park, failure, and ending sequences on representative outputs.
- [ ] Soak-test transitions, mute/unmute, background/foreground, and orientation changes for duplicate/stalled audio.

## 10. Save, continue, settings, and recovery

- [x] Use a V2-only storage key and schema version 2 envelope.
- [x] Persist lead, run state, objectives/targets/flags, meters, rewards, checkpoint/failure, settings, and profile.
- [x] Sanitize/clamp untrusted saves and reject structurally incomplete active runs.
- [x] Normalize legacy-shaped settings/profile data into schema 2 defaults.
- [x] Show Continue only for an unfinished run.
- [x] Unit-test save defaults, malformed JSON, settings clamping, legacy-shaped normalization, deep clone, persist/load/clear, invalid-run rejection, character stamina limits, inconsistent-progress repair, and terminal finished-state derivation.
- [x] Unit-test transition persistence/reload and checkpoint rollback of targets/objectives/flags/rewards.
- [x] Preserve profile/settings on Restart Shift and clear V2 state only after Reset confirmation.
- [x] Persist movement on a throttled 1.2-second interval and when the page is backgrounded.
- [x] Apply Relaxed Shift setting changes to the active unfinished run as well as future runs.
- [ ] Add explicit per-schema migration functions before any schema 3 change.
- [ ] Browser-test save/reload/continue at each checkpoint and during car-park state.

## 11. Mobile, responsive, and accessibility

- [x] Use landscape-first Phaser FIT scaling and a no-scroll/no-touch-gesture page shell.
- [x] Implement a portrait rotate prompt that blocks/pauses the live location while keeping run state in memory.
- [x] Implement safe-area-aware HUD, dialogue, joystick, and touch actions.
- [x] Implement pointer capture/cancel/lost-capture cleanup and simultaneous joystick/action controls.
- [x] Implement right/left-handed touch layouts.
- [x] Implement visible focus, captions, larger text, high contrast, reduced motion, and Relaxed Shift settings.
- [x] Save accessibility/control preferences.
- [x] Author Playwright checks for portrait→landscape preservation, no page scroll, and seven landscape viewport dimensions.
- [x] Execute and pass portrait/landscape state preservation, landscape touch-control visibility, and seven-size viewport/layout/scroll assertions in Chromium.
- [x] Execute and pass the current viewport/layout/scroll assertions in Firefox.
- [x] Execute and pass the current viewport/layout/scroll assertions in WebKit.
- [ ] Verify small/large iPhone, Android phone, tablet, laptop, 1080p, and ultrawide visual layouts from captured screenshots.
- [ ] Test real iPhone/iPad/Android hardware, address-bar resize, high DPI, notches, and rounded corners.
- [ ] Implement gamepad menu/dialogue navigation, then test representative controllers and disconnect/reconnect.
- [ ] Run assistive-technology and complete keyboard navigation checks.

## 12. Static, unit, browser, and manual verification

### Verified before the final five-backplate integration unless noted

- [x] `npm run typecheck` passed with strict TypeScript on the earlier six-art snapshot.
- [x] `npm run lint` passed on the earlier six-art snapshot after including the Node global used by the art optimizer.
- [x] `npm test` passed after runtime hardening on that snapshot: 27 tests across four test files.
- [x] Unit coverage includes collision, world graph, save/state, both failures, checkpoint rollback, transition reload, and the full data-driven completion path.
- [x] Rerun strict typecheck, ESLint, 27/27 unit tests, and the normal Vite build after final-art optimization: all passed locally.
- [x] Chrome visual inspection covered the title, lead selection/New Shift, opening dialogue/typewriter/advance, HUD, and Tea Room gameplay.
- [x] Capture all ten rooms plus the ending as 11 unique integrated visual-QA checkpoints with zero captured console/page errors; inspect and accept the contact sheet for HUD, characters/targets, exits, textures, and no blank rooms.

### Browser evidence and remaining release matrix

- [x] Add Playwright core tests for title/New Shift, Josh selection, dialogue, save/reload/Continue, room-correct data-driven ending, health failure/retry, and portrait/landscape preservation.
- [x] Add a real-transition test for Tea Room → Main Hall → Feed Store → Main Hall, destination spawns, and post-restart keyboard movement.
- [x] Add Playwright tests for seven representative landscape viewport sizes and no-page-scroll assertions.
- [x] Capture browser `pageerror` and `console.error` as E2E failures.
- [x] Run the pre-final-art Chromium suite to completion: 7/7 pass in 5.7 minutes on Chromium 149.0.7827.55.
- [x] Run the pre-final-art Firefox suite to completion: 7/7 pass in 1.6 minutes with zero captured console/page errors.
- [x] Run the pre-final-art WebKit suite to completion: 7/7 pass in 5.0 minutes (304.6 seconds) with zero captured console/page errors.
- [x] Record the previous full final-art Actions result exactly: static/audio/types/lint/27 unit/build passed; Chromium, Firefox, and WebKit each passed 6/7 and failed only the now-fixed stale reciprocal-exit assertion.
- [ ] Complete the replacement full GitHub Actions rerun; do not infer final-art 21/21 from the focused fix verification.
- [x] Verify post-transition keyboard movement in the reciprocal-exit test across Chromium, Firefox, and WebKit with a cadence-independent assertion.
- [ ] Add/execute broader public-input sprint/dodge/hold interaction tests.
- [x] Execute the Tea Room → Main Hall → Feed Store → Main Hall reciprocal route and assert data-driven destination spawn/location in Chromium, Firefox, and WebKit (3/3 focused runs).
- [ ] Execute the remaining 15 exit directions and their destination spawn/facing.
- [x] Execute health failure/retry and save/reload/Continue in Chromium.
- [ ] Add/execute Wayne failure/retry, pause/restart/reset, settings/audio persistence, and representative barrier tests.
- [x] Inspect the assembled 11-checkpoint visual-QA contact sheet rather than relying only on assertions; keep `visual-qa/` ignored and unpublished.

### Manual/quality gates

- [ ] Complete no-shortcut Mel and Josh runs.
- [ ] Complete a Relaxed Shift pass through car-park pressure.
- [ ] Test out-of-order actions, repeated room entry, held input during fades, collision wedging, Ross recovery, and adverse car order.
- [ ] Monitor console, failed requests, missing assets, stale markers, dialogue overflow, invisible actors, depth errors, and audio duplication over a complete run.
- [ ] Background/foreground the page and rotate during movement, dialogue, transition, and audio.
- [ ] Confirm all important controls are discoverable without developer documentation.

## 13. Performance and production verification

- [x] Show loading progress and stop with a readable error if a required image fails.
- [x] Use compressed 1280×720 WebP for all 11 generated runtime backgrounds; total 1,818,586 bytes (1.734 MiB).
- [x] Convert the five final full-size runtime PNG copies to WebP, saving 11,180,271 bytes from their former 12,006,717-byte total.
- [x] Request music by cue rather than decoding all WAV loops in the Phaser preloader.
- [x] Clear scene-local prop/NPC maps during scene shutdown.
- [x] Measure a pre-final-art local desktop first navigation, active frame time, and JavaScript heap sample; clearly retain its historical desktop-automation scope.
- [ ] Measure bundle parse, decoded texture/audio memory, transition latency, and long-session behaviour.
- [ ] Measure on a representative mid-range phone; do not substitute desktop emulation for a device claim.
- [ ] Soak repeated transitions for memory, event-listener, tween, and audio growth.
- [ ] Decide whether route-level lazy assets, texture unloading, DPR caps, or compressed audio are required from measurements.
- [x] Run an earlier six-art copied publishable-source clean-directory `npm ci` followed by typecheck, lint, unit, and build; cross-browser E2E was validated separately in the primary working tree.
- [x] Serve that pre-final-art clean-install `dist/` locally and verify title, New Shift, HUD/Tea Room, one canvas, scroll lock, all 12 initial resources, HTTP responses, and console/page errors.
- [x] Pass post-optimization local strict typecheck, ESLint, 27/27 unit tests, the normal Vite build, and a `/busy_day/` Pages-path Vite build; inspect the generated HTML/CSS URLs beneath `/busy_day/`.
- [ ] Repeat the post-optimization gates from a fresh clean install and complete a current production-preview smoke.
- [ ] Verify Continue, audio, and relative asset paths beneath the eventual published host/subpath.

## 14. Documentation and licensing

- [x] `README.md` includes premise, title artwork, setup, commands, controls, mobile/accessibility notes, save behaviour, architecture links, deployment notes, and rights caveats.
- [x] `docs/ARCHITECTURE.md` documents composition, data/state flow, collision, UI, audio, save, assets, tests, and replacement workflows.
- [x] `docs/V2_GAME_DESIGN.md` describes the actual ten-location/15-objective implementation and explicitly lists deferred scope.
- [x] `docs/KNOWN_LIMITATIONS.md` records user impact, workaround/release action, and pending validation.
- [x] `CHANGELOG.md` records V2 additions, consolidation, preservation, and limitations.
- [x] `LICENSE` applies MIT to original code/docs, preserves audio CC0, and excludes supplied/likeness-derived assets pending rights confirmation.
- [x] `docs/AUDIO_MANIFEST.md` documents all 26 audio files and generator/verification method.
- [x] Complete `docs/ASSET_MANIFEST.md` for the current 43 references and 11 generated master/runtime pairs.
- [x] Publish `docs/REFERENCE_INVENTORY.json` while keeping the 43 raw reference files and `style_ref.png` local-only.
- [x] Record the current local desktop performance sample with explicit device/evidence limits.
- [x] Record the public repository, published branch, and draft PR details without presenting a superseded commit as current.
- [x] Record the previous full final-art Actions result and the gated Pages workflow configuration.
- [ ] Add the replacement full Actions result, merged commit, deployment URL, and hosted smoke evidence after they exist.

## 15. Repository publication

- [x] Verify the intended release scope after exclusions: 107 files / 32.71 MiB; exclude dependencies, builds, reports, caches, session data, all 43 raw references, `style_ref.png`, and ignored visual-QA captures.
- [x] Scan intended release-file contents for selected high-risk credential/token patterns: zero matching files. This targeted check is not an exhaustive credential scanner.
- [x] Exclude supplied source references from publication because redistribution rights are undocumented.
- [x] Create intentional commits without force-pushing unrelated history.
- [x] Push branch `agent/busy-day-v2` to `nacho-android/busy_day`.
- [x] Open draft PR #1 with summary, test evidence, limitations, and rights caveats.
- [x] Record the draft PR URL without labelling an earlier commit as current.
- [x] Add a gated Pages Actions deployment for successful non-PR `main` runs with `VITE_BASE_PATH=/busy_day/`.
- [ ] Complete the replacement full Actions rerun, review/merge the draft PR, run the gated Pages job on `main`, and record hosted smoke evidence.

## 16. Non-negotiable release gates

- [x] V1 closely reviewed; all supplied references catalogued; V1 currently hash-preserved.
- [x] Modern modular architecture, strict TypeScript, and data-driven world/story/state are present.
- [x] Ten purposeful locations and the complete 15-objective state path are implemented.
- [x] Final original audio pack is generated, integrated, and documented.
- [ ] Final visual scope is approved and every production asset is manifested/rights-cleared.
- [ ] Full story is manually playable opening-to-coffee for both leads without shortcuts or blockers.
- [ ] Every exit, spawn, barrier, interaction, failure, restart, save/continue, and ending works in runtime browser testing.
- [ ] Touch, orientation, viewports, accessibility options, and gamepad paths are validated in representative environments.
- [ ] Final-art Chromium, Firefox, and WebKit suites pass with no captured `console.error` or page errors; the preserved pre-art result is 21/21.
- [ ] Visual, audio, and performance passes are complete with measured findings.
- [x] Post-optimization local strict typecheck, lint, 27/27 unit tests, normal build, and `/busy_day/` build succeed.
- [ ] Repeat the final-art static/unit/build gates from a clean installation.
- [ ] Final-art clean production bundle passes a local preview smoke; the pre-art snapshot passed.
- [x] Repository branch is pushed and draft PR #1 is open.

## Verification log

| Date | Evidence | Result |
| --- | --- | --- |
| 2026-07-14 | Pre-final-art `npm run typecheck` after runtime/save hardening and character-rig polish | Pass — strict tsc, exit 0 |
| 2026-07-14 | Pre-final-art `npm run lint` after runtime/save hardening and character-rig polish | Pass — exit 0 |
| 2026-07-14 | Pre-final-art `npm test` after runtime/save hardening | Pass — 27/27 tests, four files, 6.63 s consolidated rerun |
| 2026-07-14 | Pre-final-art copied publishable-source `npm ci` | Pass — exit 0; 141 packages installed in 19 s |
| 2026-07-14 | Pre-final-art clean-install static/unit/build gates | Pass — typecheck 21 s; lint 49.1 s; Vitest 27/27 in 3.54 s; build 3.37 s |
| 2026-07-14 | Pre-final-art clean-install bundle output | 10.53 kB HTML; 17.78 kB CSS / 5.05 kB gzip; 1,303.01 kB JS / 352.27 kB gzip |
| 2026-07-14 | Pre-final-art clean production preview, Chromium on `127.0.0.1:4180` | Pass — title, New Shift, HUD/Tea Room, one canvas, scroll 0/0, 12 resources, zero bad HTTP responses, zero console/page errors |
| 2026-07-14 | Pre-final-art local foreground Chromium, Intel UHD 620/D3D11, 1366×768 | Blank baseline 47.4 FPS / 18.1 ms p95; active Tea Room 33.3 FPS / 36.1 ms p95; prior same-condition sample 13.5 MiB JS heap |
| 2026-07-14 | Pre-final-art initial local production navigation | 1.141 s; 12 resources; approximately 2.95 MB encoded transfer |
| 2026-07-14 | Pre-final-art Playwright Chromium 149.0.7827.55 | Pass — 7/7, 0 failures, 5.7 min; zero captured console/page errors |
| 2026-07-14 | Pre-final-art Playwright Firefox | Pass — 7/7, 0 failures, 1.6 min; zero captured console/page errors |
| 2026-07-14 | Pre-final-art Playwright WebKit | Pass — 7/7, 0 failures, 5.0 min (304.6 s); zero captured console/page errors |
| 2026-07-14 | Pre-final-art Chromium full-story route | Pass — 28 targets / 15 objectives across correct rooms, ending shown (test-assisted travel/interactions) |
| 2026-07-14 | Pre-final-art Chromium physical transition subset | Pass — Tea → Hall → Feed → Hall spawns and post-restart keyboard movement |
| 2026-07-14 | Pre-final-art Chromium responsive matrix | Pass — 667×375, 932×430, 915×412, 1024×768, 1366×768, 1920×1080, 2560×1080; portrait state, landscape touch controls, and scroll lock |
| 2026-07-13 | Chrome visual/manual smoke | Title, New Shift, opening dialogue, and Tea Room inspected; not a complete run |
| 2026-07-13/14 | Generated-art file inspection | All 11 source-quality 1672×941 PNG masters retained and inspected; every runtime background is now a 1280×720 WebP |
| 2026-07-14 | Final-room art integration | Feed Store, Sheep & Scales, Baboon Wing, Procedure Prep, and Coffee Shop background keys integrated; collision/exit geometry realigned to visible fixtures |
| 2026-07-13 | `scripts/verify_audio.py` | Pass for 26 WAV files / 4.99 MiB; format/level/loop-edge checks |
| 2026-07-14 | V1 SHA-256 recheck | Match — `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85` |
| 2026-07-14 | Car-park collision/reachability audit | Pass — 13,975-cell initial component; both exits and six hotspots reachable with radius 20/22; every completion state remains connected |
| 2026-07-14 | Pre-final-art production-data reachability/story audit | Pass — ten rooms, 19 spawns, all required targets/exits reachable at 5-pixel grid; target rooms and prerequisite flag order coherent before five-room geometry revision |
| 2026-07-14 | Post-final-art radius-22 / 5-pixel-grid audit | Pass — Feed Store 10,644 cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, Coffee Shop 13,348; all spawns/targets/exits reachable after moving `dinosaur_toy` |
| 2026-07-14 | Runtime art optimization | Pass — all 11 backgrounds are 1280×720 WebP totaling 1,818,586 bytes (1.734 MiB); five retired 12,006,717-byte PNGs replaced, saving 11,180,271 bytes |
| 2026-07-14 | Post-optimization local static/unit/build gates | Pass — strict typecheck, ESLint, 27/27 unit tests, and normal Vite production build |
| 2026-07-14 | Pages-path production build | Pass — `VITE_BASE_PATH=/busy_day/`; generated HTML/CSS asset URLs checked beneath `/busy_day/` |
| 2026-07-14 | Focused real reciprocal-exit E2E | Pass 3/3 — Chromium, Firefox, and WebKit after data-driven Feed Store spawn and cadence-independent keyboard assertion fixes |
| 2026-07-14 | Integrated visual QA | Pass — 11 unique checkpoints (all ten rooms plus ending), zero captured console/page errors; contact sheet accepted for HUD, characters/targets, exits, textures, and no blank rooms; outputs ignored/not published |
| 2026-07-14 | Previous full final-art GitHub Actions | Static/audio/types/lint/27 unit/build passed; Chromium, Firefox, and WebKit each passed 6/7, failing only the now-fixed stale reciprocal-exit assertion |
| Pending | Replacement full final-art GitHub Actions | Not complete; final-art 21/21 is not claimed |
| Pending | Complete no-shortcut gameplay, representative-device, soak, current phone performance, and hosted validation | Not yet claimed |
| 2026-07-14 | Intended release scope | 107 files / 32.71 MiB after exclusions; zero files containing the checked high-risk credential/token patterns; raw 43 references, `style_ref.png`, and visual-QA captures excluded; V1 hash/size preserved |
| 2026-07-14 | GitHub publication | Public `nacho-android/busy_day`, branch `agent/busy-day-v2`, draft PR #1 open |
| Pending | GitHub Pages release | Workflow gated to successful non-PR `main` quality/browser jobs and `VITE_BASE_PATH=/busy_day/`; merge, first deployment run, and hosted smoke remain pending |
