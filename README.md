# Busy Day at the Viv V2

`Busy Day at the Viv V2` is a retro-noir browser adventure about completing one professionally chaotic animal-facility shift. Choose Mel or Josh, feed three groups of animals, support a pig procedure, negotiate a rain-soaked car park, survive Ross's “quick question”, and earn the coffee Juan promised at 06:45.

V2 is a modular Vite, TypeScript, and Phaser 3 project. The original single-file game remains preserved as `Busy_Day_v1.html`.

> **Development status:** all ten gameplay locations now have integrated generated backplates. The earlier six-art snapshot passed clean-install typecheck, lint, 27 unit tests, production build/preview, and 21/21 Playwright tests across Chromium, Firefox, and WebKit. The five final room backplates were then integrated and visually inspected, but their post-art browser/visual rerun was refused by the platform execution quota. Those five runtime files also remain full-size PNGs pending WebP optimisation. Complete no-shortcut playthroughs, representative-device validation, hosted-path validation, and publication are tracked in [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md).

![Busy Day V2 title artwork](public/assets/backgrounds/title.webp)

## What is included

- Ten connected locations: Tea Room, Main Hallway, Feed Store, Pig Housing, Sheep & Scales, Baboon Wing, Procedure Prep, Cath Lab, Car Park, and Coffee Shop.
- Fifteen sequential objectives preserving V1's main story from Sally's board to Juan's coffee.
- Two playable leads with different speed, stamina, carrying, stress, and interaction characteristics.
- Direct movement, sprinting, dodge, collision, perspective scaling, depth sorting, hold-to-use interactions, locked exits, and faded scene transitions.
- Branching Wayne dialogue, Ross and Thanh hazards, health/Wayne failure states, checkpoints, restart, and S–D ending ranks.
- Versioned local save/continue, settings, profile history, and malformed-save recovery.
- Responsive DOM interface with keyboard, touch, and gamepad input paths; landscape prompt; safe-area support; captions; larger text; high contrast; reduced motion; handedness; and Relaxed Shift.
- Eleven original generated retro-noir images: one title and a backplate for every gameplay location. The first six runtime assets are browser-sized WebP; the five final rooms currently use full-size PNG copies pending optimisation.
- Twenty-six original procedurally synthesized music/SFX files.

The detailed V1 evidence is in [`docs/V1_AUDIT.md`](docs/V1_AUDIT.md). The implementation-aligned design is in [`docs/V2_GAME_DESIGN.md`](docs/V2_GAME_DESIGN.md).

## Requirements

- Node.js 20.20 or newer
- npm 10 or newer (the lockfile was produced with npm 11)
- A current desktop or mobile browser with Canvas/WebGL, Web Audio, ES2022 modules, and local storage

## Install and run

```powershell
npm ci
npm run dev
```

Vite prints the local URL. The development server binds to `127.0.0.1`; it is not exposed to the local network by default.

To run the historical V1, serve the repository with any static HTTP server and open `Busy_Day_v1.html`. Do not replace or rewrite that file.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on `127.0.0.1` |
| `npm run typecheck` | Run strict TypeScript project checks |
| `npm run lint` | Lint source, tests, scripts, and configuration |
| `npm test` | Run the Vitest unit suite once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run configured Playwright projects for Chromium, Firefox, and WebKit |
| `npm run test:e2e:chromium` | Run only the Chromium Playwright project |
| `npm run build` | Type-check and create the production bundle in `dist/` |
| `npm run preview` | Serve `dist/` locally through Vite Preview |
| `npm run assets:optimize` | Export all 11 PNG masters to 1280×720 WebP files; the five final rooms still require runtime-path switching and integrated validation afterward |

Playwright browser binaries are not installed by `npm ci`. Before the first E2E run, install the required local browser runtimes:

```powershell
npx playwright install chromium firefox webkit
```

The command may download several hundred megabytes. On Linux CI, Playwright's documented system dependencies may also be required.

## Controls

### Desktop

| Action | Control |
| --- | --- |
| Move | `WASD` or arrow keys |
| Sprint | Hold `Shift` |
| Interact / talk / operate | Hold `E` until the action ring completes |
| Dodge / escape Ross | `Space` |
| Objectives and hint | `O` or the objective button |
| Pause | `P`, `Escape`, or the pause button |
| Mute | `M` |
| Advance dialogue | `Enter`, `Space`, `E`, or the on-screen button |
| Choose a dialogue response | Number key or the response button |

### Touch

Use the virtual joystick to move and the **Sprint**, **Dodge**, and contextual **Use/Talk/Operate** buttons for actions. Touch layout can be swapped between right- and left-handed arrangements in Settings. The game is designed for landscape; a portrait overlay pauses the live scene without resetting the run.

### Gamepad

The left stick moves. Buttons 0, 1, and 2 map to world interaction, sprint, and dodge respectively. Exact face-button labels vary by controller/browser. Menus and dialogue still require keyboard, pointer, or touch; complete gamepad-only navigation is not implemented. The world-input path also requires the cross-browser/controller validation recorded in the checklist.

## Save, continue, and reset

V2 stores one active run, settings, and profile bests in local storage under `busy_day_at_the_viv_v2_save`. The current envelope is schema version 2 and is separate from V1 data.

- **Continue** appears when an unfinished V2 run is available.
- Objective completion, scene transitions, settings changes, periodic movement snapshots, and page-backgrounding persist the current run.
- **Retry checkpoint** rolls objectives, targets, flags, rewards, location, and meters back to the latest authored checkpoint.
- **Restart shift** preserves profile/settings and starts the chosen lead again at 06:45.
- **Reset saved progress** is in Settings and requires confirmation. It clears the V2 active run, profile, and preferences on that browser only.

Private browsing or storage restrictions can prevent persistence; gameplay continues in memory. Movement is saved on a throttled interval rather than on every rendered frame.

## Accessibility and mobile notes

- Important warnings use visible captions/toasts as well as sound.
- Typewriter text can be disabled; reduced motion also reveals dialogue immediately and shortens scene fades.
- High-contrast UI and a larger text option are available.
- Music, SFX, and master mute are saved.
- Touch controls respect safe-area insets, pointer cancellation, and handedness.
- The page disables scrolling and gameplay-area touch gestures.
- Relaxed Shift reduces car impact, Ross duration, and Wayne pressure.

These features are implemented, but the complete viewport, assistive-technology, touch-device, and gamepad matrices remain release gates rather than completed claims.

## Architecture and content editing

The runtime separates authored definitions from game/state code:

- `src/data/locations.ts` — locations, spawns, exits, obstacles, interactions, NPC placement, music, and perspective
- `src/data/story.ts` — objective order, dialogue, rewards, flags, and checkpoints
- `src/data/characters.ts` — gameplay statistics and independently replaceable visual definitions
- `src/state/` — save parsing/persistence and the authoritative run-state service
- `src/scenes/` — Phaser boot, preload, title, location, UI, and ending scenes
- `src/ui/GameUI.ts` — DOM menus, HUD, dialogue, touch input, settings, and accessibility state
- `src/systems/` — collision and world-graph validation
- `src/audio/AudioDirector.ts` — music/SFX lookup and playback

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for state flow, invariants, and replacement workflows.

## Assets, audio, and rights

- Runtime backplates are in `public/assets/backgrounds/`; all 11 editable generated masters are in `art/generated-masters/`. Six runtime files are optimized WebP, while the five final-room PNG copies still require browser-size WebP conversion and revalidation.
- Original audio is in `public/assets/audio/` and can be regenerated deterministically with `scripts/generate_audio.py`.
- [`docs/ASSET_MANIFEST.md`](docs/ASSET_MANIFEST.md) records supplied references, hashes, visual findings, generated-art provenance, and replacement notes.
- [`docs/AUDIO_MANIFEST.md`](docs/AUDIO_MANIFEST.md) records the method, format, duration, loop behaviour, and licence of every audio file.

The supplied photographs and `style_ref.png` are source references, not runtime assets and not automatically licensed for redistribution. Some generated artwork is likeness-derived. Confirm consent and publication rights or replace affected art before a public release. The repository [`LICENSE`](LICENSE) explains the different code, audio, generated-art, and reference-image scopes.

## Credits and generation notes

- Story premise, characters, jokes, and the original playable implementation come from the supplied `Busy_Day_v1.html`; the factual lineage is recorded in the V1 audit.
- V2 is built with Phaser, Vite, TypeScript, Vitest, Playwright, ESLint, and Sharp. Those projects retain their own licences.
- The 11 rendered masters were created for this project with OpenAI image generation. The first six use the prompts/references recorded in the asset manifest; four final-room prompts followed visual inspection of the existing project masters, and the Coffee Shop explicitly referenced the Tea Room and facility-hub masters. Runtime files are generated derivatives, not raw reference photographs.
- Music and sound effects were composed as deterministic mathematical synthesis by `scripts/generate_audio.py`; no recordings, commercial soundtrack, or sample library is used.
- The creators and publication permissions of the supplied reference photographs are not established by the workspace. The project does not invent attribution or imply consent where it has not been documented.

## Production build and deployment

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Deploy the contents of `dist/` to a static host. Vite is configured with a relative application base, audio uses `import.meta.env.BASE_URL`, and Vite rewrites processed CSS image URLs, so the built application is designed to work at an origin root or static subpath. Verify the exact final host path with `npm run preview` or an equivalent static server before release.

Before the five final room images were integrated, the clean-install bundle passed a local Chromium preview smoke at `127.0.0.1:4180`: title, New Shift, HUD, Tea Room, canvas count, scroll lock, all 12 initial resources, HTTP responses, and console/page errors were checked. This pre-final-art result is local desktop automation, not evidence for the current 11-image payload, a public host, or a physical phone; measured desktop findings and the required rerun are recorded in [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

Do not deploy `node_modules/`, browser/test reports, local `.env` files, reference photographs without confirmed rights, or browser/session data.

Remote publication is currently blocked in this workspace: the GitHub publish workflow requires local `git` plus an authenticated `gh`, neither command is available, and `.git` contains no usable local history. No branch, commit, push, or pull request is claimed. A release-scope scan identified 102 intended files / 43.34 MiB after exclusions, found no intended file containing the checked high-risk credential/token patterns, excluded all 43 raw references plus `style_ref.png`, and revalidated the preserved V1 hash recorded in the audit. This targeted scan is not a substitute for the final staged-diff and platform secret scan after Git is installed.

## Documentation

- [`docs/V1_AUDIT.md`](docs/V1_AUDIT.md) — factual V1 review and preservation hash
- [`docs/V2_GAME_DESIGN.md`](docs/V2_GAME_DESIGN.md) — implemented V2 design and scope decisions
- [`docs/ASSET_MANIFEST.md`](docs/ASSET_MANIFEST.md) — image catalogue and art provenance
- [`docs/AUDIO_MANIFEST.md`](docs/AUDIO_MANIFEST.md) — audio catalogue and provenance
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime and data architecture
- [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md) — evidence-based completion/release gates
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) — genuine remaining limitations and user impact
- [`CHANGELOG.md`](CHANGELOG.md) — release history

## Contributing

Keep `Busy_Day_v1.html` byte-for-byte preserved. Update the relevant manifest whenever replacing artwork or audio, run the static/unit gates before committing, and do not add credentials, cookies, tokens, private browser data, unlicensed third-party assets, or incidental personal information.
