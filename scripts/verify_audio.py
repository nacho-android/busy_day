#!/usr/bin/env python3
"""Read-only structural and signal-level verification for generated WAV files."""

from __future__ import annotations

import math
import struct
import sys
import wave

from generate_audio import ASSETS, CHANNELS, OUTPUT_DIR, RATE, SAMPLE_WIDTH


def verify() -> int:
    errors: list[str] = []
    expected_names = {asset.filename for asset in ASSETS}
    actual_names = {path.name for path in OUTPUT_DIR.glob("*.wav")}
    for missing in sorted(expected_names - actual_names):
        errors.append(f"missing expected asset: {missing}")
    for unexpected in sorted(actual_names - expected_names):
        errors.append(f"unexpected WAV asset: {unexpected}")

    print("file                         seconds   frames   peak    rms     dc      edge")
    print("---------------------------  -------  -------  ------  ------  ------  ------")
    for asset in ASSETS:
        path = OUTPUT_DIR / asset.filename
        if not path.exists():
            continue
        try:
            with wave.open(str(path), "rb") as source:
                channels = source.getnchannels()
                width = source.getsampwidth()
                rate = source.getframerate()
                frames = source.getnframes()
                compression = source.getcomptype()
                raw = source.readframes(frames)
        except (wave.Error, OSError) as exc:
            errors.append(f"{asset.filename}: unreadable WAV ({exc})")
            continue

        expected_frames = int(round(asset.duration * RATE))
        if channels != CHANNELS:
            errors.append(f"{asset.filename}: channels={channels}, expected {CHANNELS}")
        if width != SAMPLE_WIDTH:
            errors.append(f"{asset.filename}: sample width={width}, expected {SAMPLE_WIDTH}")
        if rate != RATE:
            errors.append(f"{asset.filename}: rate={rate}, expected {RATE}")
        if frames != expected_frames:
            errors.append(f"{asset.filename}: frames={frames}, expected {expected_frames}")
        if compression != "NONE":
            errors.append(f"{asset.filename}: compression={compression}, expected NONE")
        if len(raw) != frames * channels * width:
            errors.append(f"{asset.filename}: PCM payload has the wrong byte length")
            continue

        peak_integer = 0
        square_sum = 0.0
        sample_sum = 0
        first = 0
        last = 0
        count = 0
        for (value,) in struct.iter_unpack("<h", raw):
            if count == 0:
                first = value
            last = value
            count += 1
            peak_integer = max(peak_integer, abs(value))
            sample_sum += value
            square_sum += float(value) * float(value)
        peak = peak_integer / 32_767.0
        rms = math.sqrt(square_sum / max(1, count)) / 32_767.0
        dc = sample_sum / max(1, count) / 32_767.0
        edge = abs(last - first) / 32_767.0
        seconds = frames / rate
        print(f"{asset.filename:<27}  {seconds:7.3f}  {frames:7d}  {peak:6.3f}  {rms:6.3f}  {dc:+6.3f}  {edge:6.3f}")

        if peak > 0.90:
            errors.append(f"{asset.filename}: peak {peak:.3f} exceeds safety ceiling 0.900")
        if peak < 0.05:
            errors.append(f"{asset.filename}: unexpectedly quiet peak {peak:.3f}")
        if abs(dc) > 0.01:
            errors.append(f"{asset.filename}: DC offset {dc:+.4f} exceeds 0.01")
        if asset.loop and edge > 0.01:
            errors.append(f"{asset.filename}: loop-edge delta {edge:.4f} exceeds 0.01")

    total_bytes = sum((OUTPUT_DIR / asset.filename).stat().st_size for asset in ASSETS if (OUTPUT_DIR / asset.filename).exists())
    print(f"\n{len(expected_names)} assets, {total_bytes / (1024 * 1024):.2f} MiB total")
    if errors:
        print("\nVerification failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Verification passed: PCM headers, durations, payloads, peaks, DC offset, and loop seams are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(verify())
