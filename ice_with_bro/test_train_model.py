import hashlib
from pathlib import Path
import tempfile
import unittest
import json
from unittest.mock import patch
import train_model


class ModelInstallationTest(unittest.TestCase):
    def test_completed_run_is_not_restarted_or_relabelled_with_fewer_epochs(self):
        with tempfile.TemporaryDirectory() as temporary:
            run = Path(temporary)
            config = dict(train_per_class=350, fine_tune_per_class=50, test_per_class=100,
                          epochs=14, fine_tune_epochs=2)
            (run / "config.json").write_text(json.dumps(config))
            (run / "progress.properties").write_text("epoch=16\n")
            (run / "status.json").write_text(json.dumps({"status": "complete"}))
            with patch("sys.argv", ["train_model.py", "--resume", str(run)]), patch("subprocess.run") as command:
                train_model.main()
                command.assert_not_called()
                config["epochs"] = 12
                (run / "config.json").write_text(json.dumps(config))
                with self.assertRaisesRegex(ValueError, "Completed epochs exceed"):
                    train_model.main()
                command.assert_not_called()

    def test_installs_only_matching_evaluated_files_and_preserves_backups(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            backend, run = root / "backend", root / "run"
            run.mkdir()
            model = run / "asl_cnn_model.zip"
            model.write_bytes(b"synthetic model fixture; no accuracy claim")
            labels = list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            (run / "labels.txt").write_text("\n".join(labels) + "\n")
            metadata = Path(str(model) + ".training.properties")
            metadata.write_text("trained=true\nmodelSha256=" + hashlib.sha256(model.read_bytes()).hexdigest() + "\n")
            for destination in (root / "models", backend / "models"):
                destination.mkdir(parents=True)
                (destination / model.name).write_bytes(b"previous model")
            with patch.multiple(train_model, ROOT=root, BACKEND=backend):
                train_model.deploy(run)
                for destination in (root / "models", backend / "models"):
                    self.assertEqual(model.read_bytes(), (destination / model.name).read_bytes())
                    self.assertEqual(labels, (destination / "labels.txt").read_text().splitlines())
                for name in ("root", "backend"):
                    self.assertEqual(b"previous model", (run / "previous-models" / name / model.name).read_bytes())
                train_model.deploy(run)
                self.assertEqual(b"previous model", (run / "previous-models/root" / model.name).read_bytes())
                model.write_bytes(b"changed since evaluation")
                with self.assertRaisesRegex(ValueError, "do not match"):
                    train_model.deploy(run)
                self.assertNotEqual(model.read_bytes(), (backend / "models" / model.name).read_bytes())


if __name__ == "__main__":
    unittest.main()
