# Busy Day at the Viv — V1 Audit

Audit date: 13 July 2026
Source of truth: `Busy_Day_v1.html`
V1 preservation baseline: 168,208 bytes, 4,315 lines, SHA-256 `A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85`

## Executive summary

V1 is a complete, self-contained, single-shift action game implemented in one HTML file. It combines a DOM/CSS interface with a continuously scrolling, pseudo-isometric 2D Canvas world. The player chooses Mel or Josh, completes 15 strictly ordered objectives across six narrative phases, manages health, stamina, stress, and Wayne's anger, and finishes by meeting Juan for coffee.

The game's strongest foundations are its specific workplace humour, clear escalating shift structure, recognisable ensemble, sequential objective guidance, and several memorable systemic jokes: Ross can trap the player in a corridor conversation, Thanh drives a dangerous vehicle around the facility, Wayne's anger is a failure meter, and the final reward is Juan's promised coffee. These are identity-defining elements worth preserving in V2.

V1 does **not** use any of the 43 adjacent reference images. All visible game artwork is drawn procedurally with Canvas primitives and CSS gradients. It also does not contain discrete room scenes, entrances/exits, sprite sheets, real character walk cycles, in-progress saves, audio settings, a landscape-orientation flow, gamepad input, or a genuine automated test suite. The current `#test` helper cannot advance through grouped animal objectives from a clean start.

## Audit scope and evidence

This document is based on direct inspection of the unmodified local source. Relevant evidence includes:

- Title, story pitch, character cards, menus, HUD, dialogue, touch controls, and end/failure overlays: lines 769–959.
- Audio synthesis and persistent score record: lines 1,035–1,255.
- Character, zone, geometry, animal, phase, NPC, dialogue, and upgrade data: lines 1,260–1,478.
- State, world construction, schedules, and objectives: lines 1,480–1,924.
- Input, collision, interactions, hazards, and update loop: lines 2,150–3,070.
- Procedural rendering, depth sort, minimap, UI, and flow control: lines 3,073–4,214.
- Animation loop, visibility pause, `#test` helper, and debug API: lines 4,216–4,309.

The folder contains 43 image files (38 `.jpeg`, four `.jpg`, and one `.png`), but the HTML contains no `<img>`, `Image`, `drawImage`, image filename, fetch, or other external asset-loading call. Image-by-image reference analysis belongs in `docs/ASSET_MANIFEST.md`; the V1-specific fact is that none is integrated into V1.

## Product identity and premise

The title is **Busy Day at the Viv**. The title screen describes it as a “Stylized Mobile Action-RPG” and frames the shift as “a heroic sprint through feed runs, cath lab prep, impossible parking, and professionally managed chaos” (lines 774–790).

The story takes place over one escalating work shift at an animal facility. The player must:

1. Report in and check the shift board.
2. Collect a feed cart and care for pigs, sheep, and baboons.
3. Collect blood glucose samples from the baboons.
4. Help Alan prepare and anaesthetise a pig.
5. Load the pig onto a trolley, weigh it, deliver it to the cath lab, and assist the cardiac procedure.
6. Shear a sheep during the afternoon spillover.
7. Resolve an obstructed car park while managing Wayne and avoiding Thanh.
8. Leave through the fence gap and meet Juan at the coffee shop.

The central emotional payoff is deliberately modest and funny: after the player keeps an absurd day upright, Juan buys the coffee he promised. The opening dialogue is Sally's “Board first, cart second, panic only when professionally necessary” (`startGame`, lines 4,140–4,161). The final dialogue has Juan insist that the player take the win and the caffeine (`talkToNpc`, lines 2,663–2,690).

## Narrative structure

`PHASES` defines six acts (lines 1,404–1,411):

| Phase | Source title | Narrative function |
|---:|---|---|
| 1 | Morning setup | Report in, check the board, and obtain the feed cart. |
| 2 | Animal feeding and samples | Feed every pig, sheep, and baboon, then sample each baboon. |
| 3 | Procedure prep | Prepare and anaesthetise the pig with Alan. |
| 4 | Pig transport and cath lab delivery | Load, weigh, deliver, and support the cath procedure. Thanh becomes an active hazard in this phase. |
| 5 | Afternoon overflow and car park | Shear the sheep and rearrange six cars while time pressure, Thanh, Ross, and Wayne complicate movement. |
| 6 | Coffee shop finale | Hazards are disabled; a glowing route points outside to Juan and the final coffee conversation. |

The sequence is linear. `completeObjective` always activates `objectiveIndex + 1` (lines 2,086–2,096); there are no alternative task orders or narrative branches.

## Playable characters

The title screen and `CHARACTERS` data expose two shift leads (lines 1,260–1,289):

| Character | Role | Move | Sprint | Stamina | Carry | Assist | Multitask | Stress resistance | Intended feel |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Mel | Rapid multitasker | 112 | 170 | 100 | 0.90 | 1.05 | 1.15 | 1.00 | Faster traversal and marginally quicker feed/sample cadence; weaker heavy carrying. |
| Josh | Solid procedure support | 98 | 152 | 116 | 1.20 | 1.15 | 1.00 | Slower traversal; more stamina, stronger carrying, better procedure assistance, and slightly better stress resistance. |

Both use the same geometric character drawing and the same interaction/movement logic. Their differences are numeric rather than animation-, dialogue-, or story-specific.

## NPC ensemble

`NPC_DEFS` contains 22 named NPCs (lines 1,413–1,436). Most wander within data-defined schedule zones and can be approached for a random line from `DIALOGUE`.

| Group | Characters | V1 function/personality |
|---|---|---|
| Cardiologists | Juan, Sally, Xing, Anugra | Sally starts the shift; Juan anchors the cath handover and coffee ending; Xing and Anugra reinforce timing pressure. |
| Vets | Alan, Luther | Alan leads pig preparation and anaesthesia; Luther comments on simultaneous demands. |
| Welfare | Ross | A systemic comic obstacle who traps the player in a long corridor-ethics conversation. |
| Engineers | Tony, Vu, Urja | Deliver dry jokes about unreliable monitors, essential cables, and equipment that fails when observed. |
| Researchers | Dhanya, Poonam, Max, Leila, Erin | Comment on parking, late departures, impossible normality, corridor congestion, and the slipping schedule. |
| Physiologists | Sam, Mitch | Await the procedure and provide anxious measurement/procedure commentary. |
| PIs | Wayne, James, Eddy, Pierre | Wayne is both character and pressure meter; the others supply leadership and institutional humour. |
| Mobile hazard | Thanh | Mirrors the moving `thanhTank` hazard and is rendered as a labelled vehicle; default dialogue is simply “HONK.” |

NPC schedules change with the current phase (`assignNpcSchedules`, lines 1,839–1,864). During the car-park objective, most scheduled staff clear into the utility corridor; Juan and Wayne wait at defined lower-edge positions so the player can ask them to move their locked cars (`setupCarParkScene`, lines 1,645–1,660).

## Humour and tone to preserve

The humour is affectionate, dry, specific, and rooted in competent people coping with institutional chaos. It rarely mocks the animal-care work itself. Recurring devices include:

- **Professional understatement:** “panic only when professionally necessary,” “pretend it is intentional,” and “emotionally, I am choosing confidence.”
- **The schedule as an antagonist:** the board is “overbooked in a way that feels personal”; people can “feel the schedule slipping through the walls.”
- **Ross's timing:** he turns corridor etiquette into a literal control-disabling/mash-to-escape trap.
- **Thanh's vehicle:** the title says Thanh is “somehow driving a tank through the precinct again”; the in-world response is “HONK,” collision damage, and the toast “Thanh barrels through the zone.”
- **Wayne's escalation:** his anger is a HUD bar, lateness increases it, touching or approaching his car incorrectly aggravates it, and 100 anger ends the shift.
- **Parking diplomacy:** unlocked cars can be moved by the player, but Juan and Wayne must move their own.
- **Leadership satire:** James is “observing with concern and excellent posture”; Pierre says the facility runs on “precision, improvisation, and thinly veiled panic.”
- **Coffee as heroic treasure:** the conclusion gives ordinary caffeine cinematic lighting, particles, route markers, a victory cue, and rank presentation.

This tonal mixture—high-stakes procedural competence plus mundane, sharply observed workplace absurdity—is more central to V1's identity than its current visual treatment.

## World and locations

`ZONES` defines 15 labelled floor regions in one continuous world (lines 1,291–1,307). These are not separate scenes and have no entrance/exit records or spawn matching. The camera simply follows the player across a single coordinate plane.

| Zone | V1 gameplay use |
|---|---|
| Break Area | Spawn area, shift board objective, Sally/PI activity. |
| Storage | Feed-cart pickup. |
| Main Corridor | NPC circulation and the primary Ross encounter space. |
| Pig Holding | Two pigs, individual feeding, and initial pig trolley pickup point. |
| Sheep Pens | Three sheep, individual feeding, later shearing. |
| Baboon Area | Three baboons, individual feeding, and three glucose samples. |
| Procedure Prep | Pig prep and anaesthesia with Alan. |
| Scales | Weighing stop for the loaded trolley. |
| Cath Lab | Pig handover and cardiac-procedure support. |
| Utility Corridor | Engineering activity and car-park crowd holding area. |
| Car Park | Six-car rearrangement puzzle and Thanh's main circuit. |
| Coffee Shop | Juan's finale and coffee reward. |
| Human Hospital | Labelled exterior set dressing; no objective or interaction. |
| Busy Road | Ambient procedural traffic and part of Thanh's route; no direct objective. |
| Outside Walk | Connecting exterior set dressing; no direct interaction. |

The Viv perimeter uses seven rectangular `FENCE_SEGMENTS`, leaving a gap between world-Z 948 and 1046 on the east side (lines 1,309–1,319). That gap is the only explicitly signposted world connection, used for the coffee finale. It is a gap in continuous collision geometry, not a scene transition.

### Geometry and collision model

- Player/world collision is circle-versus-axis-aligned-rectangle (`circleRectHit`) with separate X and Z resolution (`moveWithCollisions`, lines 2,305–2,333).
- Blockers are 19 fixed `OBSTACLES`, the seven fence segments, current rectangles for all cars, and the rectangular world bounds.
- Fixed objects include benches, shelves, stalls, pens, cages, preparation tables, scale/lab units, exterior planters/awning, and a road median.
- Zone edges themselves are only painted floor outlines. They are not walls or collision geometry, so the player can cross apparent room edges wherever no obstacle happens to block the path.
- NPC movement and Thanh's route movement update coordinates directly rather than calling `moveWithCollisions`; NPCs and the hazard therefore do not respect fixed-world or car collision geometry.
- Moving cars follow a straight line to a fixed target slot and do not route around occupied cars or obstacles.

## Objectives and rewards

`setupObjectives` defines 15 mandatory objectives (lines 1,877–1,899):

| # | ID | Phase | Required action | Configured duration (s) | XP | Coins |
|---:|---|---:|---|---:|---:|---:|
| 1 | `check_board` | 1 | Check the shift board. | 999 | 12 | 6 |
| 2 | `collect_cart` | 1 | Collect the feed cart. | 999 | 14 | 7 |
| 3 | `feed_pigs` | 2 | Feed both pigs individually. | 90 | 18 | 8 |
| 4 | `feed_sheep` | 2 | Feed all three sheep individually. | 82 | 16 | 8 |
| 5 | `feed_baboons` | 2 | Feed all three baboons individually. | 84 | 16 | 8 |
| 6 | `sample_baboons` | 2 | Collect three individual blood-glucose samples. | 92 | 26 | 12 |
| 7 | `pig_prep` | 3 | Complete pig prep with Alan. | 92 | 20 | 10 |
| 8 | `anaesthetise_pigs` | 3 | Help Alan anaesthetise the pig. | 92 | 22 | 11 |
| 9 | `carry_to_scales` | 4 | Load the pig onto the trolley; despite the objective wording, completion occurs immediately at pickup, before travel to the scales. | 95 | 22 | 11 |
| 10 | `weigh_pig` | 4 | Weigh the pig while retaining the trolley. | 75 | 18 | 10 |
| 11 | `deliver_cath` | 4 | Wheel the same trolley into cath. | 80 | 25 | 12 |
| 12 | `support_cath` | 4 | Support the cardiac procedure. | 85 | 28 | 14 |
| 13 | `shear_sheep` | 5 | Shear the sheep. | 86 | 20 | 10 |
| 14 | `carpark` | 5 | Resolve all six cars. | 160 | 34 | 18 |
| 15 | `coffee_finale` | 6 | Reach the coffee shop, talk to Juan, and dismiss his final dialogue. | 999 | 58 | 32 |

Mandatory rewards total 349 XP and 177 coins. Each completed car also grants two coins, so the normal full-shift coin total is 189 before considering no other coin sources.

Although feeding/sample objectives have finite `duration` values, `updateHazards` decrements `objectiveTimer` only when `currentObjective.phase >= 2` using zero-based phase numbers (line 2,915). Consequently, phase-2 feeding/sample timers are configured but not enforced. Timers begin with procedure prep, not animal feeding.

When an enforced timer expires, the game does not fail or skip the objective. It adds 18 Wayne anger, adds 10 stress, shows a delay toast, and reactivates the same objective to reset its timer (lines 2,926–2,937). Repeated delays can therefore end the shift indirectly through Wayne's anger.

## Core game loop and guidance

The main loop uses `requestAnimationFrame`, caps simulation `dt` at 0.033 seconds, then updates input, audio, movement, cars, NPCs, Ross, hazards, objective-specific logic, interactions, camera, and HUD before rendering (lines 2,947–3,013 and 4,216–4,231).

The shift begins at 06:45. The displayed clock advances at 6.2 game minutes per real second; it is atmospheric and does not itself trigger a deadline or ending.

Player guidance consists of:

- One current objective and sub-objective in the HUD.
- A six-phase label and task counter.
- A teal world-space pulse on relevant interaction points.
- An edge arrow toward the current objective.
- A minimap with player, objective, hazard, zone, and fence markers.
- Proximity prompts, hold-progress rings, completion/error toasts, and dialogue.

Only interactables relevant to the current objective are enabled. Optional conversation with nearby non-hazard NPCs is the exception.

## Controls

### Desktop keyboard

- Move: `WASD` or arrow keys.
- Hold interaction: `E` or `Space`.
- Sprint: hold `Shift`.
- Dodge: `Q`.
- Pause: `Escape`.

There is no click-to-move, mouse-directed movement, pointer-based world selection, or gamepad support. Keyboard `E`/`Space` does not advance dialogue; the DOM “Continue” button must be activated.

### Touch

- Analogue virtual joystick on the lower left.
- Holdable **Use** and **Sprint** controls on the lower right.
- Momentary **Dodge** control.
- Pointer Events with an additional iPhone/iPad touch-event fallback.

The document prevents page scrolling, text selection, callouts, and browser touch gestures (`touch-action: none`, `overscroll-behavior: none`). Safe-area environment variables are applied to major HUD/control positions. Coarse-pointer media queries enlarge the controls.

The game is nevertheless portrait-oriented: the base canvas is 720×1280 and `#app` is capped at 760 CSS pixels wide while always consuming full viewport height. There is no orientation API, landscape layout, rotate-device prompt, or explicit portrait-state overlay.

## Player systems

### Health and damage

Thanh activates from zero-based phase 3 (pig transport). Contact causes 12 health damage, adds stress at 1.2 times damage, applies 0.8 seconds of damage immunity, knocks the player, and shows an impact toast. Health reaching zero calls `failShift`.

### Stamina, sprint, and dodge

- Sprint consumes 17 stamina per second and uses the selected character's sprint speed.
- Normal recovery is 12 stamina per second plus upgrade bonus.
- Dodge costs 10 stamina, lasts 0.18 seconds, and has a base 0.85-second cooldown.
- Carrying the pig prevents sprint and reduces movement based on carry strength.

### Stress

Stress comes from damage, delays, carrying, the late phase, sprinting near baboons during feeding, Ross, and Wayne interactions. It naturally falls by 1.4 per second. Stress above 70 reduces movement to 92%; stress reaching 100 is not itself a failure condition.

### Wayne anger

The fourth HUD bar is labelled **Wayne**. Late objectives, timer expiry, and mishandling his locked car raise it. Wayne refuses to move his car if anger is already above 60, adding further stress and anger. At 100 the shift fails with “Procedure confidence has evaporated and the day is over.”

### Ross trap

Remaining within 46 world units of Ross for 1.45 seconds activates a conversation trap, adds nine stress, drains six stamina per second, and suppresses ordinary movement/interaction. The dialogue instructs the player to tap Dodge or Use until `rossMash >= 5`. In the actual update order, however, `input.dodge` is cleared immediately after `triggerDodge` and before `updateRossTrap`, while dodge itself is disabled during the trap. Therefore only held/tapped **Use** reliably increments the escape meter. Ross is disabled during the coffee finale.

### Progression

Objectives award XP and coins. Level thresholds are 35, 80, and 135 total XP, producing a maximum level of four. Each level-up pauses the shift and offers three random, not-yet-selected choices from:

- Faster feeding/sampling.
- Stronger carrying.
- More stamina and recovery.
- Stress resistance.
- Improved dodge power and cooldown.

There is no inventory screen. The feed cart, pig readiness, trolley, scale state, cath handover, shearing, lane, and coffee are boolean state flags rather than inventory items.

## Interaction and dialogue

`buildInteractables` creates objective points for the board, cart, each animal action, procedure stations, trolley stages, cath support, sheep shearing, and coffee (lines 1,780–1,796). The interaction model is a contextual **hold Use** action; interaction time is modified by character stats and upgrades.

Successful and failed precondition responses include explicit feedback such as needing the feed cart, the pig not being ready, needing the trolley, or cath waiting on the handover. Most irrelevant props cannot be inspected at all because only the active objective's target is considered relevant.

NPC conversation selects a random line from `DIALOGUE`. Dialogue supports a speaker and plain text. The queue API accepts an `options` object and `dismissDialogue` contains `alt`/`onDismiss` callbacks, but `showNextDialogue` always hides `dialogueAlt` and never supplies alternative labels or reveals it (lines 1,955–1,981). V1 therefore has no reachable branching-response UI or portraits despite partial callback scaffolding.

Dialogue does not pause simulation. Movement, objective timers, NPCs, and hazards continue behind the dialogue overlay; only normal interaction progress is blocked.

## Car-park sequence

Six cars are data-defined for Juan, Wayne, Sally, Alan, Vu, and Max (lines 1,799–1,835):

- Juan's and Wayne's cars are locked; their owners must be approached and asked to move them.
- Sally's, Alan's, Vu's, and Max's cars are moved by the player. The player is temporarily hidden while the car follows a straight-line animation to its target slot.
- On completion, the driver reappears at a computed nearby point and two coins are granted.
- The objective completes only when every car has `done === true`.

Two implementation oddities are visible in the data. Wayne's car starts in slot 1 and targets the same slot, so its “move” completes without positional change. Sally targets slot 9 while Max initially occupies slot 9; cars do not collide while moving, allowing temporary overlap until Max is moved.

## Win, rank, failure, and recovery

### Win condition

The final objective positions Juan at the coffee shop, disables Ross and Thanh, shows a glowing exterior route, and waits for the player to talk to Juan. Dismissing Juan's final line completes `coffee_finale`, calls `finishGame`, plays the victory cue, saves best results, and opens the “Shift complete” screen.

### Rank

`computeRank` uses:

- Completed-task ratio: up to 55 points.
- Remaining health: up to 16.
- Low stress: up to 11.
- Low Wayne anger: up to 8.
- Coins: up to 12.

Thresholds are S ≥ 86, A ≥ 74, B ≥ 60, C ≥ 48, otherwise D.

### Failure conditions

There are two effective failure routes:

1. Health reaches zero, primarily from repeated Thanh collisions.
2. Wayne anger reaches 100 through late objectives and/or car conflict.

Stress alone cannot end the game. A single missed timer does not end the game; it applies penalties and resets that objective's timer.

The failure overlay offers **Try Again** (fresh shift) or **Title Screen**. The pause menu offers Resume, Restart Shift, and Back to Title. There are no checkpoints, undo, or resume-from-current-objective recovery options.

## Visual implementation and existing artwork

V1's visual style is entirely code-generated:

- CSS builds the dark blue glass-panel title, HUD, menus, toasts, dialogue, and touch controls.
- Canvas gradients create a navy/teal/amber backdrop and oblique floor slabs.
- `worldToScreen` maps X to screen X and Z to compressed screen Y, producing a pseudo-isometric presentation with a smoothing camera.
- Characters are colour-coded rounded body rectangles, circular heads, a single direction dot, shadows, labels, and sinusoidal bobbing.
- Pigs, sheep, baboons, cars, feed cart, pig trolley, cath table, fencing, equipment blocks, coffee shop, cups, steam, traffic, pedestrians, and particles are drawn from paths, ellipses, rectangles, and gradients.
- Animals have subtle bobbing; sheep visibly switch to a sheared drawing; carried/delivered pig state is visibly represented.
- Ambient details include road traffic, three exterior walkers, coffee steam/string lights, final-route dots, final bloom, a low-health vignette, and Ross tint.

There are no source photographs, generated backgrounds, textures, portraits, sprites, animation sheets, or foreground image layers. `style_ref.png` and all other adjacent images are unused.

The draw list sorts cars, interactables, animals, NPCs, the player, and Thanh by world Z. Fixed obstacles and fences are drawn before that sorted list, however, so characters always render over them rather than moving correctly behind/in front of them. `worldToScreen` uses one constant scale for the whole frame; characters do not become smaller toward the back of a location.

## Audio implementation

`AudioSystem` uses the Web Audio API only. It synthesises:

- A looping triangle/sawtooth melody, bass, kick, and noise rhythm.
- Click, task, feed, sample, carry, alert, hit, success, victory, finale, and coffee cues.

Audio is unlocked from user interaction and oscillator/buffer nodes are scheduled to stop. There are no audio files, recorded animal sounds, speech, location ambience, separate musical tracks, seamless rendered loops, volume controls, mute control, saved preferences, subtitles for non-textual cues, or pause-menu audio behaviour. `AudioSystem.tick` runs before the paused-state early return, so pausing gameplay does not explicitly pause music generation.

## Persistence

V1 stores one unversioned JSON record under localStorage key `busy_day_at_the_viv_save_v1` (lines 1,247–1,255). It writes only after a win and contains:

- `bestRank`
- `bestCoins`
- `bestTasks`

It does not persist current position, current objective, completed objectives, character choice, upgrades, health/stamina/stress/anger, car state, audio/control/accessibility preferences, or a save schema version. The title screen has no Continue option. “Reset Progress” immediately deletes the record without confirmation.

## Accessibility and responsive behaviour

Existing positives are high-contrast text, native buttons for menus, text versions of all dialogue/objective information, safe-area offsets, enlarged coarse-pointer controls, an `aria-label` on the main canvas, and no essential audio-only story content.

Material limitations are:

- Canvas world content has no semantic representation beyond one broad label.
- Touch controls and pause are `<div>` elements rather than accessible buttons and have no ARIA roles/labels.
- Dialogue has no portrait, focus management, keyboard-advance binding, or configurable type speed.
- There is no reduced-motion mode, text-size option, colour-accessibility option, remapping, subtitle preference, or screen-reader navigation model.
- Objective markers depend heavily on teal/red/gold colour, although text and shapes provide partial redundancy.
- There is no portrait-orientation prompt or purpose-built landscape HUD.

## Technical architecture

V1 is a 168 KB monolith containing:

- 767 lines of inline CSS.
- DOM markup for every screen.
- One strict-mode IIFE with all data, state, audio, rendering, gameplay, and test code.
- A single mutable `state` object enclosed by the IIFE.
- No framework, package manifest, module graph, build step, static typing, linting configuration, or source maps.

Some systems are already partially data-driven: `CHARACTERS`, `ZONES`, `OBSTACLES`, `INTERACT_POINTS`, animal arrays, `PHASES`, `NPC_DEFS`, `DIALOGUE`, upgrades, schedules, car definitions, and objectives. This is useful design evidence for V2. The implementation still couples target IDs to long condition/switch blocks in `isInteractableRelevant`, `executeInteraction`, `currentObjectiveTargetPoint`, and `updateSpecialObjectives`, so adding a new objective usually requires edits in several functions.

There is no asset lifecycle or scene cleanup because there are no external assets and only one world. Every frame redraws every zone and most world decoration, including off-screen content. `worldToScreen` repeatedly calls `getBoundingClientRect`, and procedural music allocates a fresh noise buffer on each noise cue. These are plausible mobile-performance pressure points, although this audit does not claim a measured frame-rate result.

## Test and diagnostic support

V1 has no separate test files, assertions, browser matrix, screenshot baselines, collision tests, or build validation. It exposes `window.__vivDebug` with state access and selected control functions (lines 4,301–4,308).

Loading with `#test` enables `runAutoTestStep`, which teleports the player and directly invokes interactions. This is a developer shortcut rather than an end-to-end test: it bypasses movement, collision, input, timing, and most UI.

The helper also cannot complete the current objective list from a clean game. It special-cases car parking, `rush`, and `juanCoffee`, then otherwise looks up an interactable whose ID exactly equals `obj.target` (lines 4,244–4,288). Group objectives use aggregate targets such as `feedPigs`, `feedSheep`, `feedBaboons`, and `sampleBaboons`, while their actual interactable IDs are `feedPig_0`, etc. The helper therefore stalls at `feed_pigs`; its “Auto-test completed” result is unreachable without external state manipulation.

Vestigial branches also exist for objective IDs `survive` and `coffee`, but neither ID appears in `setupObjectives`. Fields such as `doorVisuals`, `achievements`, `diagnostics`, and `input.pointerMap` are initialised but unused by the shipped flow.

## V1 limitations that V2 must address

| Area | Factual V1 limitation | V2 implication |
|---|---|---|
| Architecture | One inline HTML/CSS/JS file and one large mutable state object. | Separate typed data, systems, scenes, entities, UI, audio, and persistence modules. |
| World | One continuous painted plane; no room scenes, doors, matched exits, or spawn transitions. | Build meaningful connected locations with explicit exits, spawn pairs, loading/transition protection, and per-scene lifecycle. |
| Collision | Painted zone boundaries are not walls; NPCs, hazard, and cars bypass player collision logic. | Define walkable/collision geometry per location and validate every route for player and NPCs. |
| Art | All art is procedural; none of the supplied references or `style_ref.png` is used. | Create and optimise coherent final backgrounds, replaceable character art, portraits, props, foreground layers, and UI assets. |
| Animation/depth | Character “animation” is bobbing geometric shapes; global scale is constant; fixed props are outside entity depth sorting. | Add directional idle/walk/interaction animation, perspective scaling, and correct foreground/background occlusion. |
| Story/dialogue | Good linear story, but no meaningful choices, portraits, expression states, or simulation pause. | Preserve narrative beats while adding short branching/optional exchanges and safe dialogue state. |
| Interaction | One contextual verb, mostly objective-only targets, no inventory UI, limited out-of-range feedback. | Add a consistent mobile-friendly contextual system, optional inspect/use comedy, range feedback, and data-driven prerequisites/results. |
| Save/settings | Only best rank/coins/tasks persist after victory. | Add versioned in-progress saves, Continue, settings, recovery, and confirmed reset. |
| Audio | Procedural loop/SFX only; no controls, ambience, files, or saved preferences. | Integrate original music/ambience/SFX with buses, autoplay-safe start, cleanup, volume/mute, and persistence. |
| Mobile | Touch input and safe areas exist, but layout is portrait-first and no rotate prompt exists. | Make landscape primary, handle orientation without losing state, and validate phone/tablet safe-area layouts. |
| Accessibility | Minimal canvas label and native menu buttons, but inaccessible div controls and no preferences. | Add semantic controls, keyboard menu/dialogue flow, readable scaling, reduced motion, and non-colour-only guidance. |
| Testing | The embedded teleport helper is incomplete and bypasses real gameplay. | Add unit, integration, E2E, viewport, browser, screenshot, and manual-play coverage. |
| Performance | Whole world redraw, repeated layout reads, and repeated procedural allocations; no measured budgets. | Use scene-based loading/culling, compressed assets, lifecycle cleanup, and measured mobile performance targets. |

## Canon that should carry into V2

The following elements are directly supported by V1 and should be treated as canon unless deliberately expanded rather than silently replaced:

- The title **Busy Day at the Viv** and the one-chaotic-shift premise.
- Mel and Josh as distinct playable shift leads: Mel is faster/multitasking-oriented; Josh is stronger/more procedure-oriented.
- Sally giving the opening board/cart instruction.
- Feeding pigs, sheep, and baboons, followed by baboon glucose sampling.
- Alan leading pig prep and anaesthesia.
- The loaded-pig route from holding/prep to scales to cath lab.
- Juan, Xing, Sam, and Mitch as part of the cath-lab beat.
- The absurd late sheep-shearing demand.
- Ross's corridor-conversation hazard.
- Thanh as a fast vehicle hazard with “HONK” energy.
- Wayne's impatience, his protected car, and anger as an escalation/failure concept.
- A car-park diplomacy/rearrangement sequence involving staff vehicles.
- Juan's promise and the coffee-shop ending.
- The comic voice: capable colleagues, procedural urgency, institutional friction, understatement, and a cinematic celebration of a very ordinary coffee.

## Audit conclusion

V1 is playable in concept and contains a surprisingly broad set of interconnected systems for a standalone HTML prototype. Its real value is the authored shift arc and comic ensemble, not the current monolithic implementation or placeholder-like geometric presentation. V2 should reproduce the essential objective chain and character dynamics first, then expand them through proper scenes, data-driven interactions, final art/audio, robust persistence, and verifiable movement/progression tests while retaining this file unchanged as the historical baseline.
