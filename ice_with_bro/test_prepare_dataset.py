import hashlib
from pathlib import Path
import tempfile
import unittest
from prepare_dataset import EXPECTED, prepare


class DatasetPreparationTest(unittest.TestCase):
    def test_balanced_disjoint_selection_preserves_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            data = root / "data"
            for split, count in (("train", 12), ("test", 5)):
                for label in EXPECTED:
                    directory = data / split / label
                    directory.mkdir(parents=True)
                    for i in range(count):
                        (directory / f"{i}.jpg").write_bytes(f"{split}-{label}-{i}".encode())
                    (directory / "duplicate.jpg").write_bytes((directory / "0.jpg").read_bytes())
            for label in EXPECTED:
                (data / "test" / label / "overlap.jpg").write_bytes((data / "train" / label / "0.jpg").read_bytes())
            before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in data.rglob("*.jpg")}
            report = prepare(data, root / "manifests", train_per_class=5,
                             fine_tune_per_class=2, validation_per_class=2, test_per_class=3)
            hashes = set()
            for name, count in (("train", 180), ("fine-tune", 72), ("validation", 72), ("test", 108)):
                rows = (root / "manifests" / f"{name}.tsv").read_text().splitlines()[1:]
                self.assertEqual(len(rows), count)
                for row in rows:
                    digest = row.split("\t")[2]
                    self.assertNotIn(digest, hashes)
                    hashes.add(digest)
            self.assertEqual(report["removed"]["test_overlapping_train"], 36)
            self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in data.rglob("*.jpg")})
            first = (root / "manifests/train.tsv").read_bytes()
            prepare(data, root / "repeat", train_per_class=5, fine_tune_per_class=2,
                    validation_per_class=2, test_per_class=3)
            self.assertEqual(first, (root / "repeat/train.tsv").read_bytes())
            with self.assertRaisesRegex(ValueError, "unique training images"):
                prepare(data, root / "too-many", train_per_class=12, fine_tune_per_class=2, test_per_class=3)


if __name__ == "__main__":
    unittest.main()
