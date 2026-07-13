# Busy Day V2 Audio Manifest

## Provenance and licence

Every file in `public/assets/audio/` is an original procedural synthesis created specifically for Busy Day V2 by `scripts/generate_audio.py`. The generator uses only mathematical oscillators, envelopes, and deterministically seeded pseudo-random noise from Python's standard library. It has no network access and uses no recordings, sample libraries, commercial music, model-generated audio, or third-party melodies.

The generator source and its rendered WAV outputs are offered under **CC0-1.0** for inclusion, modification, and redistribution with this repository. Keep this manifest with redistributed copies so that the no-samples provenance remains auditable.

All rendered files use the same browser-safe format: **mono, 16-bit linear PCM WAV, 22,050 Hz, uncompressed**. This deliberately lo-fi rate suits the retro-noir direction, keeps decoding inexpensive on mobile, and limits the complete pack to 4.99 MiB. Phaser/Web Audio can load these files directly.

## Music and ambience

| Filename | Purpose | Duration | Format / rate | Generation method and provenance | Loop notes | Integration / replacement notes |
| --- | --- | ---: | --- | --- | --- | --- |
| `title_noir.wav` | Title screen, opening narration, and pause-menu musical identity | 16.00 s | Mono PCM16 WAV / 22.05 kHz | Original D-minor noir ensemble: six-bar pad progression, synthesized reed lead, bass, brushed noise percussion, transformer hum; deterministic seed `1001`; CC0-1.0; no samples | Designed to loop; 32 ms cosine-squared edge breath makes the sample seam click-free; final A harmony points back to opening D minor | Suggested music-bus gain `0.52`. Preserve a restrained opening for title voice-over. Replacement may be longer, but must update preload metadata and this row. |
| `facility_pulse.wav` | Corridors, preparation rooms, weighing area, and general indoor exploration | 16.00 s | Mono PCM16 WAV / 22.05 kHz | Original E-minor industrial pulse with eight-bar pads, bass ostinato, machine-glass accents, kick and high-pass hats; seed `1002`; CC0-1.0; no samples | Designed to loop with a 32 ms click-free edge breath; repeating 32-beat arrangement | Suggested gain `0.46`. Cross-fade over 0.6–1.0 s when entering or leaving a facility area. A replacement should retain a low-density midrange for dialogue clarity. |
| `animal_wing.wav` | Pig, sheep, baboon, and animal-care spaces | 18.00 s | Mono PCM16 WAV / 22.05 kHz | Original lightly comic chamber loop: warm F-centred harmony, plucked lead/bass, tiny synthesized creature chirps, sparse percussion and filtered room tone; seed `1003`; CC0-1.0; no samples | Designed to loop; 24-beat phrase and 32 ms click-free edge breath | Suggested gain `0.43`. Layer species SFX at runtime rather than baking more calls into the loop. Replacement should stay playful without making animal vocalisations constant. |
| `cath_tension.wav` | Catheter laboratory, procedure escalation, timed or high-stakes interactions | 16.00 s | Mono PCM16 WAV / 22.05 kHz | Original D-minor procedural bed: four tense drone voicings, 32-beat pulse, double heart thumps, monitor beeps, noise air and rising chirps; seed `1004`; CC0-1.0; no samples | Designed to loop with a 32 ms click-free edge breath; last dissonant section returns to the first drone | Suggested gain `0.48`; duck to `0.30` beneath dialogue. Avoid stacking `machine_beep.wav` on every built-in loop beep. Replacement should maintain a predictable pulse if gameplay timing uses the mood. |
| `rain_carpark.wav` | Car park, hospital exterior, loading areas, roads, and rainy transitions | 20.00 s | Mono PCM16 WAV / 22.05 kHz | Original synthetic ambience: filtered seeded rain, 74 synthesized droplets, three-frequency neon-transformer bed, and two distant abstract city calls; seed `1005`; CC0-1.0; no samples | Designed to loop; long stochastic texture plus 32 ms click-free edge breath masks repetition | Suggested ambience-bus gain `0.50`. It can run beneath another quiet music cue. Replacement should remain mono or be explicitly audited for stereo mobile memory cost. |
| `coffee_finale.wav` | Tea room/coffee shop relief, successful finale, credits, and post-game free roam | 18.00 s | Mono PCM16 WAV / 22.05 kHz | Original upbeat six-bar jazz-influenced loop: major-seventh harmony, walking synthetic bass, glass melody, brush noise and kick; seed `1006`; CC0-1.0; no samples | Designed to loop; dominant final bar resolves into the opening C-major colour; 32 ms click-free edge breath | Suggested gain `0.50`. Start after `success_sting.wav` or cross-fade from the current scene track. Replacement should preserve the comic tonal release from the darker facility score. |

## Interface, interaction, and world effects

| Filename | Purpose | Duration | Format / rate | Generation method and provenance | Loop notes | Integration / replacement notes |
| --- | --- | ---: | --- | --- | --- | --- |
| `ui_focus.wav` | Menu focus change, objective-list movement, inventory selection | 0.12 s | Mono PCM16 WAV / 22.05 kHz | Original short glass oscillator at 760 Hz; seed `2001`; CC0-1.0; no samples | One-shot; naturally enveloped to silence | Suggested UI-bus gain `0.35`; rate-limit during rapid keyboard/joystick repeats. Replacement should remain under 150 ms. |
| `ui_confirm.wav` | Confirm button, dialogue advance, menu selection | 0.24 s | Mono PCM16 WAV / 22.05 kHz | Original ascending two-tone glass synthesis; seed `2002`; CC0-1.0; no samples | One-shot | Suggested gain `0.42`. Keep perceptually distinct from `interaction_use.wav`. |
| `ui_back.wav` | Cancel, close panel, return to previous menu | 0.22 s | Mono PCM16 WAV / 22.05 kHz | Original descending harmonic chirp; seed `2003`; CC0-1.0; no samples | One-shot | Suggested gain `0.38`. Do not play when closing UI automatically during a scene transition. |
| `interaction_use.wav` | Generic successful inspect/use/activate feedback | 0.28 s | Mono PCM16 WAV / 22.05 kHz | Original high-pass click plus decaying glass tone; seed `2004`; CC0-1.0; no samples | One-shot | Suggested gain `0.46`. Play only after an action is accepted; use humorous dialogue alone for rejected actions. |
| `door_hiss.wav` | Powered/sliding door opening and laboratory airlock movement | 0.85 s | Mono PCM16 WAV / 22.05 kHz | Original filtered noise, descending mechanical chirp, and terminal clunk; seed `2005`; CC0-1.0; no samples | One-shot | Suggested world-SFX gain `0.58`. Trigger at animation start; destination fade may begin around 0.45 s. Replacement timing should match the door animation or the cue should be retimed in data. |
| `door_latch.wav` | Conventional door close, cabinet, gate, or pen latch | 0.42 s | Mono PCM16 WAV / 22.05 kHz | Original impact noise, decaying low metal oscillator, and secondary latch; seed `2006`; CC0-1.0; no samples | One-shot | Suggested gain `0.56`. Trigger on the animation's contact frame. |
| `feed_scoop.wav` | Scoop/pour feed, fill animal container, spill gag | 0.90 s | Mono PCM16 WAV / 22.05 kHz | Original filtered granular noise with 72 seeded grain bursts and a low sliding container resonance; seed `2007`; CC0-1.0; no samples | One-shot | Suggested gain `0.54`. Can be pitch-shifted ±4% for repeated scoops. Replacement should retain an audible completion tail for objective feedback. |
| `sample_vial.wav` | Collect, cap, scan, or place a laboratory sample | 0.80 s | Mono PCM16 WAV / 22.05 kHz | Original inharmonic glass partials followed by a clean confirmation beep; seed `2008`; CC0-1.0; no samples | One-shot | Suggested gain `0.50`. Trigger first transient at item contact; update inventory near the final confirmation beep. |
| `objective_update.wav` | New objective, completed subtask, area unlock notification | 0.65 s | Mono PCM16 WAV / 22.05 kHz | Original ascending three-note glass figure; seed `2009`; CC0-1.0; no samples | One-shot | Suggested gain `0.48`. Reserve this cue for state changes so it stays meaningful; pair with visible text, never audio alone. |
| `success_sting.wav` | Major objective completion and win-state lead-in | 1.80 s | Mono PCM16 WAV / 22.05 kHz | Original five-note ascending figure resolving to a major-seventh synthesized chord; seed `2010`; CC0-1.0; no samples | One-shot with a decaying tail | Suggested gain `0.60`. Duck current music, play sting, then begin `coffee_finale.wav` around 1.35–1.60 s if desired. |
| `failure_sting.wav` | Recoverable setback, failed procedure, comedic failure screen | 1.55 s | Mono PCM16 WAV / 22.05 kHz | Original descending reed figure and low falling chirp; seed `2011`; CC0-1.0; no samples | One-shot with a decaying tail | Suggested gain `0.58`. Follow with dialogue/recovery choices; do not pair with destructive save resets. |
| `car_horn.wav` | Wayne's blue car, car-park obstacle, road gag | 0.90 s | Mono PCM16 WAV / 22.05 kHz | Original two-note detuned synthetic horn with brass harmonics and light vibrato; seed `2012`; CC0-1.0; no samples | One-shot | Suggested gain `0.48` nearby and `0.22` for distance. Apply positional attenuation; avoid repeating more than twice per gag. |
| `animal_pig_grunt.wav` | Pig reaction, feed response, or wrong-item comment punctuation | 0.85 s | Mono PCM16 WAV / 22.05 kHz | Original paired low wobbling chirps plus filtered breath noise; seed `2013`; CC0-1.0; no animal recording | One-shot | Suggested gain `0.52`. Randomise playback rate between `0.94–1.06` for NPC variation. Keep subtitles/reaction animation for important meaning. |
| `animal_sheep_bleat.wav` | Sheep reaction and animal-wing ambience event | 1.00 s | Mono PCM16 WAV / 22.05 kHz | Original wobbling formant-like chirp, reed overtone and breath noise; seed `2014`; CC0-1.0; no animal recording | One-shot | Suggested gain `0.47`; schedule sparsely (not on every room entry). Replacement should be legally sourced and its licence added here. |
| `animal_baboon_call.wav` | Baboon reaction, corridor warning, comedic off-screen call | 1.10 s | Mono PCM16 WAV / 22.05 kHz | Original three rising harmonic chirps plus filtered breath texture; seed `2015`; CC0-1.0; no animal recording | One-shot | Suggested gain `0.48`; use positional attenuation when heard from the corridor. This is stylised rather than zoologically realistic. |
| `footstep_tile_a.wav` | First alternating indoor footstep | 0.24 s | Mono PCM16 WAV / 22.05 kHz | Original noise impact, descending sole resonance and high-frequency scuff; seed `2016`; CC0-1.0; no samples | One-shot | Suggested gain `0.24`; alternate with `footstep_tile_b.wav` on animation footfall frames and cap at the animation cadence. |
| `footstep_tile_b.wav` | Second alternating indoor footstep | 0.24 s | Mono PCM16 WAV / 22.05 kHz | Original variant of the synthesized tile impact with a higher resonance; seed `2017`; CC0-1.0; no samples | One-shot | Suggested gain `0.24`; alternate with `footstep_tile_a.wav`. Replacement pair should have matched perceived loudness. |
| `machine_beep.wav` | Scanner, scale, catheter console, or equipment confirmation | 0.45 s | Mono PCM16 WAV / 22.05 kHz | Original two-part sine monitor beep at 880 Hz and 1,174.7 Hz; seed `2018`; CC0-1.0; no samples | One-shot | Suggested gain `0.37`. Pair important states with visible UI; rate-limit malfunction sequences to protect listeners. |
| `coffee_pour.wav` | Tea-room coffee pour, finale prop interaction, refill joke | 1.25 s | Mono PCM16 WAV / 22.05 kHz | Original filtered liquid noise, twenty seeded droplets, and low cup resonance; seed `2019`; CC0-1.0; no samples | One-shot | Suggested gain `0.48`. Trigger after cup placement; a replacement should align with the pour animation length. |
| `transition_whoosh.wav` | Scene fade, fast travel, title-to-game transition | 0.75 s | Mono PCM16 WAV / 22.05 kHz | Original rising high-pass noise and harmonic chirp; seed `2020`; CC0-1.0; no samples | One-shot | Suggested gain `0.42`. Centre the loudest portion on the fade-to-black midpoint. Suppress when reduced-motion mode uses an instant cut if the user also disables transition audio. |

## Generation and verification

From the repository root:

```powershell
python scripts/generate_audio.py
python scripts/verify_audio.py
```

`generate_audio.py --missing` renders only absent files, which is useful after an interrupted offline render. A normal invocation intentionally regenerates every file. Output is deterministic for the documented seed and synthesis code.

`verify_audio.py` is read-only. It checks the asset set, RIFF/WAVE readability, mono channel count, PCM sample width, 22,050 Hz rate, exact expected frame count and duration, payload length, peak ceiling, minimum useful peak, DC offset, and loop-edge discontinuity. The validated July 2026 render contains **26 files / 4.99 MiB**. Measured peaks are `0.620–0.780` full scale, leaving at least 2.15 dBFS of headroom; every loop's first-to-last sample delta rounds to `0.000` full scale.

## Integration guidance

- Use separate `music`, `ambience`, `sfx`, and `ui` gain buses. Store their user-facing gains and mute state in the versioned settings save.
- Start Web Audio only after a click, touch, or key interaction. A title-screen confirm action is an appropriate unlock point.
- Cross-fade loop changes instead of abruptly stopping a playing scene track. One music loop plus one ambience loop is the intended maximum simultaneous bed.
- Preload UI cues and the first scene's loop. Lazy-load other long loops by area group to keep initial decoding and memory low.
- All cues are mono by design. Phaser positional audio or Web Audio panning may place world sounds without storing duplicate stereo data.
- Never convey an objective, warning, or failure solely through audio. Pair cues with the objective panel, dialogue, subtitles, or a visual reaction.
- If a file is replaced, preserve its filename when possible, document the new duration/format/source/licence here, retest autoplay and scene cleanup, and rerun the missing-asset/browser suites. Third-party replacements require an explicit repository-compatible licence.

## Known limitations and future upgrade path

- WAV is broadly compatible and deterministic but larger than Opus. A future build may add `.webm`/Opus mirrors selected with browser capability checks; retain WAV fallbacks until Chromium, Firefox, and WebKit tests pass.
- The animal calls are intentionally stylised synthesis, not naturalistic field recordings.
- The 32 ms loop-edge breath prioritises guaranteed click-free playback. If a replacement uses sample-accurate periodic rendering, the tiny level dip can be removed after an audible seam test in all target browsers.
- Mono sources keep the mobile footprint small. Environmental spatial width should be created at runtime rather than baked into every file.
