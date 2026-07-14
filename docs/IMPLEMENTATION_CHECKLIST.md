# Busy Day at the Viv V2 — Implementation Checklist

**Status date:** 2026-07-15
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
- [x] Add development, release verification, audio verification, typecheck, lint, unit, dev-server E2E, built-preview E2E, visual-QA, build, preview, and art-export commands; keep the long public journey opt-in.
- [x] Organise `src/`, `public/assets/`, `art/`, `scripts/`, `tests/`, and `docs/`.
- [x] Add GitHub Actions quality/browser jobs plus a gated Pages deployment for successful non-PR `main` runs using `VITE_BASE_PATH=/busy_day/`.
- [x] Establish the repository remote and use non-force feature branches without overwriting unrelated history; V2.1 hardening uses `agent/busy-day-v2-hardening`.

## 3. Architecture and data integrity

- [x] Implement `BootScene`, `PreloadScene`, `TitleScene`, generic `LocationScene`, persistent `UIScene`, and `EndingScene` registration.
- [x] Keep authoritative active progress/settings/profile in `GameSession`, not mutable production globals.
- [x] Expose the frozen `window.__busyDayTest` adapter only in development/test builds.
- [x] Define typed location, spawn, exit, character, direction, interaction, objective, dialogue, settings, save, audio, and failure models.
- [x] Keep lead gameplay statistics separate from the complete character renderer contract: vector/sheet/atlas mode, assets, frames, named animation timing, origin/scale, footprint, portraits/expressions, and voice metadata.
- [x] Store location bounds, spawns, exits, obstacles, interactions, NPCs, music, perspective, and background keys as structured data.
- [x] Store objective sequence, targets, flags, kit, rewards, hints, checkpoints, and dialogue as structured data.
- [x] Validate duplicate spawn/interaction/objective IDs.
- [x] Validate spawn bounds and fixed-obstacle occupancy.
- [x] Validate every exit destination, destination spawn, and reciprocal route.
- [x] Validate that each objective location exists and each target interaction ID exists globally.
- [x] Audit all 18 production objectives: every target is in its declared location and every required flag is granted earlier.
- [x] Stop development boot with a readable diagnostic if world validation fails; run the exhaustive grid audit in unit/release gates without adding a production startup long task.
- [x] Re-audit Car Park with all six car obstacles and after every sequential removal: both spawns/exits and every hotspot remain reachable at player radii 20 and 22.
- [x] Run conservative collision-safe grid reachability across all ten rooms for every spawn, objective interaction, NPC, and exit; move Vu from the unreachable Feed Store position found by the validator.
- [x] Rerun a radius-22, 5-pixel-grid audit after final-art geometry changes: Feed Store 10,644 cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, Coffee Shop 13,348; all spawns/targets/exits pass after moving the unreachable optional `dinosaur_toy`.
- [x] Automate same-room objective/flag-order/reachability checks in the boot validator and unit suite.
- [x] Validate dialogue speaker/portrait/effect references and every runtime image/audio definition against typed manifests and files on disk.
- [x] Add explicit ordered-dependency and cycle validation, plus route-unlock simulation at every objective.

## 4. Implemented story route

- [x] Select Mel or Josh with meaningfully different stats.
- [x] Start a new shift at 06:45 in the Tea Room.
- [x] Establish Sally's board-first instruction and Juan's coffee promise through opening dialogue.
- [x] Complete the shift-board, route-console restoration, and feed-cart objectives.
- [x] Feed three pigs, three sheep, and three baboons individually.
- [x] Calibrate the baboon-wing interlock after feeding, then collect three distinct samples.
- [x] Complete pig preparation and anaesthesia support with Alan/Luther present.
- [x] Load, weigh, and deliver the pig trolley through ordered flags/prerequisites.
- [x] Complete cath handover, monitor synchronisation, and cardiac-support console objectives.
- [x] Complete sheep shearing.
- [x] Clear six car targets with owner-specific Juan/Wayne handling and a Wayne dialogue choice.
- [x] Complete Juan's coffee target, profile completion, final dialogue, and ranked ending in the data/session path.
- [x] Include Ross's corridor trap and Dodge recovery.
- [x] Include Thanh's moving vehicle, captioned horn, impact feedback, and health damage.
- [x] Give all six cars collision footprints and remove each completed car prop/collider to open the lane.
- [x] Include visible Wayne pressure, standard/Relaxed accumulation, dialogue effects, and Wayne failure.
- [x] Include health failure, checkpoint retry, restart shift, and title recovery.
- [x] Unit-test the full ordered 18-objective/31-target state path to completion.
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
- [x] Traverse all 18 exit directions in focused Chromium runs using real keyboard crossing after collision-safe setup; assert destination location, named spawn, facing, and no released-input drift.
- [x] Verify every spawn/NPC/target/exit approach remains statically reachable; all rooms render in integrated visual QA; repeat the expanded exit suite successfully in Chromium, Firefox, and WebKit workflow `29348227739`.

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
- [x] Add lead-specific smooth acceleration/deceleration and feed collision-resolved velocity back into animation/footsteps.
- [ ] Add pointer/tap-to-move and pathfinding, or formally exclude them from the supported control set.
- [ ] Add separate feed-cart/pig-trolley bodies, animation, and collision footprints; current carrying is flag/speed based.
- [x] Add data-defined foreground occlusion crops/depth gates using matching generated-background pixels.
- [ ] Visually verify every authored behind/in-front traversal in motion.
- [x] Add seven short collision-safe NPC patrols with awareness/reactions; broader schedules remain deferred.
- [x] Validate each moving NPC placement, waypoint, and direct patrol segment against fixed collision geometry.
- [ ] Verify collision and transition behaviour manually in every room, including held input and narrow approaches.

## 7. Dialogue, objectives, interactions, and UI

- [x] Support speaker, expression state, wrapped multiline text, optional typewriter, reveal-all, advance, and queued sequences.
- [x] Support keyboard and pointer/touch dialogue advancement paths.
- [x] Support gamepad D-pad/stick focus, accept, back, Start/pause, dialogue advancement/choices, sliders/selects, and title/menu overlays.
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
- [x] Add final rendered dialogue portraits for Mel, Josh, Sally, Juan, Alan, Dhanya, Ross, and Wayne; keep expression presentation data-driven so dedicated redraws can be added later.
- [x] Validate the longest authored dialogue at large text in the phone Chromium hardening viewport with focus and horizontal-overflow assertions.
- [ ] Validate every menu at normal/large text across the complete supported viewport matrix.
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
- [x] Generate, optimise, visually inspect, manifest, and integrate final dialogue portraits for eight key speakers through `CharacterVisualDefinition`.
- [x] Retain and manifest the generated Mel/Josh directional source separately from runtime art; do not claim it as a packed/approved atlas.
- [ ] Approve/integrate final lead/NPC sprite atlases, or explicitly approve the procedural vector character style. A generated Mel/Josh directional source sheet exists but is not yet approved as a runtime atlas.
- [x] Implement data-defined foreground occlusion crops from matching generated backplate pixels.
- [ ] Generate/approve dedicated editable foreground layers, transition/loading art, ending art, and full prop/VFX/icon set.
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

- [x] Use a V2-only storage key and schema version 3 envelope.
- [x] Persist lead, run state, objectives/targets/flags, meters, rewards, checkpoint/failure, settings, and profile.
- [x] Sanitize/clamp untrusted saves and reject structurally incomplete active runs.
- [x] Migrate deployed schema-two objective progress by stable IDs across the three V2.1 insertions and normalize legacy-shaped settings/profile data into schema-three defaults.
- [x] Preserve portable settings/profile values but reject incompatible active progress from unknown future schemas.
- [x] Show Continue only for an unfinished run.
- [x] Unit-test save defaults, malformed JSON, settings clamping, legacy-shaped normalization, schema-two objective migration, deep clone, persist/load/clear, invalid-run rejection, character stamina limits, inconsistent-progress repair, and terminal finished-state derivation.
- [x] Unit-test transition persistence/reload and checkpoint rollback of targets/objectives/flags/rewards.
- [x] Preserve profile/settings on Restart Shift and clear V2 state only after Reset confirmation.
- [x] Persist movement on a throttled 1.2-second interval and when the page is backgrounded.
- [x] Apply Relaxed Shift setting changes to the active unfinished run as well as future runs.
- [x] Add and unit-test the explicit schema-two-to-three migration before shipping the V2.1 objective order.
- [ ] Add another explicit migration before any future incompatible schema change.
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
- [x] Use the Canvas renderer on Safari/iOS, including iPad desktop-site browser tokens, to avoid a WebKit WebGL context-reclamation startup failure; retain automatic renderer selection elsewhere.
- [ ] Verify small/large iPhone, Android phone, tablet, laptop, 1080p, and ultrawide visual layouts from captured screenshots.
- [ ] Test real iPhone/iPad/Android hardware, address-bar resize, high DPI, notches, and rounded corners.
- [x] Implement gamepad title/menu/dialogue navigation and pass a synthetic Chromium controller path through lead selection, opening dialogue, pause, and resume.
- [ ] Test representative physical controllers/browsers and disconnect/reconnect.
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
- [x] Complete Node 24 final-art PR workflow `29297017450` on commit `bf52920`: all clean-install gates and Playwright 21/21 passed; exact timings are in the verification log.
- [x] Verify post-transition keyboard movement in the reciprocal-exit test across Chromium, Firefox, and WebKit with a cadence-independent assertion.
- [x] Add ordinary-input public-journey coverage for movement, sprint, dodge, hold interaction, exits, dialogue, menus, save/reload, and checkpoint recovery; keep it opt-in because it is long-running.
- [x] Execute the Tea Room → Main Hall → Feed Store → Main Hall reciprocal route and assert data-driven destination spawn/location in Chromium, Firefox, and WebKit (3/3 focused runs).
- [x] Execute all remaining exit directions in three focused Chromium groups and assert destination, named spawn, facing, and neutral-input stability.
- [x] Execute health failure/retry and save/reload/Continue in Chromium.
- [x] Add and execute focused Chromium Wayne failure/retry, pause/restart/reset, settings/audio persistence, touch/dialogue, synthetic-gamepad, representative barrier, and locked-gate tests.
- [x] Run the complete expanded dev-server suite in one consolidated invocation and repeat it in Chromium, Firefox, and WebKit CI: 16/16 per engine in workflow `29348227739`.
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
- [x] Preload only title/Tea Room backplates; load later rooms on entry and retain a three-location decoded-background LRU (roughly four decoded backplates including title).
- [x] Clear scene-local prop/NPC maps during scene shutdown.
- [x] Measure a pre-final-art local desktop first navigation, active frame time, and JavaScript heap sample; clearly retain its historical desktop-automation scope.
- [ ] Measure bundle parse, decoded texture/audio memory, transition latency, and long-session behaviour.
- [ ] Measure on a representative mid-range phone; do not substitute desktop emulation for a device claim.
- [ ] Soak repeated transitions for memory, event-listener, tween, and audio growth.
- [x] Implement room-level lazy background loading and texture unloading through the three-location LRU.
- [x] Retry transient lazy-background failures twice, then return safely to title with Continue progress preserved.
- [ ] Decide whether route-split JavaScript, DPR caps, or compressed audio are required from representative measurements.
- [x] Run an earlier six-art copied publishable-source clean-directory `npm ci` followed by typecheck, lint, unit, and build; cross-browser E2E was validated separately in the primary working tree.
- [x] Serve that pre-final-art clean-install `dist/` locally and verify title, New Shift, HUD/Tea Room, one canvas, scroll lock, all 12 initial resources, HTTP responses, and console/page errors.
- [x] Pass post-optimization local strict typecheck, ESLint, 27/27 unit tests, the normal Vite build, and a `/busy_day/` Pages-path Vite build; inspect the generated HTML/CSS URLs beneath `/busy_day/`.
- [x] Repeat the final V2.1 gates from a clean `npm ci` and pass the production-preview suite 2/2 in Chromium, Firefox, and WebKit in workflow `29348227739`.
- [x] Verify hosted Continue plus built JS/CSS, title WebP, and title WAV paths beneath `/busy_day/`; cache-busted requests returned HTTP 200 with correct types.

## 14. Documentation and licensing

- [x] `README.md` includes premise, title artwork, setup, commands, controls, mobile/accessibility notes, save behaviour, architecture links, deployment notes, and rights caveats.
- [x] `docs/ARCHITECTURE.md` documents composition, data/state flow, collision, UI, audio, save, assets, tests, and replacement workflows.
- [x] `docs/V2_GAME_DESIGN.md` describes the actual ten-location/18-objective/31-target implementation and explicitly lists deferred scope.
- [x] `docs/KNOWN_LIMITATIONS.md` records user impact, workaround/release action, and pending validation.
- [x] `CHANGELOG.md` records V2 additions, consolidation, preservation, and limitations.
- [x] `LICENSE` applies MIT to original code/docs, preserves audio CC0, and excludes supplied/likeness-derived assets pending rights confirmation.
- [x] `docs/AUDIO_MANIFEST.md` documents all 26 audio files and generator/verification method.
- [x] Complete `docs/ASSET_MANIFEST.md` for the current 43 references and 11 generated master/runtime pairs.
- [x] Publish `docs/REFERENCE_INVENTORY.json` while keeping the 43 raw reference files and `style_ref.png` local-only.
- [x] Record the current local desktop performance sample with explicit device/evidence limits.
- [x] Record PR #1 merge SHA `54499b368d566f3fa4e7da1af3e7a06ed1942b2f` and successful Node 24 main workflow `29298026940`.
- [x] Record Pages deployment `5433749633`, production URL, workflow/HTTPS/main-only policy, and hosted asset/Continue smoke evidence.

## 15. Repository publication

- [x] Verify the historical V2.0 release scope after exclusions: 107 files / 32.73 MiB.
- [x] Verify the V2.1 release scope after exclusions: 141 intended files / 50.27 MiB; exclude dependencies, builds, reports, caches, session data, all 43 raw references, `style_ref.png`, and ignored visual-QA captures.
- [x] Scan intended release-file contents for selected high-risk credential/token patterns: zero matching files. This targeted check is not an exhaustive credential scanner.
- [x] Exclude supplied source references from publication because redistribution rights are undocumented.
- [x] Create intentional commits without force-pushing unrelated history.
- [x] Push branch `agent/busy-day-v2` to `nacho-android/busy_day`.
- [x] Open and merge PR #1 with summary, test evidence, limitations, and rights caveats.
- [x] Push `agent/busy-day-v2-hardening`, open PR #2, and pass clean PR workflow `29348227739` on implementation head `61cfdb8`.
- [x] Record merged `main` SHA `54499b368d566f3fa4e7da1af3e7a06ed1942b2f`.
- [x] Add a gated Pages Actions deployment for successful non-PR `main` runs with `VITE_BASE_PATH=/busy_day/`.
- [x] Pass main workflow `29298026940`, deploy Pages as `5433749633`, and complete the hosted HTTP/in-app smoke.

## 16. Non-negotiable release gates

- [x] V1 closely reviewed; all supplied references catalogued; V1 currently hash-preserved.
- [x] Modern modular architecture, strict TypeScript, and data-driven world/story/state are present.
- [x] Ten purposeful locations and the complete 18-objective/31-target state path are implemented.
- [x] Final original audio pack is generated, integrated, and documented.
- [ ] Final visual scope is approved and every production asset is manifested/rights-cleared.
- [ ] Full story is manually playable opening-to-coffee for both leads without shortcuts or blockers.
- [x] Expanded hardening covers every exit/spawn, representative barriers, Wayne failure, restart/reset, save/continue, touch/dialogue, synthetic controller, orientation/viewports, and the test-assisted ending in all three CI engines.
- [ ] Touch, orientation, viewports, accessibility options, and gamepad paths are validated in representative environments.
- [x] Deployed V2.0 Chromium, Firefox, and WebKit suites passed their then-current 21/21 with error hooks active: 7/7 in each engine on main workflow `29298026940`.
- [x] V2.1 expanded dev-server and production-preview suites pass in Node 24 workflow `29348227739`: 48/48 dev and 6/6 preview.
- [ ] Visual, audio, and performance passes are complete with measured findings.
- [x] Post-optimization local strict typecheck, lint, 27/27 unit tests, normal build, and `/busy_day/` build succeed.
- [x] Repeat final-art release/audio/type/lint/27-unit/build gates after clean `npm ci` under Node 24 in main workflow `29298026940`.
- [x] Repeat V2.1 release/audio/type/lint/49-unit/build gates after clean `npm ci` under Node 24 in PR workflow `29348227739`.
- [x] Final-art clean production bundle passes local Chromium/WebKit preview reruns and 2/2 per engine in final three-engine CI.
- [x] V2.0 PR #1 is merged to `main`, its Pages deployment succeeded, and its production URL passed hosted smoke.
- [x] Commit/push V2.1, open PR #2, and pass its clean Node 24 PR workflow.
- [ ] Merge PR #2, pass the V2.1 main workflow/Pages deployment, and repeat hosted smoke against the deployed SHA.

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
| 2026-07-14 | V2.1 working-tree `scripts/verify_audio.py` rerun | Pass — 26 assets / 4.99 MiB; PCM headers, durations, payloads, peaks, DC offset, and loop seams valid. This is not a listening test. |
| 2026-07-14 | V1 SHA-256 recheck | Match — `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85` |
| 2026-07-14 | Car-park collision/reachability audit | Pass — 13,975-cell initial component; both exits and six hotspots reachable with radius 20/22; every completion state remains connected |
| 2026-07-14 | Pre-final-art production-data reachability/story audit | Pass — ten rooms, 19 spawns, all required targets/exits reachable at 5-pixel grid; target rooms and prerequisite flag order coherent before five-room geometry revision |
| 2026-07-14 | Post-final-art radius-22 / 5-pixel-grid audit | Pass — Feed Store 10,644 cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, Coffee Shop 13,348; all spawns/targets/exits reachable after moving `dinosaur_toy` |
| 2026-07-14 | Runtime art optimization | Pass — all 11 backgrounds are 1280×720 WebP totaling 1,818,586 bytes (1.734 MiB); five retired 12,006,717-byte PNGs replaced, saving 11,180,271 bytes |
| 2026-07-14 | Post-optimization local static/unit/build gates | Pass — strict typecheck, ESLint, 27/27 unit tests, and normal Vite production build |
| 2026-07-14 | Pages-path production build | Pass — `VITE_BASE_PATH=/busy_day/`; generated HTML/CSS asset URLs checked beneath `/busy_day/` |
| 2026-07-14 | Focused real reciprocal-exit E2E | Pass 3/3 — Chromium, Firefox, and WebKit after data-driven Feed Store spawn and cadence-independent keyboard assertion fixes |
| 2026-07-14 | Integrated visual QA | Pass — 11 unique checkpoints (all ten rooms plus ending), zero captured console/page errors; contact sheet accepted for HUD, characters/targets, exits, textures, and no blank rooms; outputs ignored/not published |
| 2026-07-14 | Final-art PR workflow [`29297017450`](https://github.com/nacho-android/busy_day/actions/runs/29297017450), commit [`bf52920`](https://github.com/nacho-android/busy_day/commit/bf52920), Node 24 | Pass — clean `npm ci`; release/audio/type/lint; 27/27 unit; build; Chromium 7/7 (4.8m), Firefox 7/7 (29.2s), WebKit 7/7 (1.3m), 21/21 total; Pages correctly skipped on PR |
| 2026-07-14 | V2.1 focused Chromium exit groups | Pass — all 18 authored directions crossed with real keyboard movement after collision-safe setup in three groups (1–6, 7–12, 13–18); destination, named spawn, facing, and no drift asserted. This is grouped evidence, not the final consolidated/three-engine run. |
| 2026-07-14 | V2.1 focused Chromium hardening paths | Pass — representative barriers/locked gate, Wayne failure/checkpoint reload, pause/restart, settings/reset persistence, touch hold-use/large-text dialogue, and synthetic controller title/dialogue/pause/resume each passed their focused run. |
| 2026-07-14 | V2.1 test-assisted full story | Pass — 18 objectives / 31 targets across their authored rooms, ending shown in 3.1 minutes; travel/interactions use the guarded test adapter and do not constitute a public-control playthrough. |
| 2026-07-14 | V2.1 consolidated Chromium suite | Pass — 16/16 in one 16.5-minute run: core journey, 18 exits, barriers/locked route, Wayne recovery, pause/restart/reset, settings, touch/dialogue, synthetic controller, orientation, and seven viewport classes. |
| 2026-07-14 | V2.1 built-preview Chromium suite | Pass — 2/2 in 1.5 minutes: hashed production assets, no production test adapter, real keyboard movement, save/refresh/Continue, non-preloaded Main Hall art, and recovery after two deliberately aborted lazy-art requests. |
| 2026-07-14 | V2.1 integrated visual QA | Pass — 11 checkpoints (all ten rooms plus ending), zero captured browser errors; contact sheet and production title/opening generated portrait manually inspected. |
| 2026-07-14 | Opt-in public-input journey attempt | Incomplete — Mel reached the visible shift-board prompt, then shared-host software WebGL frame starvation prevented a reliable hold update; stopped after 12.2 minutes at objective 1. Josh was not run. No completion or progression-blocker claim. |
| 2026-07-14 | V2.1 production preview performance, Playwright Chromium 149 / ANGLE SwiftShader, 1366×768 | 693 ms local navigation; 15 resources / 0.73 MiB reported transfer; 12.1 MiB JS heap; title 9.1 FPS / 149.9 ms p95; active Tea Room 4.5 FPS / 250 ms p95. Software-WebGL host evidence only, not phone or hardware-GPU performance. |
| Pending | Complete no-shortcut Mel/Josh, physical-device/controller/screen-reader, audio-listening, soak/current-phone performance, and rights review | Not yet claimed |
| 2026-07-14 | Historical V2.0 intended release scope | 107 files / 32.73 MiB after exclusions; zero files containing the checked high-risk credential/token patterns; raw 43 references, `style_ref.png`, and visual-QA captures excluded; V1 hash/size preserved. Current V2.1 scope is recorded below. |
| 2026-07-15 | V2.1 final pre-commit static/unit/build gates | Pass — typecheck; ESLint; Vitest 49/49 across seven files; V1/reference/art/audio/docs/credential release checks; Pages-path production build at 1,321.14 kB JS / 358.08 kB gzip. |
| 2026-07-15 | V2.1 staged-tree `npm run verify:release` | Pass — V1 size/hash; 43-reference inventory/integrity/exclusion; 11 backgrounds; eight portraits; 26 WAVs; manifest/docs/links; file-size and selected credential-pattern gates; 141 intended files / 50.27 MiB. |
| 2026-07-15 | V2.1 cross-engine regression rechecks | Pass locally — Firefox full-story 1/1; WebKit full story, phone touch, and gamepad 3/3 sequentially; WebKit exit directions 1–6 plus phone touch 2/2; Chromium and WebKit built previews 2/2 each after replacing pre-dialogue/retry-count timing samples with completion waits. |
| 2026-07-15 | V2.1 final PR workflow [`29348227739`](https://github.com/nacho-android/busy_day/actions/runs/29348227739), commit [`61cfdb8`](https://github.com/nacho-android/busy_day/commit/61cfdb8df7df211af7ed7d0516865ef596114dd0) | Pass — clean `npm ci`; release/audio/type/lint; 49/49 unit; build; Chromium dev 16/16 + preview 2/2, Firefox 16/16 + 2/2, WebKit 16/16 + 2/2; 48/48 dev and 6/6 preview total; Pages correctly skipped on PR. |
| 2026-07-14 | Main merge and workflow | PR #1 merged as `54499b368d566f3fa4e7da1af3e7a06ed1942b2f`; Node 24 workflow `29298026940` passed release/audio/type/lint/27-unit/build and Chromium/Firefox/WebKit 7/7 each (21/21) |
| 2026-07-14 | GitHub Pages deployment | Pass — deployment `5433749633`, SHA/ref/state matched merge/`main`/success; workflow build type, HTTPS, main-only policy; https://nacho-android.github.io/busy_day/ |
| 2026-07-14 | Hosted HTTP and in-app smoke | Pass — cache-busted index and hashed JS/CSS/title WebP/title WAV returned 200/correct types; no raw `/src/main.ts`; title → New Shift → Tea Room → refresh → Continue resumed Tea Room objective; zero captured warning/error logs |
