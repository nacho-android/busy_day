# Busy Day at the Viv V2 — Implemented Game Design

**Document status:** implementation-aligned design, 2026-07-14
**Playable scope:** ten locations · fifteen objectives · two leads · one main ending
**Evidence:** current `src/`, `public/assets/`, `index.html`, tests, and the factual V1/reference audits

This document describes the game that is actually implemented. Earlier ideas that did not make the current build are listed as deferred scope, not presented as features.

## Product statement

`Busy Day at the Viv V2` is a short story-led, top-down 2.5D adventure about completing an implausibly overloaded animal-research shift safely. The player explores a connected facility, cares for pigs, sheep, and baboons, prepares and transports a pig for an abstracted cardiac procedure, handles a sheep-shearing surprise, negotiates a car-park catastrophe, and reaches the coffee Juan promised at 06:45.

The tone is competent people facing impossible logistics. Animal care is calm and abstracted; humour comes from schedules, trolleys, corridor politics, Wayne's blue car, Ross's “quick question”, and Thanh's interpretation of lane discipline.

## V1 identity retained

The implemented V2 preserves the verified V1 spine:

- **Mel** and **Josh** are selectable leads with different movement, stamina, carrying, stress, and interaction characteristics.
- **Sally** starts the day with the shift board; **Juan** promises the final coffee.
- The main sequence remains board, feed cart, individual pig/sheep/baboon feeds, three baboon samples, pig preparation and anaesthesia with Alan, trolley loading, weighing, cath delivery/support, sheep shearing, six car-park actions, and coffee.
- Ross is a corridor-conversation hazard, Wayne's anger is a visible failure meter, and Thanh is a moving car-park hazard with a captioned “HONK.”
- Health and Wayne pressure provide two setback states. Checkpoint retry, restart, XP, coins, levels, and S–D ending ranks remain.
- V1's dry workplace fatalism is retained in dialogue and optional prop inspections.

`Busy_Day_v1.html` remains the historical game. V2 does not reuse V1's monolithic runtime or alter its file.

## Creative and visual direction

The shared aesthetic is an original retro-noir animal facility: high three-quarter views, deep shadows, teal/magenta/amber practical lighting, worn industrial surfaces, rainy reflections, dramatic vignettes, and concise diegetic humour. It takes broad era/genre inspiration without reproducing protected characters, logos, or compositions.

The current build combines:

- 11 generated 3D-rendered backplates: the title plus all ten gameplay locations;
- 11 browser-sized 1280×720 WebP runtime images totaling 1,818,586 bytes (1.734 MiB), with every 1672×941 PNG master retained;
- runtime vector characters, animals, vehicles, props, markers, and ambient motion;
- perspective scale and Y-based depth so actors become larger toward the foreground;
- generated art used as backplates only, without placing unedited reference photographs in the game.

Reference likenesses, locations, and style were used under the caveats in `ASSET_MANIFEST.md`; publication permission is a separate release requirement.

## Player characters

| Lead | Implemented identity | Play difference |
| --- | --- | --- |
| Mel | Rapid multitasker | 220 walk / 330 sprint; 100 stamina; fastest interaction rate; 0.9 trolley carry factor |
| Josh | Solid procedure support | 196 walk / 292 sprint; 118 stamina; steadier 1.2 trolley carry factor; greater stress resistance |

Both leads use the same story route. The palette-driven paper-doll rig redraws workwear, face, hair, glasses/facial hair, and silhouette for toward/away/side directions and supports idle breathing, walk bob/limb swing, interaction motion, hit reaction, perspective scale, and depth. These are detailed procedural vector animations, not generated sprite sheets.

## World map

V2 has ten connected playable locations. The compact map keeps every room purposeful and merges transition-only rooms from the initial 16-screen proposal.

```mermaid
flowchart LR
  tea["1. Tea Room"] <--> hall["2. Main Hallway"]
  hall <--> feed["3. Feed Store"]
  hall <--> pig["4. Pig Housing"]
  hall <--> sheep["5. Sheep & Scales"]
  hall <--> baboon["6. Baboon Wing"]
  hall <--> prep["7. Procedure Prep"]
  prep <--> cath["8. Cath Lab"]
  hall -->|"unlocks after procedure"| car["9. Car Park"]
  car -->|"unlocks after six cars"| coffee["10. Coffee Shop"]
  car --> hall
  coffee --> car
```

| # | Location | Gameplay/narrative purpose | Visual implementation | Required route |
| ---: | --- | --- | --- | --- |
| 1 | Tea Room | Opening dialogue, Sally's board, Juan's promise, optional kettle/early-coffee jokes | Generated tea-room backplate | Shift board |
| 2 | Main Hallway | Navigation hub, Ross trap, facility map, staff reactions, locked car-park gate | Generated facility-hub backplate | Revisited throughout |
| 3 | Feed Store | Collect feed cart; inspect suspicious bin and enrichment ball | Generated feed-store backplate | Feed cart |
| 4 | Pig Housing | Feed three pigs individually; meet Luther | Generated pig-housing backplate | Three feeds |
| 5 | Sheep & Scales | Feed three sheep, later weigh the pig and shear a sheep | Generated livestock-scale backplate | Five task interactions across acts |
| 6 | Baboon Wing | Feed three baboons and collect three samples; calm-room humour | Generated secured-animal-wing backplate | Six task interactions |
| 7 | Procedure Prep | Pig preparation, anaesthesia support, trolley loading with Alan/Luther | Generated procedure-prep backplate | Three staged interactions |
| 8 | Cath Lab | Trolley handover and cardiac-support console with cath/engineering teams | Generated cath-lab backplate | Handover and support |
| 9 | Car Park | Six vehicle actions, Wayne choice, rising Wayne pressure, Thanh hazard | Generated rainy car-park backplate | All six cars |
| 10 | Coffee Shop | Final Juan conversation, coffee payoff, rank/results | Generated rainy coffee-shop backplate | Coffee ending |

Every exit targets a named spawn in the destination. Main Hall → Car Park requires `procedureComplete`; Procedure Prep → Cath Lab requires `hasTrolley`; Car Park → Coffee Shop requires `carParkClear`.

After the five final backplates were integrated, their collision/exit geometry was realigned to visible fixtures. A radius-22, 5-pixel-grid audit then reached every spawn, target, and exit in Feed Store, Sheep & Scales, Baboon Wing, Procedure Prep, and Coffee Shop; the optional Feed Store enrichment-ball hotspot was moved before the passing result because its first art-aligned coordinate was unreachable. Integrated all-room visual QA and the focused three-engine reciprocal route now supplement that static evidence; movement through all remaining exit directions is still pending.

## Story and objective route

The story uses 15 ordered objectives across six acts. Each objective has a destination, target IDs, rewards, hint, optional kit label, granted flags, and checkpoint status.

| Act | Objective | Targets | Important state/result |
| ---: | --- | ---: | --- |
| 0 | Check the shift board | 1 | Grants `boardChecked` |
| 0 | Collect the feed cart | 1 | Grants `hasFeedCart`; checkpoint |
| 1 | Feed each pig | 3 | Individual pen cadence |
| 1 | Feed each sheep | 3 | Individual pen cadence |
| 1 | Feed each baboon | 3 | Feed-cart prerequisite |
| 1 | Collect three glucose samples | 3 | Grants `hasSamples`; checkpoint |
| 2 | Complete pig preparation | 1 | Grants `pigPrepared` |
| 2 | Assist Alan with anaesthesia | 1 | Requires prep; grants `pigReady` |
| 2 | Load the pig trolley | 1 | Grants `hasTrolley`; checkpoint |
| 3 | Weigh the pig | 1 | Requires trolley; grants `pigWeighed` |
| 3 | Deliver the trolley to cath | 1 | Requires weight; grants `pigDelivered` |
| 3 | Support the cardiac procedure | 1 | Requires handover; grants `procedureComplete`; checkpoint |
| 4 | Shear the afternoon sheep | 1 | Requires procedure completion |
| 4 | Clear the car park | 6 | Grants `carParkClear`; checkpoint |
| 5 | Meet Juan for coffee | 1 | Grants `coffeeEarned`; completes run/profile |

Opening and objective-transition dialogues break the story into short beats. NPCs in each room have compact contextual lines. Optional interactions deliver prop humour without changing the critical path.

## Moment-to-moment play

1. Read the current objective in the HUD or objective drawer.
2. Navigate a constrained room with direct movement.
3. Approach the glowing prop, animal, vehicle, or character.
4. Hold the contextual action until its visible progress completes.
5. Receive prop animation, sound, toast/dialogue, reward, flag, and objective feedback.
6. Use a readable exit to continue from the reciprocal entrance.

The objective drawer lists all 15 tasks, marks completed/current items, displays current kit flags, and reveals one authored hint on request.

## Movement, collision, perspective, and exits

- Eight-direction input is normalized to prevent faster diagonal movement.
- Sprint consumes stamina; normal movement restores it.
- Dodge moves 74 world units through the same collision resolver and costs stamina.
- Mel/Josh statistics alter movement and hold duration. A carried trolley applies a lead-specific speed multiplier.
- A radius-20 circle is kept inside the room's walkable rectangle and outside expanded fixed-obstacle rectangles. All six cars are active obstacles until their interaction completes, then the corresponding prop/collider is removed.
- Movement is divided into steps of at most seven world units; X/Y are resolved separately for wall sliding and reduced tunnelling.
- Character scale interpolates between each room's far/near values; depth follows Y.
- Exit rectangles trigger only when no interaction is active. Locked exits show a reason.
- A 750 ms entry cooldown, transition lock, sound, and fade prevent accidental repeated transitions.
- Reduced Motion converts the fade to an immediate transition.

Pointer/tap destination movement, pathfinding, polygonal nav regions, foreground occlusion layers, separate carried-object collision, and NPC navigation are not part of the current implementation.

## Characters and world life

The data set contains visual definitions for Mel, Josh, Sally, Juan, Alan, Ross, Wayne, Thanh, Xing, Anugra, Luther, Tony, Vu, Urja, Dhanya, Poonam, Max, Leila, Erin, Sam, Mitch, James, Eddy, and Pierre. Shinya reuses a current visual palette entry.

NPCs use idle breathing/bobbing and readable nameplates. Pigs, sheep, baboons, coffee steam, markers, and selected props have looping motion. Successful animal interactions layer the species-specific pig/sheep/baboon cue with the task cue. Thanh's vehicle traverses the car-park foreground, reverses at its lane ends, flashes a beacon, sounds a periodic horn, and damages health/stress/Wayne pressure on contact.

Ross triggers after the player remains close in Main Hall. He raises stress and temporarily blocks movement; Dodge releases the trap. He triggers once per Main Hall scene instance rather than following a persistent schedule.

## Dialogue and interaction

Dialogue supports speaker, initial portrait treatment, expression state, multiline wrapping, typewriter, reveal-all, advance, queueing, and pointer/touch/button/number-key choices. The Wayne branch either reduces Wayne/stress or raises both while still moving his car, so choice flavour cannot block completion. Gamepad-only dialogue navigation is not implemented.

The interaction vocabulary represented in types is Talk, Inspect, Use, Pick up, Open, Operate, Give, Enter, and Exit. Current world targets primarily use Talk, Inspect, Use, Pick up, Operate, and Give; doors/exits are proximity-triggered.

Out-of-order targets return prerequisite or dry contextual feedback. Completed targets cannot grant rewards twice. Optional props return authored lines without affecting progression.

## Pressure, failure, recovery, and ending

- Health ranges from 0–100. Thanh impacts cause 22 damage in standard play and 10 in Relaxed Shift.
- Stamina ranges to the selected lead's maximum and drives sprint/dodge availability.
- Stress records sprint/hazard/Ross/choice pressure and influences final rank.
- Wayne pressure is shown in/around the car-park act. It rises over time while clearing cars, changes through dialogue, and fails at 100.
- Health zero or Wayne 100 produces a setback screen with Retry checkpoint, Restart shift, and Title.
- Retry checkpoint removes post-checkpoint targets/objectives/flags/rewards, recalculates level, restores an authored act spawn, clears failure, restores health/stamina, and caps stress/Wayne to recoverable values.
- Finishing the coffee target records a completed profile run and displays S–D rank, tasks, coins, lead, elapsed in-game minutes, health, and stress.

Rank is a deterministic score from story completion, health, stress, Wayne pressure, and coins. Level increases automatically at XP thresholds; there is no current rank-up choice screen.

## Saving and settings

V2 uses local storage key `busy_day_at_the_viv_v2_save` and schema version 2. It stores:

- active lead, Relaxed Shift, location/spawn/position/facing;
- objective index, targets, completed objectives, flags, meters, XP, coins, level, checkpoint, failure, and finish state;
- best rank, best coins, and completed-run count;
- music/SFX volume, mute, typewriter, reduced motion, high contrast, captions, text size, touch handedness, and Relaxed Shift default.

The parser clamps and validates untrusted values and safely drops a structurally unusable run. Continue is available only for an unfinished run. Reset All requires confirmation and affects only the V2 key.

Position is persisted on state changes, page backgrounding, and a throttled 1.2-second movement interval so refresh recovery remains close to the current location without writing on every frame.

## Desktop, touch, gamepad, and accessibility

Desktop supports WASD/arrows, Shift sprint, E interaction, Space dodge, O objectives, P/Escape pause, M mute, and Enter/Space/E dialogue advance. Touch provides a virtual joystick plus Sprint, Dodge, contextual Use, HUD objective, and pause buttons. The implemented gamepad world path maps left stick and three face buttons; menus/dialogue are not controller-navigable.

The page uses landscape-first FIT scaling, safe-area insets, responsive browser scaling, no-scroll/no-gesture CSS, coarse-pointer layouts, pointer capture/cancel cleanup, and a portrait orientation overlay that pauses the location scene while preserving state. High-DPI output quality remains part of device validation.

Settings include music/SFX/mute, typewriter, reduced motion, high contrast, sound captions, normal/large text, right/left-handed touch, and Relaxed Shift. Important car-park warnings are visible captions/toasts rather than audio-only cues.

Implementation does not substitute for validation: real-device, browser, gamepad, screen-reader, viewport, and longest-text passes remain tracked in the checklist.

## Audio design

Six original mono synthesized WAV loops define the arc:

- `title_noir.wav` — title/noir identity
- `facility_pulse.wav` — social/storage/prep/hall exploration
- `animal_wing.wav` — pig/sheep/baboon rooms
- `cath_tension.wav` — Cath Lab
- `rain_carpark.wav` — Car Park
- `coffee_finale.wav` — Coffee Shop/ending

Twenty one-shots are generated and used for UI, interactions, doors, feed, samples, objectives, success/failure, horn, three animals, footsteps, machinery, coffee, and transitions. Successful pig/sheep/baboon interactions play the relevant species cue at a restrained gain alongside task feedback. Audio waits for activation, loops by location, crossfades music, ducks beneath dialogue/pause, and applies saved music/SFX/mute values.

The pack is deterministic procedural synthesis with no recordings or sample libraries. Full provenance and verification data are in `AUDIO_MANIFEST.md`.

## Performance design

The game uses a fixed 1280×720 logical canvas with Phaser FIT scaling. The core preloader loads all 11 generated 1280×720 WebP images, totaling 1,818,586 bytes (1.734 MiB). Converting the five retired runtime PNG copies saved 11,180,271 bytes, while every 1672×941 master remains available outside the runtime path. Music is requested on demand through HTML audio, and one-shot cues are instantiated when played. Scene-owned Phaser objects/tweens are destroyed on scene shutdown by Phaser; local maps are cleared.

After optimization, local strict typecheck, ESLint, 27 unit tests, normal and Pages-path builds passed. The generated URLs were inspected beneath `/busy_day/`, and the deployed host later passed asset and Continue smoke checks. Physical-device validation remains separate.

That pre-final-art foreground Chromium automation sample at 1366×768 on Intel UHD 620/D3D11 measured 47.4 FPS / 18.1 ms p95 for a blank-page baseline and 33.3 FPS / 36.1 ms p95 in the active Tea Room. A prior same-condition sample reported a 13.5 MiB JavaScript heap. Initial local production navigation measured 1.141 seconds, 12 resources, and approximately 2.95 MB encoded transfer. The art payload has changed since that sample, so current-payload and mid-range-phone frame rate, decoded texture/audio memory, long-session growth, transitions, and hosted latency remain unmeasured.

## Implemented acceptance and deferred scope

Implemented in source/data:

- V1-derived opening-to-coffee state path for both leads;
- ten connected purposeful locations and reciprocal exit definitions;
- collision, perspective, transition locks, interactions, dialogue, objectives, hazards, failures, recovery, save/settings, touch/orientation, original artwork, and original audio;
- strict types, lint, unit tests, and production build.

PR #1 merged as [`54499b3`](https://github.com/nacho-android/busy_day/commit/54499b368d566f3fa4e7da1af3e7a06ed1942b2f). Node 24 main workflow [`29298026940`](https://github.com/nacho-android/busy_day/actions/runs/29298026940) passed clean release/audio/type/lint/27-unit/build gates and Playwright 21/21. Pages deployment `5433749633` succeeded for that SHA/ref `main`, and [the hosted build](https://nacho-android.github.io/busy_day/) passed cache-busted asset plus title/New Shift/refresh/Continue smoke checks without captured warning/error logs.

Post-optimization visual QA captured all ten rooms plus the ending without console/page errors. The contact sheet passed HUD, actor/target, exit, texture, and blank-room review; `visual-qa/` remains ignored.

Still required for a full completion claim:

- broader no-shortcut functional, public-input, and visual viewport execution;
- complete manual runs for Mel and Josh without test shortcuts;
- representative real touch device and gamepad checks;
- complete audio-listening and soak/current-phone performance review beyond the accepted checkpoint captures;
- rights review for likeness-informed artwork.

Deferred rather than silently claimed:

- six additional transition/specialist screens from the initial map;
- Wrong Century side objective/dinosaur gameplay;
- pointer-to-walk and navigation pathfinding;
- physical carried-object bodies and a spatial car puzzle;
- foreground occlusion layers, sprite atlases, and full portrait sets;
- NPC schedules/patrols and optional objective chains;
- independent ambience/UI gain buses and compressed audio mirrors.

The definitive status and evidence log is `IMPLEMENTATION_CHECKLIST.md`; genuine user-facing limitations are in `KNOWN_LIMITATIONS.md`.
