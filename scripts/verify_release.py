"""Static, dependency-free release checks for Busy Day V2.

This verifier deliberately complements rather than replaces TypeScript, Vitest,
Playwright, the production build, visual review, and physical-device testing.
"""

from __future__ import annotations

import hashlib
import json
import re
import struct
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
V1_HASH = "A36E47A820A947CE7025311A3F89AC96EE119F649FE1524BD42C49D707154A85"
V1_BYTES = 168_208
EXPECTED_REFERENCE_COUNTS = {".jpeg": 38, ".jpg": 4, ".png": 1}
EXPECTED_BACKGROUND_MASTERS = {
    "title_master.png",
    "facility_hub_master.png",
    "feed_store_master.png",
    "pig_housing_master.png",
    "sheep_scales_master.png",
    "baboon_wing_master.png",
    "procedure_prep_master.png",
    "cath_lab_master.png",
    "car_park_master.png",
    "coffee_shop_master.png",
    "tea_room_master.png",
}
EXPECTED_MASTER_DIMENSIONS = {
    **{name: (1672, 941) for name in EXPECTED_BACKGROUND_MASTERS},
    "facility_hub_v2_master.png": (1672, 941),
    "tea_room_v2_master.png": (1672, 941),
    "car_park_empty_master.png": (1671, 941),
    "dialogue_portraits_master.png": (2048, 1024),
}
EXPECTED_RUNTIME_BACKGROUNDS = {
    "title.webp",
    "facility_hub.webp",
    "feed-store.webp",
    "pig_housing.webp",
    "sheep-scales.webp",
    "baboon-wing.webp",
    "procedure-prep.webp",
    "cath_lab.webp",
    "car_park.webp",
    "coffee-shop.webp",
    "tea_room.webp",
}
EXPECTED_RUNTIME_PORTRAITS = {
    "mel.webp",
    "josh.webp",
    "sally.webp",
    "juan.webp",
    "alan.webp",
    "dhanya.webp",
    "ross.webp",
    "wayne.webp",
}
REQUIRED_DOCS = {
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "docs/V1_AUDIT.md",
    "docs/V2_GAME_DESIGN.md",
    "docs/ASSET_MANIFEST.md",
    "docs/AUDIO_MANIFEST.md",
    "docs/ARCHITECTURE.md",
    "docs/IMPLEMENTATION_CHECKLIST.md",
    "docs/KNOWN_LIMITATIONS.md",
    "docs/RELEASE_RUNBOOK.md",
    "docs/REFERENCE_INVENTORY.json",
}
EXCLUDED_DIRS = {
    ".agents",
    ".clean-install-019f5b96",
    ".codex",
    ".git",
    ".vite",
    "__pycache__",
    "coverage",
    "dist",
    "node_modules",
    "playwright-preview-report",
    "playwright-report",
    "test-results",
    "test-results-preview",
    "visual-qa",
}
SECRET_PATTERNS = {
    "private key": re.compile(rb"BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY", re.I),
    "GitHub classic token": re.compile(rb"ghp_[A-Za-z0-9]{20,}"),
    "GitHub fine-grained token": re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"),
    "bearer token": re.compile(rb"authorization\s*:\s*bearer\s+[A-Za-z0-9._~+/=-]{16,}", re.I),
    "credential assignment": re.compile(
        rb"(?:api[_-]?key|client[_-]?secret|password)\s*[:=]\s*['\"][^'\"\r\n]{8,}['\"]",
        re.I,
    ),
}
PRIVATE_DERIVATIVE_IGNORE_RULES = {
    "/art/generated-sources/character-sprites/*_reference_*",
    "/art/generated-sources/character-sprites/style_ref_*",
}


def looks_like_private_reference_derivative(relative: Path) -> bool:
    name = relative.name.lower()
    return "_reference_" in name or name.startswith("style_ref_")


def is_private_reference_derivative(relative: Path) -> bool:
    """Return true for local generation inputs that reproduce supplied refs."""
    return (
        relative.parent.as_posix() == "art/generated-sources/character-sprites"
        and looks_like_private_reference_derivative(relative)
    )


class Verification:
    def __init__(self) -> None:
        self.passes: list[str] = []
        self.failures: list[str] = []

    def require(self, condition: bool, passed: str, failed: str) -> None:
        if condition:
            self.passes.append(passed)
        else:
            self.failures.append(failed)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as source:
        header = source.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"{path} is not a PNG with an IHDR header")
    return struct.unpack(">II", header[16:24])


def webp_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError(f"{path} is not a WebP RIFF container")
    chunk = data[12:16]
    if chunk == b"VP8X":
        return (1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little"))
    if chunk == b"VP8 ":
        if data[23:26] != b"\x9d\x01\x2a":
            raise ValueError(f"{path} has an invalid VP8 frame header")
        return (
            int.from_bytes(data[26:28], "little") & 0x3FFF,
            int.from_bytes(data[28:30], "little") & 0x3FFF,
        )
    if chunk == b"VP8L":
        if data[20] != 0x2F:
            raise ValueError(f"{path} has an invalid VP8L signature")
        bits = int.from_bytes(data[21:25], "little")
        return (1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF))
    raise ValueError(f"{path} uses an unsupported WebP chunk {chunk!r}")


def release_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDED_DIRS for part in relative.parts):
            continue
        if relative.parts[0] == "screenshots":
            continue
        if len(relative.parts) == 1 and (
            relative.suffix.lower() in {".jpeg", ".jpg"}
            or relative.name in {"style_ref.png", "debug.log"}
        ):
            continue
        if is_private_reference_derivative(relative):
            continue
        if relative.suffix.lower() in {".log", ".tsbuildinfo", ".pyc"}:
            continue
        if relative.name.startswith(".env") and relative.name != ".env.example":
            continue
        files.append(relative)
    return sorted(files)


def verify_v1(check: Verification) -> None:
    path = ROOT / "Busy_Day_v1.html"
    check.require(path.exists(), "V1 file exists", "Busy_Day_v1.html is missing")
    if not path.exists():
        return
    check.require(path.stat().st_size == V1_BYTES, "V1 byte size is preserved", "V1 byte size changed")
    check.require(sha256(path) == V1_HASH, "V1 SHA-256 is preserved", "V1 SHA-256 changed")


def verify_references(check: Verification) -> None:
    inventory_path = ROOT / "docs" / "REFERENCE_INVENTORY.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    entries = inventory.get("files", [])
    valid_entries = [
        entry for entry in entries if isinstance(entry, dict) and isinstance(entry.get("filename"), str)
    ]
    catalog = {entry["filename"]: entry for entry in valid_entries}
    counts = {extension: 0 for extension in EXPECTED_REFERENCE_COUNTS}
    for filename in catalog:
        extension = Path(filename).suffix.lower()
        if extension in counts:
            counts[extension] += 1
    check.require(
        isinstance(entries, list)
        and len(entries) == len(valid_entries) == len(catalog) == sum(EXPECTED_REFERENCE_COUNTS.values())
        and counts == EXPECTED_REFERENCE_COUNTS,
        "The private-reference integrity catalog records all 43 supplied files",
        f"Reference catalog is incomplete or duplicated: {len(entries)} entries, counts {counts!r}",
    )

    malformed = sorted(
        filename
        for filename, entry in catalog.items()
        if not isinstance(entry.get("bytes"), int)
        or entry["bytes"] <= 0
        or not re.fullmatch(r"[A-F0-9]{64}", str(entry.get("sha256", "")))
    )
    check.require(not malformed, "Reference catalog integrity fields are valid", f"Malformed reference entries: {malformed}")

    asset_manifest = (ROOT / "docs" / "ASSET_MANIFEST.md").read_text(encoding="utf-8")
    undocumented = sorted(filename for filename in catalog if f"`{filename}`" not in asset_manifest)
    check.require(not undocumented, "Every catalogued reference is described in the asset manifest", f"Undocumented references: {undocumented}")

    present = {filename for filename in catalog if (ROOT / filename).is_file()}
    if present:
        missing = sorted(set(catalog) - present)
        mismatched = sorted(
            filename
            for filename in present
            if (ROOT / filename).stat().st_size != catalog[filename]["bytes"]
            or sha256(ROOT / filename) != catalog[filename]["sha256"]
        )
        check.require(not missing, "All private references are present when source mode is active", f"Partial reference set: {missing}")
        check.require(not mismatched, "Private reference sizes and hashes match the catalog", f"Changed references: {mismatched}")
    else:
        check.passes.append("Private references are intentionally omitted from release; integrity catalog retained")

    runtime_names = {path.name for path in (ROOT / "public").rglob("*") if path.is_file()}
    leaked = sorted(runtime_names & set(catalog))
    check.require(not leaked, "Raw references are absent from public/", f"Raw references leaked into public/: {leaked}")


def verify_package(check: Verification) -> None:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    root_lock = lock.get("packages", {}).get("", {})
    required_scripts = {"build", "dev", "lint", "test", "test:e2e", "typecheck", "verify:release"}
    check.require(package.get("private") is True, "Package is private", "package.json must remain private")
    check.require(
        required_scripts <= set(package.get("scripts", {})),
        "Required npm scripts are declared",
        f"Missing npm scripts: {sorted(required_scripts - set(package.get('scripts', {})))}",
    )
    check.require(
        package.get("engines") == root_lock.get("engines"),
        "Package and lockfile engines agree",
        "package.json and package-lock.json engine declarations differ",
    )
    check.require(
        package.get("dependencies") == root_lock.get("dependencies"),
        "Package and lockfile runtime dependencies agree",
        "package.json and package-lock.json runtime dependencies differ",
    )


def verify_art(check: Verification) -> None:
    master_dir = ROOT / "art" / "generated-masters"
    background_dir = ROOT / "public" / "assets" / "backgrounds"
    portrait_dir = ROOT / "public" / "assets" / "portraits"
    masters = {path.name for path in master_dir.glob("*") if path.is_file()}
    backgrounds = {path.name for path in background_dir.glob("*") if path.is_file()}
    portraits = {path.name for path in portrait_dir.glob("*") if path.is_file()}
    check.require(
        masters == set(EXPECTED_MASTER_DIMENSIONS),
        "All generated environment and portrait masters exist",
        f"Master set differs: {sorted(masters)}",
    )
    check.require(
        backgrounds == EXPECTED_RUNTIME_BACKGROUNDS,
        "All 11 runtime backgrounds exist",
        f"Runtime background set differs: {sorted(backgrounds)}",
    )
    check.require(
        portraits == EXPECTED_RUNTIME_PORTRAITS,
        "All eight runtime dialogue portraits exist",
        f"Runtime portrait set differs: {sorted(portraits)}",
    )
    wrong_dimensions: list[str] = []
    for name, expected in sorted(EXPECTED_MASTER_DIMENSIONS.items()):
        path = master_dir / name
        if path.exists() and png_dimensions(path) != expected:
            wrong_dimensions.append(f"{name}={png_dimensions(path)}")
    for name in sorted(EXPECTED_RUNTIME_BACKGROUNDS):
        path = background_dir / name
        if path.exists() and webp_dimensions(path) != (1280, 720):
            wrong_dimensions.append(f"{name}={webp_dimensions(path)}")
    for name in sorted(EXPECTED_RUNTIME_PORTRAITS):
        path = portrait_dir / name
        if path.exists() and webp_dimensions(path) != (384, 384):
            wrong_dimensions.append(f"{name}={webp_dimensions(path)}")
    check.require(not wrong_dimensions, "Generated image dimensions match the manifest", f"Wrong image dimensions: {wrong_dimensions}")

    asset_catalog = (ROOT / "src" / "data" / "assets.ts").read_text(encoding="utf-8")
    catalogued_backgrounds = set(re.findall(r"'backgrounds/([^']+)'", asset_catalog))
    catalogued_portraits = set(re.findall(r"'portraits/([^']+)'", asset_catalog))
    check.require(
        catalogued_backgrounds == EXPECTED_RUNTIME_BACKGROUNDS,
        "The data asset catalog references exactly the 11 runtime backgrounds",
        f"Background catalog differs: {sorted(catalogued_backgrounds)}",
    )
    check.require(
        catalogued_portraits == EXPECTED_RUNTIME_PORTRAITS,
        "The data asset catalog references exactly the eight runtime portraits",
        f"Portrait catalog differs: {sorted(catalogued_portraits)}",
    )
    preload = (ROOT / "src" / "scenes" / "PreloadScene.ts").read_text(encoding="utf-8")
    check.require(
        "BACKGROUND_ASSETS" in preload and "CHARACTER_VISUALS" in preload,
        "The preloader resolves backgrounds and character portraits through data catalogs",
        "PreloadScene no longer imports both BACKGROUND_ASSETS and CHARACTER_VISUALS",
    )


def verify_audio(check: Verification) -> None:
    audio_dir = ROOT / "public" / "assets" / "audio"
    wav_files = sorted(audio_dir.glob("*.wav"))
    check.require(len(wav_files) == 26, "All 26 original WAV assets exist", f"Expected 26 WAV files, found {len(wav_files)}")
    manifest = (ROOT / "docs" / "AUDIO_MANIFEST.md").read_text(encoding="utf-8")
    missing = [path.name for path in wav_files if path.name not in manifest]
    check.require(not missing, "Every WAV appears in the audio manifest", f"Audio manifest omissions: {missing}")


def verify_docs(check: Verification) -> None:
    missing = sorted(path for path in REQUIRED_DOCS if not (ROOT / path).exists())
    check.require(not missing, "Required production documentation exists", f"Missing documentation: {missing}")
    markdown_files = [ROOT / path for path in REQUIRED_DOCS if path.endswith(".md") and (ROOT / path).exists()]
    broken: list[str] = []
    link_pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for document in markdown_files:
        for target in link_pattern.findall(document.read_text(encoding="utf-8")):
            target = target.strip("<>")
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            relative_target = target.split("#", 1)[0]
            if relative_target and not (document.parent / relative_target).resolve().exists():
                broken.append(f"{document.relative_to(ROOT)} -> {target}")
    check.require(not broken, "Local Markdown links resolve", f"Broken Markdown links: {broken}")


def verify_release_scope(check: Verification) -> None:
    files = release_files()
    check.require(bool(files), "Release scope is non-empty", "Release scope is empty")
    oversized = [str(path) for path in files if (ROOT / path).stat().st_size >= 100 * 1024 * 1024]
    check.require(not oversized, "No intended file exceeds GitHub's 100 MiB limit", f"Oversized files: {oversized}")
    secret_hits: list[str] = []
    for relative in files:
        data = (ROOT / relative).read_bytes()
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(data):
                secret_hits.append(f"{relative} ({label})")
    check.require(not secret_hits, "No selected high-risk credential patterns were found", f"Credential-pattern hits: {secret_hits}")

    ignored_root_assets = [path for path in files if len(path.parts) == 1 and path.suffix.lower() in {".jpeg", ".jpg"}]
    check.require(not ignored_root_assets, "Raw JPEG references are excluded from release scope", f"Raw references in scope: {ignored_root_assets}")

    ignore_rules = set((ROOT / ".gitignore").read_text(encoding="utf-8").splitlines())
    check.require(
        PRIVATE_DERIVATIVE_IGNORE_RULES <= ignore_rules,
        "Private reference derivatives are excluded from Git scope",
        f"Missing private-derivative ignore rules: {sorted(PRIVATE_DERIVATIVE_IGNORE_RULES - ignore_rules)}",
    )
    public_derivatives = sorted(
        path.relative_to(ROOT)
        for path in (ROOT / "public").rglob("*")
        if path.is_file() and looks_like_private_reference_derivative(path.relative_to(ROOT))
    )
    check.require(
        not public_derivatives,
        "Private reference derivatives are absent from public/",
        f"Private reference derivatives leaked into public/: {public_derivatives}",
    )


def main() -> int:
    check = Verification()
    verify_v1(check)
    verify_references(check)
    verify_package(check)
    verify_art(check)
    verify_audio(check)
    verify_docs(check)
    verify_release_scope(check)

    for passed in check.passes:
        print(f"PASS  {passed}")
    if check.failures:
        print("\nRelease verification failed:", file=sys.stderr)
        for failure in check.failures:
            print(f"FAIL  {failure}", file=sys.stderr)
        return 1
    files = release_files()
    total = sum((ROOT / path).stat().st_size for path in files)
    print(f"\nRelease verification passed: {len(files)} intended files, {total / (1024 * 1024):.2f} MiB.")
    print("This static gate does not replace build, browser, visual, audio-listening, soak, or device tests.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
