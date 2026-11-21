"""Read-only split, capacity and perceptual-neighbour audit. Requires installed NumPy."""
from pathlib import Path
from collections import Counter, defaultdict
import bisect
import csv
import hashlib
import json
import statistics
import zipfile
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
RUN = ROOT / "ice_with_bro/runs/asl-350-50-100-14"


def main():
    with (HERE / "fingerprints.tsv").open() as source:
        rows = list(csv.DictReader(source, delimiter="\t"))
    splits = defaultdict(list)
    for row in rows:
        row["index"] = int(row["index"])
        row["hash"] = int(row["dhash"], 16)
        row["gray"] = np.frombuffer(bytes.fromhex(row["gray72"]), dtype=np.uint8).astype(np.int16)
        splits[row["split"]].append(row)
    details = {}
    digest_sets = {}
    for split, values in splits.items():
        manifest = list(csv.DictReader((RUN / "manifests" / f"{split}.tsv").open(), delimiter="\t"))
        digest_sets[split] = set(r["sha256"] for r in manifest)
        details[split] = {"images": len(values), "subjects": dict(sorted(Counter(r["subject"] for r in values).items())),
                          "subject_class_groups": len(set((r["subject"], r["label"]) for r in values))}
    overlaps = {f"{a} / {b}": len(digest_sets[a] & digest_sets[b])
                for i, a in enumerate(splits) for b in list(splits)[i + 1:]}
    train_groups = defaultdict(list)
    for row in splits["train"]:
        train_groups[row["label"], row["subject"]].append(row["index"])
    for values in train_groups.values(): values.sort()
    gaps = []
    for row in splits["test"]:
        values = train_groups[row["label"], row["subject"]]
        index = bisect.bisect_left(values, row["index"])
        gaps.append(min(abs(values[i] - row["index"]) for i in (index - 1, index) if 0 <= i < len(values)))
    neighbours = []
    for label in "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        train = [r for r in splits["train"] if r["label"] == label]
        test = [r for r in splits["test"] if r["label"] == label]
        gray = np.stack([r["gray"] for r in train])
        for row in test:
            distances = [(row["hash"] ^ r["hash"]).bit_count() for r in train]
            mae = np.abs(gray - row["gray"]).mean(axis=1) / 255
            same = [i for i, r in enumerate(train) if r["subject"] == row["subject"]]
            index = min(same, key=lambda i: (distances[i], mae[i]))
            reference = train[index]
            neighbours.append({"test": row["path"], "train": reference["path"], "label": label,
                               "subject": row["subject"], "hamming": distances[index], "gray_mae": float(mae[index]),
                               "index_gap": abs(row["index"] - reference["index"])})
    candidates = [r for r in neighbours if r["hamming"] <= 2 and r["gray_mae"] <= .02]
    examples = []
    for row in sorted(candidates, key=lambda r: (r["gray_mae"], r["hamming"])):
        if row["label"] not in {r["label"] for r in examples}: examples.append(row)
        if len(examples) == 6: break
    history = list(csv.DictReader((RUN / "history.csv").open()))
    epochs = [{key: float(value) if key not in ("epoch", "phase") else (int(value) if key == "epoch" else value)
               for key, value in row.items()} for row in history]
    with zipfile.ZipFile(RUN / "asl_cnn_model.zip") as source:
        config = json.loads(source.read("configuration.json"))
    layers = []; params = 0; convolution_macs = 0; total_macs = 0; spatial = 128
    for index, entry in enumerate(config["confs"]):
        layer = entry["layer"]; kind = layer["@class"].split(".")[-1]
        nin, nout = layer.get("nin", layer.get("nIn")), layer.get("nout", layer.get("nOut"))
        count, macs = 0, 0
        if kind == "ConvolutionLayer":
            count = (9 * nin + 1) * nout; macs = spatial * spatial * nout * 9 * nin
            convolution_macs += macs
        elif kind == "BatchNormalization": count = 4 * nout
        elif kind in ("DenseLayer", "OutputLayer"): count = (nin + 1) * nout; macs = nin * nout
        elif kind == "SubsamplingLayer": spatial //= 2
        params += count; total_macs += macs
        layers.append({"index": index, "kind": kind, "n_in": nin, "n_out": nout,
                       "parameter_slots": count, "macs": macs,
                       "activation": layer.get("activationFn", {}).get("@class", "").split(".")[-1],
                       "dropout": layer.get("idropout"), "regularization": layer.get("regularization")})
    dense_params = next(r["parameter_slots"] for r in layers if r["kind"] == "DenseLayer")
    confusion = list(csv.DictReader((RUN / "confusion.csv").open()))
    errors = [r for r in confusion if r["actual"] != r["predicted"] and int(r["count"])]
    fixture = "P10_0_1000.jpg"
    fixture_splits = [name for name, values in splits.items() if any(Path(r["path"]).name == fixture for r in values)]
    train_seconds = sum(r["seconds"] for r in epochs if r["phase"] == "train")
    result = {"audit_date": "2026-11-17", "run": str(RUN.relative_to(ROOT)),
              "splits": details, "exact_content_overlap": overlaps,
              "test_subjects_seen_in_training": sum(r["subject"] in details["train"]["subjects"] for r in splits["test"]),
              "test_subject_class_groups_seen_in_training": len(gaps),
              "index_adjacency": {"median_gap": statistics.median(gaps), "maximum_gap": max(gaps),
                                  "counts_within_gap": {str(k): sum(g <= k for g in gaps) for k in (1, 2, 3, 5, 10)}},
              "perceptual_audit": {"method": "64-bit horizontal dHash and 9x8 grayscale MAE; nearest same-class same-prefix training candidate",
                                   "threshold_hamming": 2, "threshold_gray_mae": .02,
                                   "candidate_test_images": len(candidates), "examples": examples,
                                   "caution": "Candidates are not proven duplicate photographs. Filename indexes are not verified timestamps."},
              "architecture": {"layers": layers, "parameter_slots_including_bn_stats": params,
                               "dense_parameters": dense_params, "dense_fraction": dense_params / params,
                               "estimated_forward_macs": total_macs, "convolution_macs": convolution_macs,
                               "convolution_mac_fraction": convolution_macs / total_macs,
                               "gap_128_to_64_candidate_parameter_slots": params - dense_params - layers[-1]["parameter_slots"] + 128 * 64 + 64 + 64 * 36 + 36,
                               "caution": "Parameter/MAC counts derived from serialized dimensions. MACs omit normalization, activations and pooling; not wall-clock latency."},
              "history": epochs, "main_phase_seconds": train_seconds,
              "post_epoch2_main_seconds": sum(r["seconds"] for r in epochs if r["phase"] == "train" and r["epoch"] > 2),
              "fine_tune_seconds": sum(r["seconds"] for r in epochs if r["phase"] == "fine-tune"),
              "test_errors": errors, "camera_fixture": {"filename": fixture, "selected_split_membership": fixture_splits},
              "provenance": {name: hashlib.sha256((RUN / name).read_bytes()).hexdigest()
                             for name in ("history.csv", "config.json", "confusion.csv", "asl_cnn_model.zip.training.properties")}}
    (HERE / "audit.json").write_text(json.dumps(result, indent=2))
    print(json.dumps({k: v for k, v in result.items() if k not in ("history", "provenance") and k != "architecture"}, indent=2))
    print("PARAMETER SLOTS", params, "DENSE", dense_params, "DENSE SHARE", dense_params / params, "FORWARD MACs", total_macs)


if __name__ == "__main__": main()
