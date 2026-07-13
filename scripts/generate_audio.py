#!/usr/bin/env python3
"""Deterministically synthesize the original Busy Day V2 audio pack.

The generator deliberately uses only Python's standard library.  It does not
download, decode, resample, or incorporate any external audio.  Running it
again with the same Python version produces the same PCM content.
"""

from __future__ import annotations

import math
import random
import struct
import sys
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


RATE = 22_050
CHANNELS = 1
SAMPLE_WIDTH = 2
TAU = math.tau
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "assets" / "audio"


@dataclass(frozen=True)
class Asset:
    filename: str
    duration: float
    target_peak: float
    loop: bool
    seed: int
    builder: Callable[[float, random.Random], list[float]]


def blank(duration: float) -> list[float]:
    return [0.0] * int(round(duration * RATE))


def midi(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


TIMBRES: dict[str, tuple[tuple[float, float, float], ...]] = {
    "sine": ((1.0, 1.0, 0.0),),
    "warm": ((1.0, 0.74, 0.0), (2.0, 0.18, 0.07), (3.0, 0.08, 0.16)),
    "pad": ((0.5, 0.12, 0.0), (1.0, 0.66, 0.0), (2.0, 0.16, 0.13), (3.0, 0.06, 0.31)),
    "pluck": ((1.0, 0.60, 0.0), (2.0, 0.22, 0.05), (3.0, 0.11, 0.11), (5.0, 0.07, 0.20)),
    "reed": ((1.0, 0.68, 0.0), (3.0, 0.22, 0.08), (5.0, 0.10, 0.15)),
    "brass": ((1.0, 0.55, 0.0), (2.0, 0.25, 0.03), (3.0, 0.13, 0.09), (4.0, 0.07, 0.17)),
    "glass": ((1.0, 0.62, 0.0), (2.71, 0.23, 0.11), (4.17, 0.15, 0.27)),
}


def add_tone(
    samples: list[float],
    start: float,
    duration: float,
    frequency: float,
    amplitude: float,
    *,
    timbre: str = "sine",
    attack: float = 0.015,
    release: float = 0.08,
    decay: float = 0.0,
    vibrato_rate: float = 0.0,
    vibrato_semitones: float = 0.0,
    glide_semitones: float = 0.0,
    phase_offset: float = 0.0,
) -> None:
    """Add an enveloped oscillator without introducing a hard edge."""
    start_index = max(0, int(round(start * RATE)))
    requested_end = int(round((start + duration) * RATE))
    end_index = min(len(samples), requested_end)
    if end_index <= start_index or duration <= 0.0:
        return

    harmonics = TIMBRES[timbre]
    phase = phase_offset
    attack = max(1.0 / RATE, min(attack, duration * 0.45))
    release = max(1.0 / RATE, min(release, duration * 0.45))
    for index in range(start_index, end_index):
        elapsed = (index - start_index) / RATE
        remaining = max(0.0, duration - elapsed)
        envelope = smoothstep(elapsed / attack) * smoothstep(remaining / release)
        if decay:
            envelope *= math.exp(-decay * elapsed / max(duration, 1.0 / RATE))
        progress = elapsed / max(duration, 1.0 / RATE)
        instantaneous = frequency * (2.0 ** (glide_semitones * progress / 12.0))
        if vibrato_rate and vibrato_semitones:
            wobble = math.sin(TAU * vibrato_rate * elapsed)
            instantaneous *= 2.0 ** (vibrato_semitones * wobble / 12.0)
        phase += TAU * instantaneous / RATE
        value = 0.0
        for multiplier, weight, offset in harmonics:
            value += weight * math.sin(phase * multiplier + offset)
        samples[index] += amplitude * envelope * value


def add_chord(
    samples: list[float],
    start: float,
    duration: float,
    notes: Iterable[int],
    amplitude: float,
    *,
    timbre: str = "pad",
    attack: float = 0.12,
    release: float = 0.22,
) -> None:
    notes = tuple(notes)
    per_voice = amplitude / max(1.0, math.sqrt(len(notes)))
    for voice, note in enumerate(notes):
        add_tone(
            samples,
            start + voice * 0.006,
            max(0.02, duration - voice * 0.006),
            midi(note),
            per_voice,
            timbre=timbre,
            attack=attack,
            release=release,
            phase_offset=voice * 0.41,
        )


def add_chirp(
    samples: list[float],
    start: float,
    duration: float,
    start_frequency: float,
    end_frequency: float,
    amplitude: float,
    *,
    attack: float = 0.008,
    release: float = 0.06,
    wobble: float = 0.0,
    harmonic: float = 0.0,
) -> None:
    start_index = max(0, int(round(start * RATE)))
    end_index = min(len(samples), int(round((start + duration) * RATE)))
    if end_index <= start_index:
        return
    phase = 0.0
    for index in range(start_index, end_index):
        elapsed = (index - start_index) / RATE
        progress = elapsed / duration
        frequency = start_frequency * ((end_frequency / start_frequency) ** progress)
        if wobble:
            frequency *= 1.0 + wobble * math.sin(TAU * 8.0 * elapsed)
        phase += TAU * frequency / RATE
        env = smoothstep(elapsed / attack) * smoothstep((duration - elapsed) / release)
        value = math.sin(phase) + harmonic * math.sin(2.0 * phase + 0.2)
        samples[index] += amplitude * env * value / (1.0 + abs(harmonic))


def add_noise(
    samples: list[float],
    start: float,
    duration: float,
    amplitude: float,
    rng: random.Random,
    *,
    colour: float = 0.0,
    highpass: bool = False,
    attack: float = 0.005,
    release: float = 0.05,
) -> None:
    start_index = max(0, int(round(start * RATE)))
    end_index = min(len(samples), int(round((start + duration) * RATE)))
    if end_index <= start_index:
        return
    low = rng.uniform(-0.2, 0.2)
    for index in range(start_index, end_index):
        elapsed = (index - start_index) / RATE
        white = rng.uniform(-1.0, 1.0)
        low = colour * low + (1.0 - colour) * white
        value = white - low if highpass else low
        env = smoothstep(elapsed / attack) * smoothstep((duration - elapsed) / release)
        samples[index] += amplitude * env * value


def add_kick(samples: list[float], start: float, amplitude: float = 0.2) -> None:
    add_chirp(samples, start, 0.22, 105.0, 42.0, amplitude, attack=0.002, release=0.09, harmonic=0.16)


def add_hat(samples: list[float], start: float, rng: random.Random, amplitude: float = 0.045) -> None:
    add_noise(samples, start, 0.075, amplitude, rng, colour=0.84, highpass=True, attack=0.001, release=0.05)


def add_brush(samples: list[float], start: float, rng: random.Random, amplitude: float = 0.055) -> None:
    add_noise(samples, start, 0.34, amplitude, rng, colour=0.55, highpass=True, attack=0.018, release=0.23)


def fade_loop_edges(samples: list[float], seconds: float = 0.032) -> None:
    """Create a click-free loop seam with a very short, intentional breath."""
    count = min(len(samples) // 2, int(round(seconds * RATE)))
    if count <= 1:
        return
    for index in range(count):
        gain = math.sin((index / (count - 1)) * math.pi / 2.0) ** 2
        samples[index] *= gain
        samples[-1 - index] *= gain


def finalize(samples: list[float], target_peak: float, *, loop: bool) -> list[float]:
    if loop:
        fade_loop_edges(samples)
    mean = sum(samples) / max(1, len(samples))
    if abs(mean) > 1e-8:
        samples = [value - mean for value in samples]
    # A gentle analytic saturator controls stacked oscillators without hard clipping.
    denominator = math.tanh(1.15)
    samples = [math.tanh(value * 1.15) / denominator for value in samples]
    peak = max((abs(value) for value in samples), default=1.0)
    scale = target_peak / max(peak, 1e-9)
    return [value * scale for value in samples]


def build_title_noir(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    beat = duration / 24.0
    chords = ((50, 53, 57), (46, 50, 53), (43, 46, 50), (45, 49, 52), (50, 53, 57), (45, 49, 52))
    roots = (38, 34, 31, 33, 38, 33)
    for bar, chord in enumerate(chords):
        start = bar * 4.0 * beat
        add_chord(samples, start, 3.96 * beat, chord, 0.105, attack=0.18, release=0.28)
        for offset in (0.0, 2.0):
            add_tone(samples, start + offset * beat, 1.6 * beat, midi(roots[bar]), 0.095, timbre="warm", attack=0.018, release=0.16)
    melody = (
        (0.0, 69, 1.4), (2.0, 72, 0.8), (3.1, 74, 0.65),
        (4.2, 77, 1.5), (6.2, 74, 0.75), (7.2, 72, 0.55),
        (8.0, 70, 1.2), (9.6, 69, 0.6), (10.5, 67, 1.0),
        (12.1, 73, 0.75), (13.1, 76, 1.25), (15.0, 72, 0.7),
        (16.2, 69, 1.35), (18.1, 65, 0.7), (19.1, 64, 0.65),
        (20.0, 73, 0.7), (21.0, 71, 0.65), (22.0, 69, 1.3),
    )
    for start_beat, note, length in melody:
        add_tone(samples, start_beat * beat, length * beat, midi(note), 0.092, timbre="reed", attack=0.028, release=0.15, vibrato_rate=4.6, vibrato_semitones=0.07)
    for index in range(24):
        add_hat(samples, index * beat, rng, 0.022 if index % 2 else 0.032)
    for bar in range(6):
        add_kick(samples, bar * 4.0 * beat, 0.12)
        add_brush(samples, (bar * 4.0 + 2.0) * beat, rng, 0.04)
    add_tone(samples, 0.0, duration, 55.0, 0.023, timbre="sine", attack=0.25, release=0.25)
    return samples


def build_facility_pulse(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    beat = duration / 32.0
    chords = ((52, 55, 59), (48, 52, 55), (43, 47, 50), (50, 54, 57)) * 2
    bass_pattern = (40, 40, 43, 47, 40, 43, 38, 47)
    for bar, chord in enumerate(chords):
        add_chord(samples, bar * 4 * beat, 3.92 * beat, chord, 0.075, timbre="pad", attack=0.08, release=0.16)
    for index in range(32):
        note = bass_pattern[index % len(bass_pattern)]
        add_tone(samples, index * beat, 0.72 * beat, midi(note), 0.105, timbre="warm", attack=0.006, release=0.055, decay=1.1)
        if index % 4 in (0, 2):
            add_kick(samples, index * beat, 0.14 if index % 4 == 0 else 0.09)
    for index in range(64):
        add_hat(samples, index * beat / 2.0, rng, 0.026 if index % 4 else 0.043)
    for start_beat, note in ((3.5, 76), (7.5, 79), (11.5, 74), (15.5, 81), (19.5, 76), (23.5, 83), (27.5, 74), (31.0, 79)):
        add_tone(samples, start_beat * beat, 0.34 * beat, midi(note), 0.055, timbre="glass", attack=0.002, release=0.07, decay=2.7)
    add_tone(samples, 0.0, duration, 60.0, 0.018, timbre="sine", attack=0.15, release=0.15)
    add_tone(samples, 0.0, duration, 120.0, 0.009, timbre="sine", attack=0.15, release=0.15, phase_offset=0.9)
    return samples


def build_animal_wing(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    beat = duration / 24.0
    chords = ((53, 57, 60), (46, 50, 53), (50, 53, 57), (48, 52, 55), (53, 57, 60), (48, 52, 55))
    roots = (41, 34, 38, 36, 41, 36)
    for bar, chord in enumerate(chords):
        start = bar * 4.0 * beat
        add_chord(samples, start, 3.9 * beat, chord, 0.064, timbre="warm", attack=0.09, release=0.2)
        for pulse in (0.0, 2.0):
            add_tone(samples, start + pulse * beat, 0.8 * beat, midi(roots[bar]), 0.08, timbre="pluck", attack=0.003, release=0.1, decay=2.2)
    melody = (65, 69, 72, 69, 70, 67, 65, 62, 65, 69, 74, 72, 69, 65, 64, 67, 69, 72, 77, 74, 72, 67, 64, 67)
    for index, note in enumerate(melody):
        if index % 4 == 3:
            continue
        add_tone(samples, index * beat, 0.55 * beat, midi(note), 0.075, timbre="pluck", attack=0.002, release=0.08, decay=2.9)
    for index in range(12):
        add_hat(samples, (index * 2.0 + 1.0) * beat, rng, 0.021)
    for start_beat, base in ((5.45, 520.0), (13.4, 610.0), (21.35, 560.0)):
        add_chirp(samples, start_beat * beat, 0.23, base, base * 1.3, 0.032, release=0.05, wobble=0.025, harmonic=0.2)
        add_chirp(samples, start_beat * beat + 0.28, 0.18, base * 1.15, base * 0.86, 0.025, release=0.05, harmonic=0.2)
    add_noise(samples, 0.0, duration, 0.013, rng, colour=0.995, attack=0.16, release=0.16)
    return samples


def build_cath_tension(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    beat = duration / 32.0
    drones = ((38, 50, 53), (39, 50, 54), (38, 48, 53), (37, 49, 52))
    for section, chord in enumerate(drones):
        add_chord(samples, section * 8.0 * beat, 7.95 * beat, chord, 0.086, timbre="pad", attack=0.3, release=0.35)
    pulse_notes = (38, 38, 41, 37, 38, 44, 41, 37)
    for index in range(32):
        add_tone(samples, index * beat, 0.42 * beat, midi(pulse_notes[index % 8]), 0.072, timbre="warm", attack=0.004, release=0.045, decay=1.5)
        if index % 4 == 0:
            add_kick(samples, index * beat, 0.105)
            add_kick(samples, index * beat + 0.18, 0.058)
        if index % 4 == 3:
            frequency = 870.0 if index % 8 == 3 else 1040.0
            add_tone(samples, index * beat, 0.12, frequency, 0.045, timbre="sine", attack=0.002, release=0.025)
    for index in range(64):
        if index % 2:
            add_hat(samples, index * beat / 2.0, rng, 0.017)
    for start_beat in (6.0, 14.0, 22.0, 30.0):
        add_chirp(samples, start_beat * beat, 0.75, 180.0, 360.0, 0.035, attack=0.06, release=0.12, harmonic=0.25)
    add_noise(samples, 0.0, duration, 0.015, rng, colour=0.985, attack=0.18, release=0.18)
    return samples


def build_rain_carpark(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, duration, 0.095, rng, colour=0.82, highpass=True, attack=0.14, release=0.14)
    add_noise(samples, 0.0, duration, 0.07, rng, colour=0.992, attack=0.14, release=0.14)
    for _ in range(74):
        start = rng.uniform(0.08, duration - 0.15)
        length = rng.uniform(0.025, 0.09)
        frequency = rng.uniform(900.0, 2_700.0)
        add_chirp(samples, start, length, frequency, frequency * rng.uniform(0.72, 0.96), rng.uniform(0.012, 0.033), attack=0.001, release=length * 0.62)
    # Slow neon transformers and an unresolved city chord provide the noir bed.
    add_tone(samples, 0.0, duration, 50.0, 0.035, timbre="warm", attack=0.5, release=0.5, vibrato_rate=0.17, vibrato_semitones=0.04)
    add_tone(samples, 0.0, duration, 58.27, 0.022, timbre="sine", attack=0.5, release=0.5, phase_offset=1.2)
    add_tone(samples, 0.0, duration, 74.0, 0.018, timbre="sine", attack=0.5, release=0.5, phase_offset=2.1)
    for start in (4.1, 12.7):
        add_chirp(samples, start, 1.7, 132.0, 108.0, 0.016, attack=0.2, release=0.6, harmonic=0.35)
    return samples


def build_coffee_finale(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    beat = duration / 24.0
    chords = ((48, 52, 55, 59), (45, 48, 52, 55), (50, 53, 57, 60), (43, 47, 50, 53), (48, 52, 55, 59), (43, 47, 50, 53))
    roots = (36, 33, 38, 31, 36, 31)
    for bar, chord in enumerate(chords):
        start = bar * 4.0 * beat
        add_chord(samples, start, 3.92 * beat, chord, 0.088, timbre="warm", attack=0.055, release=0.18)
        walk = (roots[bar], roots[bar] + 7, roots[bar] + 9, roots[bar] + 11)
        for step, note in enumerate(walk):
            add_tone(samples, start + step * beat, 0.72 * beat, midi(note), 0.082, timbre="pluck", attack=0.003, release=0.08, decay=1.7)
    melody = ((0, 72), (1, 76), (2, 79), (3, 83), (4, 81), (6, 79), (8, 74), (9, 77), (10, 81), (12, 79), (13, 76), (14, 74), (16, 72), (17, 76), (18, 79), (20, 74), (21, 71), (22, 67))
    for start_beat, note in melody:
        add_tone(samples, start_beat * beat, 0.58 * beat, midi(note), 0.073, timbre="glass", attack=0.002, release=0.11, decay=2.1)
    for index in range(48):
        add_hat(samples, index * beat / 2.0, rng, 0.018 if index % 4 else 0.034)
    for bar in range(6):
        add_kick(samples, bar * 4.0 * beat, 0.105)
        add_brush(samples, (bar * 4.0 + 2.0) * beat, rng, 0.032)
    return samples


def build_ui_focus(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_tone(samples, 0.0, duration, 760.0, 0.22, timbre="glass", attack=0.002, release=0.055, decay=2.0)
    return samples


def build_ui_confirm(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_tone(samples, 0.0, 0.15, 620.0, 0.2, timbre="glass", attack=0.002, release=0.05, decay=2.0)
    add_tone(samples, 0.075, 0.165, 930.0, 0.19, timbre="glass", attack=0.002, release=0.075, decay=2.0)
    return samples


def build_ui_back(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_chirp(samples, 0.0, duration, 520.0, 260.0, 0.22, attack=0.003, release=0.08, harmonic=0.25)
    return samples


def build_interaction_use(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, 0.075, 0.12, rng, colour=0.3, highpass=True, release=0.05)
    add_tone(samples, 0.035, 0.24, 410.0, 0.19, timbre="glass", attack=0.002, release=0.12, decay=2.7)
    return samples


def build_door_hiss(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, duration, 0.28, rng, colour=0.94, highpass=True, attack=0.09, release=0.18)
    add_chirp(samples, 0.03, duration * 0.88, 82.0, 49.0, 0.16, attack=0.05, release=0.16, harmonic=0.22)
    add_noise(samples, duration * 0.78, duration * 0.2, 0.2, rng, colour=0.45, attack=0.002, release=0.1)
    return samples


def build_door_latch(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, 0.055, 0.28, rng, colour=0.2, release=0.035)
    add_tone(samples, 0.01, 0.28, 150.0, 0.22, timbre="brass", attack=0.002, release=0.15, decay=3.2)
    add_noise(samples, 0.17, 0.08, 0.16, rng, colour=0.55, release=0.055)
    return samples


def build_feed_scoop(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, duration, 0.09, rng, colour=0.72, highpass=True, attack=0.04, release=0.16)
    for _ in range(72):
        start = rng.uniform(0.04, duration - 0.06)
        add_noise(samples, start, rng.uniform(0.012, 0.04), rng.uniform(0.025, 0.075), rng, colour=0.2, highpass=True, attack=0.001, release=0.02)
    add_tone(samples, 0.05, duration * 0.75, 188.0, 0.05, timbre="warm", attack=0.02, release=0.18, glide_semitones=-5.0)
    return samples


def build_sample_vial(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    for start, frequency, amp in ((0.0, 1_740.0, 0.2), (0.095, 2_280.0, 0.13), (0.42, 910.0, 0.14)):
        add_tone(samples, start, 0.31, frequency, amp, timbre="glass", attack=0.001, release=0.18, decay=3.2)
    add_tone(samples, 0.52, 0.25, 1_210.0, 0.12, timbre="sine", attack=0.002, release=0.09)
    return samples


def build_objective_update(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    for index, note in enumerate((67, 72, 76)):
        add_tone(samples, index * 0.115, 0.34, midi(note), 0.16, timbre="glass", attack=0.002, release=0.17, decay=2.1)
    return samples


def build_success_sting(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    for index, note in enumerate((60, 64, 67, 71, 72)):
        add_tone(samples, index * 0.18, 0.75, midi(note), 0.15, timbre="glass", attack=0.004, release=0.28, decay=1.3)
    add_chord(samples, 0.92, duration - 0.92, (60, 64, 67, 71), 0.16, timbre="warm", attack=0.03, release=0.38)
    return samples


def build_failure_sting(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    for index, note in enumerate((66, 62, 59, 55)):
        add_tone(samples, index * 0.21, 0.62, midi(note), 0.15, timbre="reed", attack=0.007, release=0.25, decay=1.6, vibrato_rate=5.2, vibrato_semitones=0.11)
    add_chirp(samples, 0.83, duration - 0.83, 115.0, 58.0, 0.13, attack=0.04, release=0.34, harmonic=0.3)
    return samples


def build_car_horn(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_tone(samples, 0.0, duration, 233.1, 0.27, timbre="brass", attack=0.045, release=0.16, vibrato_rate=5.0, vibrato_semitones=0.05)
    add_tone(samples, 0.0, duration, 293.7, 0.22, timbre="brass", attack=0.05, release=0.16, vibrato_rate=4.7, vibrato_semitones=0.04, phase_offset=0.6)
    return samples


def build_pig_grunt(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_chirp(samples, 0.02, 0.38, 115.0, 72.0, 0.28, attack=0.025, release=0.12, wobble=0.08, harmonic=0.42)
    add_chirp(samples, 0.38, 0.4, 98.0, 62.0, 0.22, attack=0.02, release=0.16, wobble=0.1, harmonic=0.5)
    add_noise(samples, 0.0, duration * 0.94, 0.07, rng, colour=0.95, attack=0.02, release=0.18)
    return samples


def build_sheep_bleat(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_chirp(samples, 0.02, duration * 0.9, 230.0, 190.0, 0.25, attack=0.06, release=0.2, wobble=0.12, harmonic=0.55)
    add_tone(samples, 0.04, duration * 0.82, 710.0, 0.08, timbre="reed", attack=0.06, release=0.2, vibrato_rate=9.2, vibrato_semitones=0.7)
    add_noise(samples, 0.0, duration * 0.9, 0.035, rng, colour=0.8, attack=0.04, release=0.2)
    return samples


def build_baboon_call(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    for start, low, high, amp in ((0.0, 260.0, 520.0, 0.24), (0.28, 330.0, 690.0, 0.21), (0.61, 280.0, 470.0, 0.2)):
        add_chirp(samples, start, 0.42, low, high, amp, attack=0.025, release=0.12, wobble=0.065, harmonic=0.5)
    add_noise(samples, 0.0, duration * 0.94, 0.04, rng, colour=0.88, attack=0.03, release=0.18)
    return samples


def build_footstep(duration: float, rng: random.Random, *, variant: int) -> list[float]:
    samples = blank(duration)
    base = 145.0 if variant == 1 else 167.0
    add_noise(samples, 0.0, 0.095, 0.27, rng, colour=0.48, attack=0.002, release=0.07)
    add_chirp(samples, 0.0, 0.17, base, base * 0.62, 0.2, attack=0.002, release=0.09, harmonic=0.25)
    add_noise(samples, 0.075, 0.13, 0.08, rng, colour=0.83, highpass=True, release=0.08)
    return samples


def build_footstep_a(duration: float, rng: random.Random) -> list[float]:
    return build_footstep(duration, rng, variant=1)


def build_footstep_b(duration: float, rng: random.Random) -> list[float]:
    return build_footstep(duration, rng, variant=2)


def build_machine_beep(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_tone(samples, 0.0, 0.16, 880.0, 0.2, timbre="sine", attack=0.003, release=0.04)
    add_tone(samples, 0.21, 0.2, 1_174.7, 0.18, timbre="sine", attack=0.003, release=0.06)
    return samples


def build_coffee_pour(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, duration, 0.13, rng, colour=0.88, highpass=True, attack=0.09, release=0.2)
    for _ in range(20):
        start = rng.uniform(0.08, duration - 0.13)
        add_chirp(samples, start, rng.uniform(0.035, 0.09), rng.uniform(420.0, 780.0), rng.uniform(230.0, 410.0), rng.uniform(0.018, 0.05), attack=0.001, release=0.04)
    add_tone(samples, 0.12, duration * 0.72, 96.0, 0.045, timbre="warm", attack=0.08, release=0.23, glide_semitones=-2.0)
    return samples


def build_transition_whoosh(duration: float, rng: random.Random) -> list[float]:
    samples = blank(duration)
    add_noise(samples, 0.0, duration, 0.25, rng, colour=0.9, highpass=True, attack=0.22, release=0.18)
    add_chirp(samples, 0.0, duration, 120.0, 740.0, 0.14, attack=0.16, release=0.2, harmonic=0.22)
    return samples


ASSETS: tuple[Asset, ...] = (
    Asset("title_noir.wav", 16.00, 0.78, True, 1001, build_title_noir),
    Asset("facility_pulse.wav", 16.00, 0.76, True, 1002, build_facility_pulse),
    Asset("animal_wing.wav", 18.00, 0.74, True, 1003, build_animal_wing),
    Asset("cath_tension.wav", 16.00, 0.78, True, 1004, build_cath_tension),
    Asset("rain_carpark.wav", 20.00, 0.68, True, 1005, build_rain_carpark),
    Asset("coffee_finale.wav", 18.00, 0.78, True, 1006, build_coffee_finale),
    Asset("ui_focus.wav", 0.12, 0.62, False, 2001, build_ui_focus),
    Asset("ui_confirm.wav", 0.24, 0.66, False, 2002, build_ui_confirm),
    Asset("ui_back.wav", 0.22, 0.63, False, 2003, build_ui_back),
    Asset("interaction_use.wav", 0.28, 0.67, False, 2004, build_interaction_use),
    Asset("door_hiss.wav", 0.85, 0.72, False, 2005, build_door_hiss),
    Asset("door_latch.wav", 0.42, 0.72, False, 2006, build_door_latch),
    Asset("feed_scoop.wav", 0.90, 0.66, False, 2007, build_feed_scoop),
    Asset("sample_vial.wav", 0.80, 0.68, False, 2008, build_sample_vial),
    Asset("objective_update.wav", 0.65, 0.68, False, 2009, build_objective_update),
    Asset("success_sting.wav", 1.80, 0.76, False, 2010, build_success_sting),
    Asset("failure_sting.wav", 1.55, 0.73, False, 2011, build_failure_sting),
    Asset("car_horn.wav", 0.90, 0.71, False, 2012, build_car_horn),
    Asset("animal_pig_grunt.wav", 0.85, 0.72, False, 2013, build_pig_grunt),
    Asset("animal_sheep_bleat.wav", 1.00, 0.72, False, 2014, build_sheep_bleat),
    Asset("animal_baboon_call.wav", 1.10, 0.72, False, 2015, build_baboon_call),
    Asset("footstep_tile_a.wav", 0.24, 0.66, False, 2016, build_footstep_a),
    Asset("footstep_tile_b.wav", 0.24, 0.66, False, 2017, build_footstep_b),
    Asset("machine_beep.wav", 0.45, 0.64, False, 2018, build_machine_beep),
    Asset("coffee_pour.wav", 1.25, 0.68, False, 2019, build_coffee_pour),
    Asset("transition_whoosh.wav", 0.75, 0.70, False, 2020, build_transition_whoosh),
)


def write_wave(path: Path, samples: list[float]) -> None:
    """Write atomically so an interrupted render cannot masquerade as complete."""
    temporary = path.with_suffix(path.suffix + ".tmp")
    try:
        with wave.open(str(temporary), "wb") as output:
            output.setnchannels(CHANNELS)
            output.setsampwidth(SAMPLE_WIDTH)
            output.setframerate(RATE)
            for offset in range(0, len(samples), 4_096):
                chunk = samples[offset : offset + 4_096]
                pcm = [max(-32_767, min(32_767, int(round(value * 32_767.0)))) for value in chunk]
                output.writeframesraw(struct.pack(f"<{len(pcm)}h", *pcm))
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def existing_render_is_valid(path: Path, asset: Asset) -> bool:
    if not path.is_file():
        return False
    try:
        with wave.open(str(path), "rb") as source:
            return (
                source.getnchannels() == CHANNELS
                and source.getsampwidth() == SAMPLE_WIDTH
                and source.getframerate() == RATE
                and source.getnframes() == int(round(asset.duration * RATE))
                and source.getcomptype() == "NONE"
            )
    except (OSError, wave.Error):
        return False


def generate_all(*, only_missing: bool = False) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        destination = OUTPUT_DIR / asset.filename
        if only_missing and existing_render_is_valid(destination, asset):
            print(f"kept      {asset.filename:<25} (valid existing render)")
            continue
        rng = random.Random(asset.seed)
        samples = asset.builder(asset.duration, rng)
        expected_frames = int(round(asset.duration * RATE))
        if len(samples) != expected_frames:
            raise ValueError(f"{asset.filename}: expected {expected_frames} frames, got {len(samples)}")
        samples = finalize(samples, asset.target_peak, loop=asset.loop)
        write_wave(destination, samples)
        size_kib = destination.stat().st_size / 1024.0
        print(f"generated {asset.filename:<25} {asset.duration:>5.2f}s  {size_kib:>7.1f} KiB")


def main() -> int:
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] != "--missing"):
        print("Usage: python scripts/generate_audio.py [--missing]", file=sys.stderr)
        return 2
    generate_all(only_missing="--missing" in sys.argv[1:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
