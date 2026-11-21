"""Preprocessing only: cache hand crops; preserve and report all evaluation failures.

Uses the deployed hand-landmarker asset and the browser's largest-hand + 20%
padding geometry. IMAGE-mode tracking and Pillow resampling differ from the
browser's VIDEO mode/canvas; this is matched geometry, not bitwise parity.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import csv
import hashlib
import json
from pathlib import Path
import threading

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from PIL import Image

LOCAL = threading.local()
LABELS = list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
RECIPE = "v2-confidence06-context-replicate-rotation-retry-original-orientation"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifests", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--train-per-class", type=int, required=True)
    parser.add_argument("--fine-per-class", type=int, required=True)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    splits = {}
    for split in ("train", "fine-tune", "train-reserve", "validation", "test"):
        with (args.manifests / f"{split}.tsv").open(encoding="utf-8", newline="") as stream:
            splits[split] = list(csv.DictReader(stream, delimiter="\t"))
    model_hash = digest(args.model)

    def process(row):
        original = Path(row["path"])
        target = args.output / "images" / row["label"] / (original.stem + ".png")
        metadata = target.with_suffix(".json")
        if metadata.exists() and target.exists():
            saved = json.loads(metadata.read_text())
            if (saved["source_sha256"] == row["sha256"] and saved["model_sha256"] == model_hash
                    and saved.get("recipe") == RECIPE):
                return saved
        if digest(original) != row["sha256"]:
            raise ValueError(f"Source changed: {original}")
        if not hasattr(LOCAL, "detector"):
            LOCAL.detector = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(args.model.resolve())),
                running_mode=vision.RunningMode.IMAGE, num_hands=2,
                min_hand_detection_confidence=0.6, min_hand_presence_confidence=0.6))
        image = mp.Image.create_from_file(str(original))
        result = LOCAL.detector.detect(image)
        source = Image.open(original).convert("RGB")
        retry = None
        if not result.hand_landmarks:
            rgb = np.asarray(source)
            h, w = rgb.shape[:2]
            py, px = h // 3, w // 3
            padded = cv2.copyMakeBorder(rgb, py, py, px, px, cv2.BORDER_REPLICATE)
            for turns in (0, 1, 2, 3):
                candidate = np.ascontiguousarray(np.rot90(padded, turns))
                result = LOCAL.detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=candidate))
                if result.hand_landmarks:
                    retry = (turns, px, py, w, h)
                    break
        regions = []
        for points in result.hand_landmarks:
            coordinates = [(p.x, p.y) for p in points]
            if retry is not None:
                turns, px, py, w, h = retry
                mapped = []
                for u, v in coordinates:
                    if turns == 1:
                        u, v = 1-v, u
                    elif turns == 2:
                        u, v = 1-u, 1-v
                    elif turns == 3:
                        u, v = v, 1-u
                    mapped.append(((u*(w+2*px)-px)/w, (v*(h+2*py)-py)/h))
                coordinates = mapped
            left, right = min(p[0] for p in coordinates), max(p[0] for p in coordinates)
            top, bottom = min(p[1] for p in coordinates), max(p[1] for p in coordinates)
            px, py = (right - left) * 0.2, (bottom - top) * 0.2
            x, y = max(0, left - px), max(0, top - py)
            r, b = min(1, right + px), min(1, bottom + py)
            if r > x and b > y:
                regions.append((x, y, r, b))
        detected = bool(regions)
        if detected:
            x, y, r, b = max(regions, key=lambda box: (box[2] - box[0]) * (box[3] - box[1]))
            w, h = source.size
            crop = source.transform((240, 240), Image.Transform.EXTENT,
                                    (x*w, y*h, r*w, b*h), Image.Resampling.BILINEAR)
        else:
            # Retain evaluation rows. Trainer must count these as pipeline errors.
            crop = source.resize((240, 240), Image.Resampling.BILINEAR)
        target.parent.mkdir(parents=True, exist_ok=True)
        crop.save(target)
        saved = {"path": str(target.resolve()), "label": row["label"], "sha256": digest(target),
                 "source_path": str(original), "source_sha256": row["sha256"],
                 "model_sha256": model_hash, "detected": detected, "recipe": RECIPE,
                 "detection_retry_quarter_turns": None if retry is None else retry[0]}
        metadata.write_text(json.dumps(saved), encoding="utf-8")
        return saved

    processed = {}
    rows = [r for split in splits.values() for r in split]
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        for index, saved in enumerate(executor.map(process, rows), 1):
            processed[saved["source_path"]] = saved
            if index % 200 == 0 or index == len(rows):
                print(f"CROPPING {index}/{len(rows)}", flush=True)
    selected = {"train": [], "fine-tune": [], "validation": [], "test": []}
    for label in LABELS:
        reserve = [processed[r["path"]] for r in splits["train-reserve"] if r["label"] == label
                   and processed[r["path"]]["detected"]]
        for split, requested in (("train", args.train_per_class), ("fine-tune", args.fine_per_class)):
            usable = [processed[r["path"]] for r in splits[split] if r["label"] == label
                      and processed[r["path"]]["detected"]]
            missing = requested - len(usable)
            if missing > len(reserve):
                raise ValueError(f"Not enough detected training examples: {split}/{label}")
            selected[split].extend(usable + reserve[:missing])
            del reserve[:missing]
    for split in ("validation", "test"):
        selected[split] = [processed[r["path"]] for r in splits[split]]
    seen = set()
    for split, rows in selected.items():
        with (args.output / f"{split}.tsv").open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream, delimiter="\t", lineterminator="\n")
            writer.writerow(("path", "label", "sha256"))
            for row in rows:
                if row["sha256"] in seen:
                    raise ValueError("Crop content duplicate; refusing an overlapping or reduced-count run")
                seen.add(row["sha256"])
                writer.writerow((row["path"], row["label"], row["sha256"]))
        (args.output / f"{split}-detection-failures.txt").write_text(
            "".join(row["path"] + "\n" for row in rows if not row["detected"]), encoding="utf-8")
    audit = {"mediapipe": mp.__version__, "model_sha256": model_hash, "recipe": RECIPE,
             "geometry": "largest normalized hand bounds + 20% padding, clipped to image, resize 240",
             "limits": "IMAGE mode with context/rotation detection retries vs browser VIDEO mode: not equivalent detector coverage. Crops retain original orientation. Dataset pipeline metrics include retries; do not claim live browser detector parity.",
             "source_manifests": {f.name: digest(f) for f in args.manifests.glob("*.tsv")},
             "selected": {s: {"images": len(rs), "detection_failures": sum(not r["detected"] for r in rs),
                               "classes": dict(Counter(r["label"] for r in rs))} for s, rs in selected.items()}}
    (args.output / "preprocessing.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(json.dumps(audit, indent=2), flush=True)


if __name__ == "__main__":
    main()
