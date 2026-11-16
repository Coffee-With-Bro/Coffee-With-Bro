"""Create reproducible, content-disjoint manifests without modifying source images."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import random

EXPECTED = list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def prepare(data_dir, output_dir, validation_fraction=0.1, seed=42,
            train_per_class=None, validation_per_class=None, test_per_class=None,
            fine_tune_per_class=None):
    data_dir, output_dir = Path(data_dir).resolve(), Path(output_dir).resolve()
    if not 0 < validation_fraction < 1:
        raise ValueError("validation_fraction must be between 0 and 1")
    for count in (train_per_class, validation_per_class, test_per_class, fine_tune_per_class):
        if count is not None and count < 1:
            raise ValueError("Per-class counts must be positive")
    paths = []
    for split in ("train", "test"):
        directory = data_dir / split
        classes = sorted(p.name for p in directory.iterdir() if p.is_dir())
        if classes != EXPECTED:
            raise ValueError(f"{split}: expected exactly {EXPECTED}, found {classes}")
        for label in classes:
            images = sorted(p for p in (directory / label).rglob("*")
                            if p.is_file() and p.suffix.lower() in EXTENSIONS)
            if not images:
                raise ValueError(f"Empty class: {split}/{label}")
            paths.extend((split, label, p) for p in images)

    def fingerprint(item):
        split, label, path = item
        content = path.read_bytes()
        if not content:
            raise ValueError(f"Empty image: {path}")
        return split, label, path, hashlib.sha256(content).hexdigest()

    unique = {"train": {}, "test": {}}
    labels_by_hash = {}
    removed = Counter()
    with ThreadPoolExecutor(max_workers=8) as executor:
        for split, label, path, digest in executor.map(fingerprint, paths):
            if digest in labels_by_hash and labels_by_hash[digest] != label:
                raise ValueError(f"Identical images have conflicting labels: {path}")
            labels_by_hash[digest] = label
            if digest in unique[split]:
                removed[f"{split}_duplicates"] += 1
            else:
                unique[split][digest] = (path, label, digest)

    # Training owns shared content. Never expose it to validation or final testing.
    overlap = unique["train"].keys() & unique["test"].keys()
    removed["test_overlapping_train"] = len(overlap)
    test = [row for digest, row in unique["test"].items() if digest not in overlap]
    grouped = defaultdict(list)
    for row in unique["train"].values():
        grouped[row[1]].append(row)
    rng = random.Random(seed)
    train, validation, fine_tune = [], [], []
    for label in EXPECTED:
        rows = grouped[label]
        rng.shuffle(rows)
        n = validation_per_class or max(1, round(len(rows) * validation_fraction))
        fine_count = fine_tune_per_class or 0
        requested_train = train_per_class or len(rows) - n - fine_count
        if len(rows) < n + requested_train + fine_count:
            raise ValueError(f"{label}: need {requested_train + n + fine_count} unique training images, found {len(rows)}")
        validation.extend(rows[:n])
        train.extend(rows[n:n + requested_train])
        fine_tune.extend(rows[n + requested_train:n + requested_train + fine_count])
    if test_per_class is not None:
        selected = []
        for label in EXPECTED:
            rows = [row for row in test if row[1] == label]
            if len(rows) < test_per_class:
                raise ValueError(f"{label}: need {test_per_class} independent test images, found {len(rows)}")
            rng.shuffle(rows)
            selected.extend(rows[:test_per_class])
        test = selected
    splits = {"train": train, "validation": validation, "test": test}
    if fine_tune_per_class is not None:
        splits["fine-tune"] = fine_tune
    for split, rows in splits.items():
        if set(row[1] for row in rows) != set(EXPECTED):
            raise ValueError(f"{split} has missing classes after deduplication")
    output_dir.mkdir(parents=True, exist_ok=True)
    for split, rows in splits.items():
        text = "path\tlabel\tsha256\n" + "".join(
            f"{path.as_posix()}\t{label}\t{digest}\n" for path, label, digest in rows)
        (output_dir / f"{split}.tsv").write_text(text, encoding="utf-8")
    report = {"seed": seed, "data_dir": str(data_dir), "validation_fraction": validation_fraction,
              "requested_per_class": {"train": train_per_class, "fine_tune": fine_tune_per_class, "validation": validation_per_class, "test": test_per_class},
              "source_images": len(paths), "removed": dict(removed),
              "splits": {name: {"count": len(rows), "classes": dict(Counter(r[1] for r in rows))}
                         for name, rows in splits.items()},
              "limitations": ["Exact byte duplicates excluded; near duplicates are not detected.",
                              "Image-level split; results do not measure unseen-signer generalization."]}
    (output_dir / "dataset_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parent / "data")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "manifests")
    parser.add_argument("--validation-fraction", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-per-class", type=int)
    parser.add_argument("--validation-per-class", type=int)
    parser.add_argument("--test-per-class", type=int)
    parser.add_argument("--fine-tune-per-class", type=int)
    args = parser.parse_args()
    prepare(args.data_dir, args.output_dir, args.validation_fraction, args.seed,
            args.train_per_class, args.validation_per_class, args.test_per_class, args.fine_tune_per_class)
