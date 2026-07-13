# Busy Day at the Viv V2 — Known Limitations

**Status:** evidence-based development snapshot, 2026-07-14
**Purpose:** distinguish genuine remaining work from features that merely exist in code. Nothing below should be read as a completed test claim.

A focused runtime/data review found no remaining P0/P1 progression blocker after the transition, save, spawn, collision, and input fixes. The 27 unit tests, reachability/story audits, and test-assisted Chromium full-story path agree. A full public-control playthrough has not yet been completed, so this evidence is not presented as a no-shortcut manual completion claim.

## Player-visible scope differences

### Five final room backplates are unoptimised runtime PNGs

Every gameplay location now uses a generated backplate. Feed Store, Sheep & Scales, Baboon Wing, Procedure Prep, and Coffee Shop each load a byte-identical 1672×941 PNG copy of its master. Together these five runtime files are 12,006,717 bytes (11.450 MiB). The original title and five earlier gameplay backplates remain browser-sized 1280×720 WebP files. All 11 images are eagerly preloaded.

The WebP exporter is configured for all 11 masters, but the platform execution quota refused the elevated Node command needed to render the five new outputs. Their data background keys and revised collision/exit geometry are integrated, the masters/runtime copies were visually inspected, and the post-art static radius-22 grid audit passed. Integrated browser visual/movement validation has not run.

**Impact:** the final world has consistent generated-room coverage, but initial transfer, decoding, and texture-memory cost are higher than the earlier measured build. The earlier 2.95 MB navigation sample does not represent this payload.
**Workaround:** the PNGs are functional source-quality runtime assets; players do not fall back to programmer-art rooms.
**Release action:** export browser-sized WebP versions, update the five runtime paths, and rerun build, cross-browser, runtime-collision, visual, and performance checks.

### Characters and props are runtime vector constructions

Leads, NPCs, pigs, sheep, baboons, cars, carts, equipment, and interaction markers are composed from Phaser primitives. `CharacterRig` animates idle/walk, facing, interaction, hit response, perspective, and depth, but the project does not contain final directional sprite sheets, expression portraits, or interaction atlases.

**Impact:** the paper-doll rig provides direction-specific workwear, faces, hair, glasses, facial hair, and animation, but it remains vector rather than rendered sprite art; important NPCs do not have authored walk schedules or cinematic actions.
**Workaround:** gameplay definitions and visual IDs are separate, so these assets can be upgraded without rewriting objective logic.
**Release action:** decide whether the vector look is an intentional final style or supply/verify replacement atlases and portraits.

### No pointer-to-move or pathfinding

Movement is direct through keyboard, virtual joystick, or a gamepad. There is no tap/click destination movement, A*, navmesh, or polygonal walk region.

**Impact:** touch play requires continuous joystick use, and accessibility needs that benefit from destination movement are not covered.
**Workaround:** use the large virtual joystick and Relaxed Shift.
**Release action:** either implement and test pointer navigation or keep it explicitly out of V2's supported controls.

### Cart, trolley, and car systems are abstracted

Feed-cart and pig-trolley ownership are saved flags. Carrying the pig trolley changes speed through the lead's carry factor, but no separate trolley body follows the character and no widened collision footprint is used. The six-car finale is a set of hold interactions with owner-specific Juan/Wayne dialogue, not a free spatial sliding puzzle. Each car is a collision obstacle until completed, then its runtime prop/collider is removed to open the lane.

**Impact:** the car park physically clears with a short drive-away animation and remains traversable, but cars follow authored exits rather than a player-positioned sliding system; cart/trolley transport is still less physical than the initial design proposal.
**Workaround:** prompts, props, flags, and humour communicate the state.
**Release action:** add physical transport/puzzle state only if it can be made save-safe and soft-lock-free; otherwise document this as the intentional abstraction.

### Proposed locations and side story were consolidated

The original design proposed 16 screens. V2 currently uses ten. Change Room, Pig Housing Exterior, Baboon Corridor, Utility/Loading Corridor, and Hospital Footpath/Road were merged into adjacent gameplay beats; Procedure Prep combines preparation functions. The optional “Wrong Century” dinosaur objective is not implemented.

**Impact:** the main V1-derived route is intact, but traversal is shorter and supplied dinosaur references only influence incidental visual humour/provenance.
**Workaround:** none; no unimplemented side objective is shown to the player.
**Release action:** treat new rooms/side quests as post-V2 expansion, not silent completion criteria.

## State and system limitations

### Save migration is normalization, not a version-by-version migration table

The parser accepts a legacy-shaped envelope, applies schema-2 defaults, sanitizes known values, and discards structurally invalid runs. It does not branch on every historical schema with explicit migrations.

**Impact:** future incompatible changes may reset active progress rather than migrate it precisely.
**Workaround:** schema 2 settings/profile values degrade safely to defaults.
**Release action:** introduce explicit migrations before shipping a schema 3 format.

### Audio has two buses and uncompressed sources

The UI exposes music volume, SFX volume, and mute. Ambience and UI cues share those two categories rather than independent buses. All files are uncompressed mono WAV. Runtime URLs are base-aware for static subpath builds.

**Impact:** audio is about 4.99 MiB and users cannot independently tune ambience/UI.
**Workaround:** use the existing music/SFX controls.
**Release action:** consider Opus mirrors/extra buses only after cross-browser listening and transfer tests.

### Rendering and asset lifetime are simple

The production JavaScript is one main Phaser/application chunk. All 11 runtime images are preloaded up front, including the five unoptimised PNGs described above. There is no route-specific texture bundle, LRU texture policy, DPR cap, particle pool, or runtime performance overlay.

Before the five PNGs were added, a local foreground Chromium automation sample at 1366×768 on Intel UHD 620/D3D11 measured a blank-page baseline of 47.4 FPS / 18.1 ms p95 frame time and active Tea Room play at 33.3 FPS / 36.1 ms p95. A prior same-condition active sample reported 13.5 MiB JavaScript heap. Initial navigation of that clean production preview took 1.141 seconds for 12 resources and approximately 2.95 MB encoded transfer. This is pre-final-art desktop history, not a current-payload benchmark or phone result.

**Impact:** the current small art set limits immediate risk, but decoded memory, transition latency, and long-session growth have not been measured on a mid-range phone.
**Workaround:** none needed on the inspected desktop Chrome session.
**Release action:** profile real target hardware before advertising a mobile performance target.

## Accessibility and input validation gaps

The code includes visible focus styles, keyboard-operable buttons, captions, larger text, contrast, reduced motion, safe areas, handedness, touch controls, a portrait pause overlay, and Relaxed Shift. However:

- no screen-reader pass has been recorded;
- no real iPhone, iPad, Android phone, or Android tablet pass has been recorded;
- gamepad world movement/interact/sprint/dodge is implemented but not verified with representative controllers/browsers; menus and dialogue are not currently controller-navigable;
- left/right-handed touch layouts, browser address-bar resize, notches, largest text, longest dialogue, and simultaneous joystick/action use require viewport/device evidence;
- subtitles/captions cover authored important warnings, not every ambient sound;
- no control remapping exists.

**Impact:** accessibility controls are available, but broad compatibility must not be inferred from source code alone.
**Release action:** complete the viewport, assistive-technology, touch, and gamepad matrices in the implementation checklist.

## Verification still pending

The following are release gates, not completed claims at this snapshot:

- every reciprocal exit through runtime movement, including destination position/facing;
- complete no-shortcut Mel and Josh playthroughs;
- complete Relaxed Shift/failure recovery and out-of-order interaction passes;
- representative phone, tablet, laptop, 1080p, and ultrawide viewport reviews;
- page/console/request error monitoring over a full run;
- manual listening through title, interior, animal, cath, car-park, failure, and ending audio;
- transition/memory/audio soak testing and representative-device frame-rate, transfer, memory, and decode results;
- post-final-art visual, runtime-collision, missing-asset, and 21-test cross-browser reruns after the five PNG integrations;
- verification beneath the eventual published host/subpath;
- final secret/staged-file scan, Git branch/commit/push, and pull request.

On the earlier six-art snapshot, the copied publishable source tree passed `npm ci` (141 packages), strict TypeScript, ESLint, 27/27 Vitest tests across four files, and the post-hardening production build. Its local production preview reached title, New Shift, HUD/Tea Room, one canvas, and scroll 0/0 with 12 resources, no bad HTTP responses, and no captured console/page errors. That snapshot's Playwright suite passed 7/7 in Chromium 149.0.7827.55 (5.7 minutes), 7/7 in Firefox (1.6 minutes), and 7/7 in WebKit (5.0 minutes / 304.6 seconds): 21/21 total with zero captured `console.error` or page errors. The suite covered the test-assisted room-correct full story, three physical reciprocal transition directions, save/Continue, health failure/retry, portrait/landscape state preservation with landscape touch controls, scroll lock, and seven landscape sizes. It was not a no-shortcut manual run and did not cover the other 15 exit directions.

Afterward, five generated PNG backplates and matching data geometry were integrated and visually inspected. Attempts to execute the post-art Node/Playwright verification were refused by the platform execution quota, so there is no final-art browser result to claim. This is an execution-capacity blocker, not a recorded test failure.

A post-art radius-22, 5-pixel-grid audit did pass all spawns, targets, and exits in the five revised rooms: Feed Store 10,644 reachable cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, and Coffee Shop 13,348. The optional Feed Store `dinosaur_toy` hotspot was moved from its initially unreachable position before that passing audit. The remaining collision gap is runtime/browser confirmation, not static-data reachability.

## Rights and distribution caveat

The 43 supplied images are source references and include people, locations, and incidental details. The 11 generated masters/backplates are original project outputs, but some are style-, location-, or likeness-informed derivatives. The repository does not establish consent or redistribution rights for the references or likeness-derived artwork.

**Impact:** technical readiness does not equal publication clearance.
**Workaround:** keep source references private and do not distribute them as game assets.
**Release action:** obtain the necessary permissions or replace affected generated art with references that have documented compatible rights. See `docs/ASSET_MANIFEST.md` and `LICENSE`.

## Repository and release infrastructure

- No CI workflow is present.
- The GitHub publish/yeet workflow requires local `git` and an authenticated `gh`; neither command is available in this execution environment.
- The local `.git` directory contains no usable local history, so no intentional commit can be created or pushed safely from this workspace.
- No release branch, commit SHA, remote push, deployment URL, or pull request is claimed here.
- A release-scope scan identified 102 intended files / 43.34 MiB after exclusions and found no intended file containing the checked high-risk credential/token patterns. This was a targeted check, not an exhaustive secret scanner. All 43 raw references plus `style_ref.png` are excluded; V1 remains 168,208 bytes with SHA-256 `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85`.

These are workflow limitations rather than runtime defects, but all remain part of the production completion criteria.
