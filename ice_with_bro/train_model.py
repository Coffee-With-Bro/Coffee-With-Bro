"""Train, fine-tune, evaluate and install the Java model using four numeric inputs.

Example: python ice_with_bro/train_model.py 350 50 100 12
No third-party Python packages are needed; all learning happens in DL4J.
"""
import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

from prepare_dataset import prepare

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BACKEND = ROOT / "coffee_with_bro"


def digest(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def deploy(run):
    model = run / "asl_cnn_model.zip"
    metadata_file = Path(str(model) + ".training.properties")
    metadata = dict(line.strip().split("=", 1) for line in metadata_file.read_text().splitlines()
                    if line.strip() and not line.startswith("#") and "=" in line)
    if metadata.get("trained") != "true" or metadata.get("modelSha256") != digest(model):
        raise ValueError("Checkpoint and evaluated training metadata do not match")
    labels = run / "labels.txt"
    if labels.read_text().splitlines() != list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
        raise ValueError("Incorrect model labels")
    for target in (ROOT / "models", BACKEND / "models"):
        target.mkdir(exist_ok=True)
        backup = run / "previous-models" / ("backend" if target.parent == BACKEND else "root")
        backup.mkdir(parents=True, exist_ok=True)
        for source in (model, labels, metadata_file):
            destination = target / source.name
            if destination.exists() and not (backup / source.name).exists():
                shutil.copy2(destination, backup / source.name)
            temporary = Path(str(destination) + ".tmp")
            shutil.copy2(source, temporary)
            temporary.replace(destination)
    print("Installed the evaluated model into models/ and coffee_with_bro/models/.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("train_per_class", "fine_tune_per_class", "test_per_class", "epochs"):
        parser.add_argument(name, type=int, nargs="?")
    parser.add_argument("--fine-tune-epochs", type=int, default=2)
    parser.add_argument("--fine-tune-lr", type=float, default=0.0001)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--resume", type=Path, help="Resume a run directory from its last completed epoch")
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--deploy-only", type=Path, help="Install an already evaluated run without training")
    args = parser.parse_args()
    if args.deploy_only:
        deploy(args.deploy_only.resolve()); return
    run = (args.resume or args.run_dir or HERE / "runs" / datetime.now().strftime("dl4j-%Y%m%d-%H%M%S")).resolve()
    if args.resume:
        config = json.loads((run / "config.json").read_text())
        for name in ("train_per_class", "fine_tune_per_class", "test_per_class", "epochs"):
            provided = getattr(args, name)
            if provided is not None and provided != config[name]:
                raise ValueError("Resume uses the original run configuration; start a new run to change it")
        progress = run / "progress.properties"
        if progress.exists():
            saved = dict(line.split("=", 1) for line in progress.read_text().splitlines()
                         if line and not line.startswith("#") and "=" in line)
            if int(saved.get("epoch", "0")) > config["epochs"] + config["fine_tune_epochs"]:
                raise ValueError("Completed epochs exceed this configuration; restore the original config instead of relabelling the completed run")
        status = run / "status.json"
        if status.exists() and json.loads(status.read_text()).get("status") == "complete":
            print(f"This run is already complete: {run}. Use --deploy-only to reinstall it without training.")
            return
    else:
        if run.exists() and any(run.iterdir()):
            raise ValueError("Run directory is not empty; choose a new directory or use --resume")
        config = {}
        for name in ("train_per_class", "fine_tune_per_class", "test_per_class", "epochs"):
            value = getattr(args, name)
            if value is None: value = int(input(name.replace("_", " ") + ": "))
            if value < 1: raise ValueError("All four input values must be positive")
            config[name] = value
        config.update(fine_tune_epochs=args.fine_tune_epochs, fine_tune_lr=args.fine_tune_lr,
                      batch_size=args.batch_size, threads=args.threads, validation_fraction=0.1, seed=42)
        if config["fine_tune_epochs"] < 1 or config["fine_tune_lr"] <= 0 or config["batch_size"] < 1 or config["threads"] < 1:
            raise ValueError("Fine-tuning, batch and thread settings must be positive")
        run.mkdir(parents=True, exist_ok=True)
        (run / "config.json").write_text(json.dumps(config, indent=2))
        prepare(HERE / "data", run / "manifests", config["validation_fraction"], config["seed"],
                train_per_class=config["train_per_class"], fine_tune_per_class=config["fine_tune_per_class"],
                test_per_class=config["test_per_class"])
        config["manifest_hashes"] = {p.name: digest(p) for p in (run / "manifests").glob("*.tsv")}
        (run / "config.json").write_text(json.dumps(config, indent=2))
    for name, expected in config["manifest_hashes"].items():
        if digest(run / "manifests" / name) != expected: raise ValueError("Manifest changed since run creation: " + name)
    maven = shutil.which("mvn") or str(BACKEND / ("mvnw.cmd" if os.name == "nt" else "mvnw"))
    print("Compiling the Java trainer…", flush=True)
    subprocess.run([maven, "-q", "-DskipTests", "compile", "dependency:build-classpath",
                    "-Dmdep.outputFile=target/training-classpath.txt"], cwd=BACKEND, check=True)
    classpath = str(BACKEND / "target" / "classes") + os.pathsep + (BACKEND / "target" / "training-classpath.txt").read_text().strip()
    arguments = ["--enable-native-access=ALL-UNNAMED", "-Xmx5g", "-Dorg.bytedeco.javacpp.maxphysicalbytes=8G",
                 "-cp", classpath, "com.coffeewithbro.coffee_with_bro.ml.TrainAslCnn", str(run / "manifests"),
                 str(run / "asl_cnn_model.zip"), str(config["epochs"]), str(config["batch_size"]),
                 str(bool(args.resume)).lower(), str(config["fine_tune_epochs"]), str(config["fine_tune_lr"])]
    argfile = run / "java-args.txt"
    # Java argument files need quoted paths with forward slashes, not shell quoting.
    argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"' for arg in arguments))
    environment = os.environ.copy()
    environment["OMP_NUM_THREADS"] = environment["OPENBLAS_NUM_THREADS"] = str(config["threads"])
    log = run / "training.log"
    started = time.monotonic()
    print(f"Run: {run}\nLog: {log}\n{config['epochs']} main epochs + {config['fine_tune_epochs']} fine-tuning epochs", flush=True)
    (run / "status.json").write_text(json.dumps({"status": "training", "started_at": datetime.now().astimezone().isoformat()}))
    try:
        with log.open("ab" if args.resume else "wb") as output:
            process = subprocess.Popen([shutil.which("java") or "java", "@" + str(argfile)], cwd=ROOT,
                                       env=environment, stdout=output, stderr=subprocess.STDOUT)
            (run / "worker.pid").write_text(str(process.pid))
            try: code = process.wait()
            except KeyboardInterrupt:
                process.terminate(); process.wait()
                raise
        if code: raise RuntimeError(f"Java trainer exited with code {code}; inspect {log}")
        deploy(run)
        (run / "status.json").write_text(json.dumps({"status": "complete", "completed_at": datetime.now().astimezone().isoformat(), "elapsed_seconds": time.monotonic() - started}))
        print(f"Complete in {(time.monotonic() - started) / 3600:.2f} hours. The running backend loads the installed model within 10 seconds.")
    except BaseException as error:
        (run / "status.json").write_text(json.dumps({"status": "interrupted" if isinstance(error, KeyboardInterrupt) else "failed", "error": str(error)}))
        raise


if __name__ == "__main__":
    try: main()
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr); sys.exit(1)
