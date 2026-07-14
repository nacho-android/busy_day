# Busy Day at the Viv V2 — Architecture

**Status:** implementation-aligned snapshot, 2026-07-14
**Runtime:** Vite 8 · TypeScript 6 (strict) · Phaser 3.90 · DOM/CSS interface

## Design priorities

The V2 codebase keeps the story and content definitions replaceable without returning to V1's single large HTML/script file. Authoritative run state lives in one service; Phaser owns the world canvas; the DOM owns menus, dialogue, accessibility presentation, and touch input. Location, character, objective, and save definitions are typed and validated before a shift starts.

The implementation deliberately uses a single generic `LocationScene` for all ten areas. Adding a room usually means adding data and art rather than copying scene logic.

```mermaid
flowchart LR
  input["Keyboard · touch · gamepad"] --> ui["GameUI DOM controller"]
  input --> location["LocationScene"]
  ui --> session["GameSession"]
  location --> session
  story["story.ts"] --> session
  locations["locations.ts"] --> location
  characters["characters.ts"] --> location
  session --> save["saveStore · localStorage"]
  session --> ui
  location --> audio["AudioDirector"]
  ui --> audio
  location --> phaser["Phaser canvas"]
  ui --> dom["HUD · dialogue · menus"]
```

## Startup and scene lifecycle

`src/main.ts` is the composition root. It creates one 1280×720 Phaser game using FIT scaling, four active input pointers, gamepad input, and a 60 fps target.

The registered scene order is:

1. `BootScene` runs `validateWorldGraph()`. Invalid spawns, exits, objective targets, or duplicate IDs stop startup with a readable error.
2. `PreloadScene` shows DOM loading progress and eagerly loads all 11 generated 1280×720 WebP backgrounds. A required-image failure stops scene startup.
3. `TitleScene` renders the generated title backplate and hands menus to `GameUI`.
4. `LocationScene` renders any current location from `RunState`, including backdrop, obstacles, interactions, NPCs, character, collision, movement, hazards, exits, and music.
5. `UIScene` refreshes the DOM HUD at 10 Hz while the location scene is active.
6. `EndingScene` is registered as an ending surface; the current completion path presents the DOM ending from `LocationScene` after final dialogue.

Scene transitions update `GameSession` first, then restart `LocationScene` at a named destination spawn. A transition lock and 750 ms entry cooldown prevent held movement from immediately bouncing through a reciprocal exit.

## Data model

### Locations

`src/data/locations.ts` exports one `LocationDefinition` per `LocationId`. Each definition contains:

- stable location ID, display name, theme, music cue, optional generated background key;
- a rectangular walkable bound;
- named spawn points with facing;
- exit rectangles with destination location/spawn and optional required flag;
- rectangular fixed obstacles;
- interactions with verb, radius, hold duration, prerequisite, response, and prop type;
- NPC placement, identity, role, line, and visual ID;
- perspective interpolation values.

`validateWorldGraph()` checks duplicate spawn/interaction/objective IDs, spawn bounds and collision occupancy, exit destinations, destination spawns, reciprocal routes, existence of objective locations, and existence of objective interaction IDs. It does not automatically prove that an objective target is in its declared room, that prerequisite flags are ordered, or that whole-room paths are reachable. A separate story audit confirmed all 15 objectives target the declared room and every required flag is granted earlier.

After final-art geometry alignment, a radius-22, 5-pixel-grid audit passed every spawn, target, and exit in the five revised rooms. Reachable components were Feed Store 10,644 cells, Sheep & Scales 9,971, Baboon Wing 12,369, Procedure Prep 14,321, and Coffee Shop 13,348. The Feed Store's optional `dinosaur_toy` hotspot was moved before the passing result because its previous position was unreachable. Integrated all-room visual QA and the focused three-engine reciprocal route now supplement this static result; movement through every remaining exit direction is still pending.

### Story and objectives

`src/data/story.ts` defines the ordered 15-objective route. An `ObjectiveDefinition` supplies its act, copy, hint, target IDs, rewards, granted flags, kit labels, and checkpoint status. `GameSession.interact()` is the authoritative objective reducer: it enforces interaction prerequisites, records a target once, grants rewards/flags, advances the objective, updates level, and finishes the profile.

Dialogue content is represented as short `DialogueLine` arrays. Choices carry a small typed effect vocabulary (`wayneDown`, `wayneUp`, or `stressDown`) that `GameUI` applies. Most NPC lines are currently single unconditional lines stored with the location.

### Characters

`src/data/characters.ts` separates `CharacterDefinition` gameplay statistics from `CharacterVisualDefinition`. Mel and Josh have independent movement, sprint, stamina, interaction, carrying, and stress values. All named visuals are keyed independently from gameplay logic.

`CharacterRig` currently draws a palette-driven vector paper doll from Phaser graphics. It redraws the silhouette, workwear, face, hair style, glasses, and facial hair for toward/away/side directions and animates idle breathing, walk bob/swing, interaction, hit response, perspective scale, and Y-based depth. A future sprite-atlas renderer can consume the same visual IDs, but atlas paths/frame maps are not yet part of the definition.

## Runtime state and persistence

`GameSession` owns the active `RunState`, settings, and profile. Other systems request transitions, interactions, meter updates, failures, retries, settings changes, and resets through its methods instead of mutating browser globals.

The development/test build exposes a frozen `window.__busyDayTest` adapter for controlled E2E state inspection, objective-room travel, target completion, and physical exit approach. Production builds do not create it.

`src/state/saveStore.ts` serializes one `SaveEnvelope` to `busy_day_at_the_viv_v2_save`:

```text
schemaVersion: 2
settings: audio · dialogue · motion · contrast · subtitles · text · handedness · relaxed
profile: best rank · best coins · completed runs
activeRun: lead · location/spawn/position · objective/targets/flags · meters · rewards · checkpoint · failure
```

Parsing treats browser data as untrusted. It clamps numeric values, verifies lead/location/spawn shape, derives the coherent completed-objective prefix, targets, flags, rewards, level, and checkpoint from the objective index, supplies setting defaults, and discards structurally incomplete active runs. A legacy-shaped envelope is normalized into schema 2; there is not yet a table of explicit per-version migration functions.

`GameSession` persists on new game, objective interactions, transitions, settings changes, failure, retry, reset, a 1.2-second movement interval, and page backgrounding. The interval avoids a local-storage write on every rendered frame while keeping refresh recovery close to the current position.

## Movement, collision, and presentation

`moveCircle()` in `src/systems/collision.ts` is a framework-independent kinematic resolver. It divides a movement delta into steps of at most seven world units, keeps a radius-20 footprint inside location bounds, rejects expanded obstacle rectangles, and resolves X/Y separately to permit wall sliding. Dodge uses the same resolver, preventing a 74-unit dodge from tunnelling through authored barriers.

This is direct-input movement, not pathfinding. The implementation has no navmesh, A*, pointer-to-walk, polygon collision, or carried-object footprint. The pig trolley state applies the selected lead's carrying speed factor; it does not attach a separate physical body to the player.

Every current location definition has a generated `backgroundKey`. All 11 runtime backgrounds are 1280×720 WebP files totaling 1,818,586 bytes (1.734 MiB); all 1672×941 PNG masters remain outside the runtime path. `BackdropRenderer` retains deterministic procedural drawing as a fallback for a definition without a background key, but that fallback is not the production presentation for the ten current locations. Interactions, animals, cars, props, NPCs, and the player remain runtime Phaser objects. Perspective scale interpolates from location far/near values, and object depth is based primarily on Y. Dedicated foreground occlusion images are not implemented.

Feed Store, Sheep & Scales, Baboon Wing, Procedure Prep, and Coffee Shop collision/exit geometry was revised with their final backplates to follow visible doors, counters, cages, scales, rails, carts, and other fixtures. Static reachability passed for all five. The real Tea Room → Main Hall → Feed Store → Main Hall route now passes in Chromium, Firefox, and WebKit using data-driven spawn coordinates. Integrated visual QA also captured every room plus the ending without console/page errors, and the contact sheet passed review; complete movement traversal of all 18 exit directions remains pending.

## UI and input ownership

`src/ui/GameUI.ts` owns all HTML overlays declared in `index.html`:

- title/lead selection and Continue;
- HUD and condition meters;
- objective list, kit flags, and hint;
- range prompt and hold progress;
- dialogue, typewriter reveal, and choices;
- pause, settings, confirmation, failure, and ending;
- touch joystick/actions, captions, toasts, and portrait orientation prompt.

`GameUI` is the single world-input aggregator for touch, DOM keyboard, and polled gamepad state and exposes an `InputSnapshot` to `LocationScene`. Blocking overlays clear held keyboard/touch state and pause/resume the location scene through a reason set, avoiding nested-menu resume and stuck-key bugs. Gamepad polling does not currently provide menu focus or dialogue advancement, so a complete controller-only path is not claimed.

The layout uses CSS safe-area variables, dynamic viewport units, visible focus styles, minimum touch controls larger than 44 CSS pixels, a coarse-pointer layout, and a portrait media query. Settings become body classes for large text, contrast, reduced motion, and handedness.

## Audio

`AudioDirector` has two user-facing gain categories: music and SFX. Six loop IDs map to original WAV beds and 20 one-shot cues map to UI, interactions, animals, machinery, transitions, and hazards. It uses `HTMLAudioElement`, waits for an activation event, crossfades music, ducks it under dialogue/pause, and reapplies saved volume/mute settings.

Music is requested by location rather than predecoded at boot. One-shots are instantiated when used. There are no separate ambience/UI buses, spatial panning, or compressed Opus mirrors yet. Audio paths use `import.meta.env.BASE_URL`, and Vite rewrites the processed CSS title URL for relative/subpath builds.

## Asset pipeline

- Generated PNG masters: `art/generated-masters/`
- Runtime WebP backplates: `public/assets/backgrounds/`
- Deterministic audio generator: `scripts/generate_audio.py`
- Audio verifier: `scripts/verify_audio.py`
- WebP export: `scripts/optimize_art.mjs`
- Per-file provenance: `docs/ASSET_MANIFEST.md` and `docs/AUDIO_MANIFEST.md`

`scripts/optimize_art.mjs` maps all 11 retained 1672×941 masters to centre-cropped 1280×720 WebP outputs at quality 88 / effort 5. The five retired runtime PNG copies totaled 12,006,717 bytes; their WebP replacements total 826,446 bytes, saving 11,180,271 bytes. The complete 11-background runtime set is 1,818,586 bytes (1.734 MiB). Replacing any generated room requires regenerating its WebP, and a composition that changes doors, fixtures, or obstacle silhouettes also requires updating the corresponding `LocationDefinition` geometry.

## Testing boundaries

Vitest covers collision, world validation, save/state, objectives, failures/checkpoints, transitions, and data-driven completion. Playwright targets Chromium, Firefox, and WebKit.

Post-optimization local typecheck, lint, 27/27 unit tests, normal/`/busy_day/` builds, and Pages-path URL inspection passed. The focused real reciprocal route passes in all three engines after data-driven-spawn and cadence-independent-key fixes. Integrated QA captured ten rooms plus the ending without console/page errors; the inspected contact sheet passed HUD, actor/target, exit, texture, and blank-room review, while `visual-qa/` remains ignored.

Node 24 final-art PR workflow [`29297017450`](https://github.com/nacho-android/busy_day/actions/runs/29297017450) passed on commit [`bf52920`](https://github.com/nacho-android/busy_day/commit/bf52920): clean install, every release/audio/type/lint/unit/build gate, and Playwright 21/21. Pages correctly skipped on the PR; its `VITE_BASE_PATH=/busy_day/` deployment remains gated to a successful non-PR `main` run, so merge, deployment, and hosted smoke are pending.

A pre-final-art foreground 1366×768 Chromium automation sample on Intel UHD 620/D3D11 measured a 47.4 FPS blank-page baseline with 18.1 ms p95 frame time and 33.3 FPS active Tea Room play with 36.1 ms p95. A prior same-condition active sample reported 13.5 MiB JavaScript heap. Initial local production navigation measured 1.141 seconds, 12 resources, and approximately 2.95 MB encoded transfer. The art payload has changed since that sample, so the figures remain diagnostic desktop history rather than current-build or representative-phone guarantees; current phone performance and soak measurements are still required.

The validator and unit suite establish data integrity but do not replace a real no-shortcut playthrough. Runtime exit approach, visual layering, touch ergonomics, audio lifecycle, and performance require browser/manual evidence.

## Safe extension workflows

### Add a location

1. Add its ID to `LocationId`.
2. Add a complete `LocationDefinition`, named spawns, reciprocal exits, obstacles, interactions, NPCs, theme, and perspective.
3. If it uses a generated backplate, add a preload key and `backgroundKey` union member.
4. Add objective references only after interaction IDs exist.
5. Run typecheck, world-validator unit tests, build, reciprocal-exit E2E, and a visual collision pass.

### Replace character rendering

Keep stable visual IDs and gameplay stats. Extend `CharacterVisualDefinition` with atlas/portrait metadata, implement the renderer in `CharacterRig`, and leave objective/location logic untouched. Verify all four directions, perspective scale, collision footprint, and dialogue identity.

### Replace art or audio

Preserve runtime keys/filenames where possible, regenerate optimized outputs, and update the relevant manifest with source, method, dimensions/duration, format, licence, and replacement constraints. Then run missing-file checks, browser loading, and visual/listening QA.
