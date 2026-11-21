# Java CUDA workflow

Java performs model construction, gradient updates, checkpoint selection and final
evaluation. Python is used only by `crop_grouped_dataset.py` for preprocessing.
The existing Python training/orchestration commands are legacy workflows and are
not used by this workflow. No cuML/Python model training is involved.

## Verified on this laptop

The `cuda` Maven profile selects ND4J CUDA 11.6 / DL4J 1.0.0-M2.1 and the Windows
CUDA redistributable. The actual RTX 4050 (compute capability 8.9) passed GPU GEMM
and six synthetic compact-CNN gradient steps. The fixed-workspace probe completed
those steps in 1.062 seconds with finite loss and changed convolution weights.
These are synthetic probe timings, not an epoch or full-training benchmark.
The extended probe also passed batch-16 fixed-workspace training/inference,
checkpoint prediction parity (L2 difference 0), restored fine-tuning and deliberate
workspace-overflow rejection.

The final CUDA backend test suite passed 38 tests, including the original training,
fine-tuning, serialization and predictor integration and new grouped-split tests.
The additional synthetic fixed-workspace evaluation test also passed, checking
that failed hand detections stay in the denominator and become NO_HAND rejections.
Probe results are in `reports/java-cuda/*.properties`; build/test logs are under
`coffee_with_bro/target/`. The compact candidate has 104,740 parameter slots.

## Memory boundary: a required decision

The working variant preallocates fixed ND4J workspaces, sets learning to `NONE`,
allocation to `STRICT` and spilling to `FAIL`. Device-to-host execution fallback
is disabled. **This does not implement or prove a global fixed allocator for
CUDA/cuDNN/LibND4J internals.** No RMM pool has been integrated with ND4J.
The probe deliberately records `fixedPoolVerified=false`.

The user explicitly accepted native CUDA/cuDNN allocations outside fixed ND4J
workspaces and authorized starting retraining. Do not interpret the CUDA probe as proof of the stricter
all-allocations-through-fixed-pools requirement. The launcher and trainer reject
retraining without an explicit native-allocation acceptance flag.

## Dataset and preprocessing

The Java splitter combines the source directories without changing any original
image. P1–P7 are learning groups, P8 is validation, and P9/P10 are held-out test
groups. Filename prefixes are acquisition-group identifiers; independent metadata
confirmation is still required before calling them verified person identities.
The existing ASL checkpoint is never used to initialize this candidate.

Source audit: 36,000 images, 596 repeated-content occurrences and 199 hashes
appearing under different group prefixes. Cross-group hash families are excluded
entirely. Selected learning manifests contain 350 main and 50 fine-tuning examples
per class; test contains 100 per class, balanced between P9 and P10. All available
eligible P8 images form separate validation. Reserves come only from P1–P7.

Preprocessing uses the deployed hand-landmarker asset, confidence 0.6, largest-hand
bounds and 20% padding, preserving original sign orientation. If detection fails,
it tries replicated image borders and rotated detector inputs, then maps detected
coordinates back to the original image. Only detection is rotated, not the saved
training hand. Cached preprocessing is versioned and tied to source/model hashes.

Training detection failures can be replaced with unique detected reserve images,
preserving requested counts. Validation/test failures remain in evaluation and
count as incorrect rejections. Duplicate crop contents or insufficient usable
training examples stop the run. IMAGE-mode retries and Pillow resampling differ
from the current browser VIDEO tracker/canvas. Offline detector coverage must not
be presented as live webcam coverage. A full webcam parity check remains necessary.
The completed preprocessing selected 12,600 main, 1,800 fine-tuning, 3,571
validation and 3,600 test images. Detection failed on 98 validation and 18 test
images even after retries; those rows remain in the pipeline denominator.

## Reusable four-value launcher

After explicitly accepting native CUDA allocations, from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ice_with_bro/train_java_gpu.ps1 350 50 100 12 -AllowNativeAllocations -VerifyAndInstall
```

The inputs are main images/class, fine-tuning images/class, test images/class and
main epochs. The launcher prompts for missing mandatory inputs. Fine-tuning is
two additional epochs at 0.0001; the main phase uses Adam at 0.001. Batch size is
16. A new run directory is selected automatically; `-RunDirectory` can explicitly
select one that has prepared manifests/crops and no existing training history.
The repository-local preprocessing environment must already contain MediaPipe,
Pillow, OpenCV and NumPy. The native dependencies are pinned in the Maven profile.

The default architecture is now `spatial`. `-VerifyAndInstall` runs the sequential
Java finishing workflow, then installs only a model whose hash matches successful
CUDA regression, predictor parity and camera-fixture checks. Old weights, labels
and metadata are backed up in the selected run's `previous-models/` directory.
Omit that switch to train/evaluate without replacing production files.

The compact architecture uses explicit identity convolution activations followed
by BN/ReLU, global average pooling, a 64-unit head, L2 regularization and modest
random train-only rotations. Validation/test receive no random augmentation.

## Candidate experiments

The first compact GAP run completed 12+2 epochs. Its selected checkpoint measured
47.28% held-out acquisition-group test accuracy and 44.07% macro-F1. A subsequent
training-only BN population-moment experiment changed no learned weights but
worsened validation NLL (1.582 to 1.665), so it was rejected.

The spatial candidate preserves a 4x4 pooled feature grid, uses a 128-unit head
and stronger dropout, and adds train-only gain/offset/grayscale augmentation.
It has 361,060 parameter slots. It initializes only convolution blocks from the
learning-group compact checkpoint, with a fresh head and Adam state. The trainer
requires identical learning-manifest hashes before permitting feature reuse;
the old all-participant production checkpoint does not qualify.

The completed spatial candidate measured **74.47% test accuracy and 72.14%
macro-F1** on P9/P10 acquisition groups (3,600 images, including 18 detector
failures). Training evaluation accuracy was 99.52%, so a substantial
generalization gap remains. This is not a claim of 99% live webcam accuracy.

CUDA temperature scaling selected T=2.5 without changing validation decisions;
validation NLL improved from 1.563 to 1.036. At confidence 0.85, held-out known-sign
accepted precision was **92.77% at 42.25% coverage** (1,411 correct / 1,521 accepted).
Low-confidence frames are withheld from automatic transcript commits. Unknown
gesture rejection and real-user webcam accuracy have not been measured.

The installed predictor matched direct DL4J on 72/72 validation images with zero
confidence difference. Predecoded-image inference p50/p95 was 11.86/19.78 ms;
these numbers exclude camera, JPEG decode, network and transcript stabilization.
The real CUDA WebSocket camera fixture predicted dataset zero at 100% confidence;
custom-symbol recording and confirm/correct workflow checks also passed.

Optional launcher parameters are `-Architecture spatial`, `-CropDirectory` for
an existing verified cache, and `-FeatureSource` for a compatible learning-only
checkpoint. The four required training values remain unchanged. The final main
checkpoint is now saved synchronously as `main-final.zip` before fine-tuning.

Post-training temperature scaling is fitted on development validation using CUDA
NLL. It cannot fix classification mistakes. It is accepted only if NLL improves
and validation classification decisions remain unchanged. Validation also selects
checkpoints, so confidence results there are development estimates; frozen held-out
test precision and coverage are reported separately.

## Webcam inference on CUDA

`npm.cmd start` and `npm.cmd run dev:server` select the CUDA Maven profile. To run
the backend directly, change into `coffee_with_bro` and use
`.\mvnw.cmd -Pcuda spring-boot:run`. The profile sets
`-Dasl.cuda.required=true`; it does not silently substitute CPU inference.
The existing browser frontend still supplies webcam frames and personal landmarks;
all CNN training/inference is Java with native CUDA libraries.

The predictor serializes GPU work on one bounded worker, reuses fixed batch-1
workspaces, and releases the previous model on reload. This avoids allocating
workspace sets on every WebSocket thread. Native-library allocations remain
permitted under the accepted memory policy. Inference is checked only after the
training process exits, so two CUDA model processes do not compete for laptop VRAM.
`BenchmarkGpuPredictor` checks the production predictor against direct DL4J
outputs on validation images and measures inference latency and known-sign
precision/coverage. `node scripts/check-personal-gestures.mjs --cuda --require-trained`
checks real CUDA-backed WebSocket classification and personal recording/feedback
with a synthetic camera fixture. Neither check substitutes for a live-user trial.

Artifacts include configuration/manifests with hashes, history, best/latest model,
pipeline accuracy, macro-F1, detected-only NLL, group accuracies, a confusion matrix
with a NO_HAND rejection column, and model-hash-bound training metadata. The best
checkpoint is selected by validation NLL; test is evaluated after both phases.
Training-only runs do not overwrite production models. Interrupted new runs currently
need a new training directory; the legacy trainer's resume is a separate workflow.

No accuracy improvement or live-webcam success is established by a synthetic
GPU probe. Production promotion requires reviewing the actual held-out results
and webcam preprocessing behavior. `cream_with_bro` is outside this workflow.
