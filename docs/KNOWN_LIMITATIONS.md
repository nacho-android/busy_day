# Busy Day at the Viv V2 — Known Limitations

**Status:** evidence-based V2.1 development snapshot, 2026-07-15

**Purpose:** distinguish implemented behaviour, recorded evidence, and genuine remaining release work. Nothing below should be read as a completed test claim unless the evidence is stated explicitly.

Static world/asset validation, unit coverage, focused Chromium hardening runs, and the test-assisted 18-objective/31-target completion path have not exposed a remaining P0/P1 progression blocker. A full public-control playthrough has not completed, so this evidence is not presented as a no-shortcut manual completion claim.

## Player-visible scope differences

### In-world characters and props use the vector renderer

Leads, NPCs, animals, cars, carts, equipment, and interaction markers are composed from Phaser primitives. `CharacterRig` can execute vector, sprite-sheet, or atlas definitions through data-defined assets, frames, named animations, timing, origin/scale, collision footprint, portraits, and voice metadata, but the shipped world definitions deliberately select vector mode.

Eight principal speakers have generated rendered dialogue portraits. A generated Mel/Josh directional source sheet is retained in `art/generated-sources/`, but it is not a packed, approved, or runtime-loaded animation atlas.

**Impact:** the paper-doll rig provides direction-specific workwear, faces, hair, glasses, facial hair, idle/walk/interaction/hit animation, perspective, and depth, but it remains vector rather than rendered sprite art. Seven NPCs have short patrols and proximity reactions; there are no long-form schedules or cinematic character atlases.

**Workaround:** gameplay definitions and visual definitions are separate, so sheets, atlases, portraits, timing, footprints, and voice metadata can change without rewriting objectives.

**Release action:** either approve the vector world look as intentional or pack, integrate, and verify replacement atlases. Dedicated expression portraits can independently replace the current neutral portraits plus CSS-expression treatment.

### No pointer-to-move or pathfinding

Movement is direct through keyboard, virtual joystick, or gamepad. There is no tap/click destination movement, runtime A*, navmesh, or polygonal walk region. The static test validator does use a conservative grid search to prove authored approach reachability; that is not a player movement system.

**Impact:** touch play requires continuous joystick use, and accessibility needs that benefit from destination movement are not covered.

**Workaround:** use the large virtual joystick and Relaxed Shift.

**Release action:** either implement and test pointer navigation or keep it explicitly outside the supported V2 controls.

### Cart, trolley, and car systems are abstracted

Feed-cart and pig-trolley ownership are saved flags. Carrying the pig trolley changes speed through the lead's carry factor, but no separate trolley body follows the character and no widened collision footprint is used. The six-car finale uses hold interactions with owner-specific Juan/Wayne dialogue rather than a free spatial sliding puzzle. Each car is a collision obstacle until completed, then its runtime prop/collider is removed to open the lane.

**Impact:** the car park physically clears through short drive-away animations, but cars follow authored exits rather than player-positioned paths; cart/trolley transport remains less physical than the early design proposal.

**Workaround:** prompts, props, flags, and humour communicate the state.

**Release action:** add physical transport only if it remains save-safe and soft-lock-free; otherwise retain this intentional abstraction.

### Proposed locations and side story were consolidated

The early design proposed 16 screens; V2 uses ten purposeful areas. Change Room, Pig Housing Exterior, Baboon Corridor, Utility/Loading Corridor, and Hospital Footpath/Road were merged into adjacent beats, while Procedure Prep combines preparation functions. The optional “Wrong Century” dinosaur objective is not implemented.

**Impact:** the V1-derived route and three V2.1 complications are intact, but traversal is shorter and supplied dinosaur references only influence incidental visual humour/provenance.

**Release action:** treat new rooms and side quests as later expansion, not silent completion criteria.

## State and system limitations

### Future save schemas reset incompatible active progress

The current envelope is schema 3. The parser has an explicit schema-two objective-ID table that inserts the three V2.1 prerequisites coherently, then sanitizes values and reconstructs objective prefix, targets, flags, rewards, level, and checkpoint. Legacy-shaped settings/profile data normalizes through current defaults, while structurally invalid active runs are discarded. A future unknown schema preserves sanitized settings/profile values but deliberately drops its incompatible active run.

**Impact:** opening a newer save in an older cached V2.1 client cannot corrupt or silently downgrade it, but that client cannot continue the newer active run.

**Workaround:** refresh to the current deployment; deployed schema-two progress and legacy-shaped settings/profile values migrate or degrade safely.

**Release action:** add and test an explicit migration before any future objective-order or save-shape change.

### Audio has two buses and uncompressed sources

The UI exposes music volume, SFX volume, and mute. Ambience and UI cues share those two categories rather than independent buses. All 26 files are original mono PCM WAVs totaling about 4.99 MiB. Runtime URLs are base-aware for static subpath builds.

**Impact:** users cannot tune ambience/UI independently, and compressed mirrors could reduce transfer.

**Workaround:** use the existing music/SFX controls.

**Release action:** consider Opus mirrors or extra buses only after cross-browser listening and transfer tests. No manual listening pass is claimed.

### Rendering lifetime is bounded but still needs device profiling

The production JavaScript remains one main Phaser/application chunk. The 11 optimized 1280×720 WebP backgrounds total 1,818,586 bytes (1.734 MiB), but only title and Tea Room load up front; later rooms load on entry through a three-location decoded-background LRU. With title retained, the normal decoded backplate ceiling is roughly four textures rather than eleven. Browser HTTP caching still avoids repeated transfer. There is no route-split JavaScript chunk, DPR cap, particle pool, or runtime performance overlay.

A pre-final-art Chromium automation sample at 1366×768 on Intel UHD 620/D3D11 measured a blank-page baseline of 47.4 FPS / 18.1 ms p95 and active Tea Room play at 33.3 FPS / 36.1 ms p95. A prior same-condition sample reported 13.5 MiB JavaScript heap. Initial navigation of that historical production preview took 1.141 seconds for 12 resources and approximately 2.95 MB encoded transfer. The payload and loading policy have changed, so these are desktop history rather than current-build or phone results.

The V2.1 production preview was also sampled at 1366×768 in Playwright Chromium 149: 693 ms local navigation, 15 resources, 0.73 MiB reported transfer, and 12.1 MiB JavaScript heap before and during Tea Room play. That shared worker exposed only ANGLE/SwiftShader software WebGL; it produced 9.1 FPS on the title and 4.5 FPS during movement, matching the public-journey frame starvation. Those frame rates characterize the constrained automation host, not hardware-accelerated desktop or phone performance.

**Impact:** decoded memory and local transfer are now bounded more tightly, but current hardware-accelerated transition latency, long-session growth, and representative phone performance remain unmeasured.

**Release action:** profile real target hardware before advertising a mobile performance target.

## Accessibility and input validation gaps

The code includes visible focus styles, keyboard-operable buttons, captions, larger text, contrast, reduced motion, safe areas, handedness, touch controls, a portrait pause overlay, Relaxed Shift, and controller navigation. However:

- no screen-reader pass has been recorded;
- no real iPhone, iPad, Android phone, or Android tablet pass has been recorded;
- gamepad world controls and overlay focus/accept/back/Start navigation are implemented; a synthetic Chromium test covers title selection, opening dialogue, pause, and resume, but representative physical controllers, browsers, and disconnect/reconnect remain unverified;
- automated Chromium checks cover left-handed touch movement/hold-use, large text, and longest-dialogue containment, but browser address-bar resize, real notches, physical-device ergonomics, and simultaneous multi-touch require device evidence;
- captions cover authored important warnings, not every ambient sound;
- control remapping is not implemented.

**Impact:** accessibility controls are available, but broad compatibility must not be inferred from source alone.

**Release action:** complete the physical touch, hardware controller, and assistive-technology matrices in the implementation checklist.

## Recorded automated evidence and pending verification

The deployed V2.0 baseline passed its recorded release/audio/type/lint/27-unit/build gates and Chromium/Firefox/WebKit 7/7 each (21/21) in main workflow [`29298026940`](https://github.com/nacho-android/busy_day/actions/runs/29298026940). The real Tea Room → Main Hall → Feed Store → Main Hall route passed in all three engines. Its integrated QA captured every room plus the ending without console/page errors, and the inspected contact sheet passed HUD, actor/target, exit, texture, and blank-room review.

During V2.1 hardening, a consolidated Chromium run passed 16/16 in 16.5 minutes: all 18 authored exit directions, barriers, locked routing, Wayne failure/checkpoint recovery, pause/restart/reset, persisted settings, touch hold-use, longest-dialogue containment, synthetic controller UI, orientation/viewports, and a test-assisted 18-objective/31-target ending. Node 24 PR workflow [`29348227739`](https://github.com/nacho-android/busy_day/actions/runs/29348227739) then passed the clean static/unit/build gate, 48/48 expanded dev-server tests, and 6/6 built-preview tests across Chromium, Firefox, and WebKit. The preview path covers hashed assets, production-only boundaries, real keyboard movement, save/refresh/Continue, a non-preloaded room, and recovery after two deliberately aborted lazy-art requests.

The opt-in public-input harness uses normal movement, exits, interaction holds, menus, dialogue, save/reload, and checkpoint recovery rather than state mutation. Its recorded Mel attempt reached the visible shift-board prompt but was stopped after shared-host software WebGL stopped supplying reliable update frames during the hold; Josh was not run. This environment-limited attempt neither completes the public-control gate nor establishes a game progression blocker.

Still pending:

- complete no-shortcut public-input Mel and Josh playthroughs in a frame-stable environment;
- representative physical phone/tablet, laptop, 1080p, and ultrawide review beyond emulated viewports;
- full-run request/page/console monitoring through public controls;
- manual listening through title, facility, animal, cath, car-park, failure, and ending cues;
- transition/memory/audio soak and current-device frame-rate, transfer, memory, and decode results;
- physical touch, hardware-controller, and screen-reader validation.

The conservative world validator now proves collision-safe approaches for every spawn, objective interaction, NPC, and exit. It also checks dependency order/cycles, route unlock timing, reciprocal exits, dialogue identities, and runtime asset references, and found the formerly unreachable Feed Store NPC placement. Static geometry does not model transient hazards, frame pacing, or physical-input ergonomics.

## Rights and distribution caveat

The 43 supplied images are local-only source references and include people, locations, and incidental details. They are excluded from the published repository and catalogued in [`REFERENCE_INVENTORY.json`](REFERENCE_INVENTORY.json). Generated backplates and portraits are original project outputs, but some are style-, location-, or likeness-informed derivatives. The repository does not establish consent, publicity, or redistribution rights for the references or likeness-derived artwork.

**Impact:** technical readiness does not equal publication clearance.

**Workaround:** keep source references private and do not distribute them as game assets.

**Release action:** obtain the necessary permissions or replace affected generated art with inputs that have documented compatible rights. See `docs/ASSET_MANIFEST.md` and `LICENSE`.

## Repository and release infrastructure

- Repository: [`nacho-android/busy_day`](https://github.com/nacho-android/busy_day)
- Deployed V2.0 baseline: [`54499b368d566f3fa4e7da1af3e7a06ed1942b2f`](https://github.com/nacho-android/busy_day/commit/54499b368d566f3fa4e7da1af3e7a06ed1942b2f), merged through [PR #1](https://github.com/nacho-android/busy_day/pull/1)
- Baseline main workflow: [`29298026940`](https://github.com/nacho-android/busy_day/actions/runs/29298026940), success under Node 24 with its then-current 21/21 Playwright tests
- Current V2.1 static scope: `npm run verify:release` passed at 141 intended files / 50.27 MiB after exclusions, with no selected high-risk credential-pattern match. All 43 raw references plus `style_ref.png` remain local-only; V1 remains 168,208 bytes with SHA-256 `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85`.
- Pages baseline: [production URL](https://nacho-android.github.io/busy_day/), deployment `5433749633`, workflow build type, HTTPS, main-only policy; SHA/ref/state matched `54499b3`/`main`/`success`.

Repository, baseline CI/deployment, and hosted V2.0 smoke are complete. V2.1's integrated PR gates are green; merge/main workflow, Pages deployment, and hosted smoke remain before publication. Its genuine manual gameplay/device/audio/performance/rights limitations are listed above.
