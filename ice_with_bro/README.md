# ice_with_bro — ASL model training

The production classifier is trained directly in Java/DeepLearning4j and loaded by
`coffee_with_bro`. Python orchestrates dataset selection, training and installation;
it needs only the Python standard library. PyTorch weights are not used by the Java app.

## Dataset

Place the existing ASL-HG images in `data/train/<label>/` and
`data/test/<label>/`, with all 36 labels `0`–`9` and `A`–`Z` in each split.
The scripts never move, resize, delete or overwrite the source images.

`prepare_dataset.py` hashes every image, removes repeated contents from selection,
excludes test images whose contents occur in the original training split, and
creates deterministic manifests. Train, fine-tuning, validation and test manifests
are mutually disjoint by SHA-256. Conflicting labels or insufficient unique images
cause an error, rather than silently reducing the requested counts.

## Train with four values

Requirements: Python 3.10+, Java 21+ and the Maven wrapper (or Maven on PATH).
The first Maven build needs internet access to download dependencies. Training and
inference are local. No Python ML packages are required for this workflow.

From the repository root:

```powershell
python ice_with_bro/train_model.py 350 50 100 12
```

The four values, in order, are:

1. Main training images **per class**.
2. Fine-tuning images **per class**, used for real gradient updates.
3. Test images **per class**, evaluated only after checkpoint selection.
4. Number of main training epochs.

Running `python ice_with_bro/train_model.py` without values prompts for all four.

For the requested run, this means 12,600 main training images, 1,800 fine-tuning
images and 3,600 test images. A separate 10% of the deduplicated original training
pool is reserved for validation (2,841 images in the current dataset).

The main phase uses Adam at `0.001`. Fine-tuning starts from the best main-phase
checkpoint and runs **2 additional epochs at `0.0001`**. The best validation
checkpoint across both phases is selected, then evaluated on the test set.
All 12 main epochs run; there is no time-based early stop.

Optional settings:

```powershell
python ice_with_bro/train_model.py 350 50 100 12 --fine-tune-epochs 2 --fine-tune-lr 0.0001 --batch-size 32 --threads 6
```

On this machine, allow roughly **4½ hours** for this configuration, with variation
from load and temperature. The completed original run used 14 main + 2 fine-tuning
epochs and took about **5 hours 37 minutes**. Its requested reduction to 12 main
epochs was received but was not applied by the watcher before completion.
This is an estimate, affected by laptop power mode, temperature and other processes.
More epochs do not guarantee better webcam accuracy; validation chooses the checkpoint.

## Monitor and resume

Each run gets its own directory under `ice_with_bro/runs/` containing:

- `config.json` — all settings and manifest hashes.
- `manifests/` — selected paths, class labels, hashes and the dataset audit.
- `training.log` — batch progress, loss, elapsed time and epoch ETA.
- `history.csv` — phase, elapsed seconds, loss and validation accuracy per epoch.
- `latest.zip` and `progress.properties` — resume from the last completed epoch.
- `asl_cnn_model.zip` and `labels.txt` — best validation checkpoint and exact output order.
- `test.txt`, `confusion.csv` — final measured test results, not estimates.
- `asl_cnn_model.zip.training.properties` — training metadata tied to the model hash.
- `status.json` — training / complete / interrupted / failed.

For the run started during implementation:

The folder contains the completed 14-main-epoch run. Its `config.json` records
what actually ran and the unapplied schedule-change request; `initial-config.json`
preserves the original settings. Future runs can use the 12-epoch command above.

```powershell
Get-Content ice_with_bro/runs/asl-350-50-100-14/training.log -Tail 15 -Wait
```

Keep the computer awake until `status.json` reports `complete`.
To resume an interrupted run:

```powershell
python ice_with_bro/train_model.py --resume ice_with_bro/runs/asl-350-50-100-14
```

Resume preserves the original four values and verifies manifests and image hashes.
An unfinished epoch is repeated. Choose a new run directory to change the settings.

## Installation and webcam recognition

After successful final evaluation, the script automatically installs the model,
labels and matching metadata into both `models/` and `coffee_with_bro/models/`.
Previous files are backed up under the run's `previous-models/` directory.
The backend checks every 10 seconds for a newly installed verified model.
Random architecture exports are refused by the predictor.

Reinstall an already evaluated run without training:

```powershell
python ice_with_bro/train_model.py --deploy-only ice_with_bro/runs/asl-350-50-100-14
```

Start the app with `npm.cmd start` from the repository root. Open the local
frontend, select **ASL alphabet & digits**, and turn on the camera. Keep one hand
large and centered against a simple background, in good light. Hold a sign until
it is stable; low-confidence predictions are not added to the transcript.

Image preprocessing is shared between training and Java inference: resize to
128×128, use NativeImageLoader's BGR channel order, NCHW tensors and pixels / 255.
This avoids the old flattened-input mismatch and PyTorch normalization mismatch.
Before ASL classification, the browser crops the largest detected hand with
padding to match the dataset's close hand framing. Personal recordings retain
landmarks for both hands and their relative position and movement.

## Personal symbols without retraining

Select **My symbols & gestures** in the webcam app:

1. Turn on the camera, enter a symbol name, and record a 3-second example.
2. Record the same static pose or short movement at least three times (3–5 recommended).
3. Click **Recognize my gesture**, perform it, then confirm or correct the match.
4. Confirmed/corrected symbols are added to the transcript; feedback updates the library immediately.

MediaPipe hand tracking runs in the browser with locally hosted WASM and model
assets. The Java backend compares normalized left/right hand landmark sequences
using constrained Dynamic Time Warping. It rejects distant or ambiguous matches,
keeps negative feedback and prunes outlying examples as the library grows.
There is no CNN retraining when a personal symbol is added.

Only landmark templates are persisted, by default in
`coffee_with_bro/data/personal-gestures.bin`. Set `gestures.path` through Spring
configuration to choose a different local file. The library survives backend
restarts, supports deletion, and has a limit of 64 symbols with 20 examples each.

## Verification and limitations

```powershell
python -m unittest discover -s ice_with_bro -p "test_*.py"
cd coffee_with_bro
.\mvnw.cmd test
```

From the root, `node scripts/check-personal-gestures.mjs` performs a local browser
test with a dataset hand image as a synthetic camera, real MediaPipe inference,
recording, recognition, feedback, deletion, mobile layout and external-request checks.
It uses isolated test servers and a separate gesture library.

Exact deduplication does not detect visually similar images. The dataset split
shares signers, so held-out image accuracy does not establish unseen-signer or
real-webcam accuracy. A live webcam trial with the intended user remains necessary.
The CNN handles static fingerspelling images; the motion in ASL J and Z is not
modeled by single-frame classification. Personal dynamic gestures use explicitly
recorded short sequences and require comparable framing and speed.

## Optional experiments

`train_cnn.py` remains a separate PyTorch baseline with its own dependencies and
legacy processed-data paths. `PreProcessing.py` exports landmark CSVs from `data/`
using the bundled hand-landmark task. `preprocess_raw.py`, `preprocess_images.py`
and `download_isl_dataset.py` are optional utilities, not prerequisites for the
existing ASL-HG dataset or the production Java pipeline.
