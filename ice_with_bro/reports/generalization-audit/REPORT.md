# Why the ASL result is optimistic, and how to build a better model

Original audit date: 17 November 2026. The historical audit below examined the original CPU run without training or replacing a model. The subsequent authorized Java CUDA implementation and deployment are recorded in the follow-up first. `cream_with_bro` was not modified.

<!-- JAVA_GPU_RUN_START -->
## Java CUDA implementation follow-up

Java CUDA retraining completed: 12 main + 2 fine-tuning epochs; best validation-NLL weight checkpoint: epoch 2. Temperature scaling (T=2.5) was fitted by CUDA validation NLL and exported into the output layer. It preserves classification decisions; epoch curves precede confidence scaling.

Held-out acquisition-group test accuracy: 74.47%; macro-F1: 72.14%. Detection failures: 18/3600, retained as errors.

Training evaluation accuracy: 99.52%; selected validation pipeline accuracy: 66.31%. The original 99.97% result used a different, dependent split; these scores cannot be ranked as a controlled before/after accuracy comparison.

On the same group-disjoint data, the compact GAP candidate scored 83.90% on training evaluation and 47.28% on held-out testing. Its BN-only experiment kept learned weights identical (maximum difference 0.0) but worsened validation NLL from 1.58 to 1.66; it was rejected. The spatial candidate also changes appearance augmentation and uses learning-only convolution initialization. Any gain is evidence about that combined intervention, not isolated proof that pooling alone caused the difference.

Java predictor parity: 72/72 matching labels; maximum confidence difference 0.0. GPU inference p50/p95: 11.86/19.78 ms on predecoded validation images. This includes worker dispatch and excludes camera/network/decoding/stabilization.

At the existing 0.85 confidence threshold, validation known-sign accepted precision is 93.04% at 40.24% coverage (1437/3571 accepted). On held-out test signs, accepted precision is 92.77% at 42.25% coverage. Validation confidence metrics are development estimates: validation also selected checkpoints and fitted temperature. Neither metric establishes unknown-gesture rejection.

Browser camera-fixture integration passed: true. This test uses a dataset image as a synthetic camera, not a live user. Production model replacement recorded: true.

Native CUDA/cuDNN allocations outside fixed ND4J workspaces were explicitly authorized. ND4J workspaces remain preallocated with growth/spill rejected, and CPU execution fallback is disabled. A process-wide fixed GPU allocator was not established.

Evaluation uses filename-prefix acquisition groups, not independently verified person identities. Offline hand detection includes context/rotation retries absent from the browser VIDEO tracker; live webcam accuracy remains unmeasured. Known-sign confidence coverage is not unknown-gesture rejection or transcript accuracy.

Run: `C:\Users\abhis\OneDrive\Desktop\ENGINEERING\5th sem\java\prozect\coffee_with_bro\..\ice_with_bro\runs\java-cuda-spatial\temperature-calibrated`. Model SHA-256: `b94ccd73cd86ea9c3ce0ebd6c19ae91ca17ef4facb82e69613afc9aaed721801`. The historical audit below remains evidence about the original model. Its Python-training proposal is superseded by the Java workflow in `ice_with_bro/JAVA_GPU.md`.
<!-- JAVA_GPU_RUN_END -->

## 1. Verdict

**Your concern is justified: 99.97% is not credible evidence of unseen-signer webcam accuracy. The strongest demonstrated problem is a dependent evaluation split, not a proven classical train–validation overfitting curve.**

All ten filename-inferred participant groups occur in training, fine-tuning, validation and testing. Every test image has training examples from the same participant-prefix/class group. Many are extremely similar images. The original same-group score mainly measures interpolation within familiar acquisition conditions.

Classical overfitting means training performance improves while independent generalization deteriorates. This run does not log validation cross-entropy or training accuracy, and its validation data are themselves dependent on the training acquisition groups. It cannot establish that classical pattern. Memorization, visual shortcuts and domain overfitting are plausible, high-priority risks; their causal contributions need the experiments below.

I should have framed the earlier 99.97% headline as **same-participant image-split accuracy**, rather than evidence of real webcam quality. The earlier camera check used an image from the original training directory, not an independently collected webcam session. That image was not in the selected four manifests, but it still came from the familiar dataset acquisition. It proved integration, not deployment generalization.

Interpretation of the requested concepts: this report covers the research frontier and accuracy/latency/memory frontier; pixel, feature, temporal and learned-code discretization; and data, representation, capacity and compute bottlenecks.

## 2. Proof from this project

The machine-readable evidence is `audit.json`. Calculations are reproducible with `ImageFingerprintAudit.java` and `audit.py` in this directory. Source artifacts are the completed run's manifests, `history.csv`, `confusion.csv`, and the ZIP's `configuration.json`. Provenance hashes are recorded in `audit.json`.

### 2.1 Group dependence is measured

- Selected main training: **12,600 images**, 350/class.
- Fine-tuning: **1,800 images**, 50/class.
- Validation: **2,841 images**.
- Test: **3,600 images**, 100/class.
- Each split contains **all ten P1–P10 filename prefixes** and all **360 participant-prefix × class groups**.
- **3,600/3,600 test images** have their participant-prefix/class group represented in main training.
- **2,099/3,600 (58.31%)** have a same-class, same-prefix training filename index within one position.
- **2,952/3,600 (82.00%)** are within two positions; **3,523/3,600 (97.86%)** within five.

These are filename-derived acquisition-group measurements. Numeric index adjacency is a proximity proxy, **not verified capture timestamps**. The publication describes ten participants; confirm the P-prefix-to-person mapping against the dataset metadata before calling a new split formally signer-independent. Grouping by these prefixes is already more defensible than mixing all prefixes randomly. [Dataset publication](https://www.sciencedirect.com/science/article/pii/S2352340926000454)

The network is not given filenames as image features. The risk is shared visual appearance/acquisition conditions, not literal label strings being fed into the CNN.

### 2.2 SHA-256 deduplication solved only exact duplication

The selected four manifests have **zero SHA-256 overlaps**. That is a real safeguard, but different JPEG bytes can depict almost the same hand and pose.

A read-only audit decoded all **20,841 selected images**. For each test image it searched same-class/same-prefix main-training candidates using 64-bit horizontal dHash and 9×8 grayscale mean absolute error, normalized by 255.

**965/3,600 test images (26.81%)** have a candidate with Hamming distance ≤2 and low-resolution grayscale MAE ≤0.02. This is a **candidate similarity rate, not a certified duplicate rate**. The small thumbnail loses detail, and hash collisions are possible. Do not delete everything satisfying that threshold automatically.

Example, visually inspected during this audit:

- Main training: `data/train/5/P7_5_699.jpg`.
- Test: `data/test/5/P7_5_700.jpg`.
- Different file contents; dHash distance 1; normalized thumbnail MAE approximately 0.00387.
- The images show a highly similar open hand, position, background and lighting.

Five additional examples are included in the HTML report. The fix is to keep an entire person/session/capture sequence on one side of the split. Perceptual deduplication supplements that rule; it does not replace it.

### 2.3 Model capacity is concentrated in one head

From the saved layer dimensions:

- Three spatial downsamplings leave a **128×16×16 = 32,768-dimensional** feature map.
- Flatten → Dense(256) uses **8,388,864 parameters**, including biases.
- The model has approximately **8,492,260 parameter slots**, including batch-normalization statistics.
- That one dense layer accounts for **98.78%** of the parameter slots.
- Estimated forward work is **173.55 million multiply–accumulates**, excluding normalization, pooling and activation operations. Convolutions account for **95.16%** of those MACs.

This is an architectural risk, not proof that those parameters memorize people. It explains why a spatially sensitive classifier can retain acquisition-specific appearance cheaply. Crucially, the parameter bottleneck and compute bottleneck differ: replacing the dense head reduces memory/capacity dramatically, but does **not** remove most convolutional computation.

Keeping the same 32/64/128 convolution widths, replacing flattening with global average pooling and a 128→64→36 head gives approximately **104,740 parameter slots**—about 81× fewer overall. This is a calculated candidate architecture, **not a measured improvement**. Pooling can also discard useful fine spatial distinctions, so compare it with a small spatial-pooling head on the same grouped validation split.

### 2.4 The serialized activations differ from the intended architecture

Convolution layers 0, 4 and 8 serialize `ActivationSigmoid`, followed downstream by batch normalization and explicit ReLU activation layers. They are not configured as linear Conv → BN → ReLU blocks. The source did not explicitly override the convolution activation default.

For the replacement, explicitly set the convolution activation to identity/linear and apply ReLU after BN. Verify actual forward behavior with a small numerical test and inspect the exported graph. BN configurations also contain an inherited activation field; that field alone does not establish that BN applies a second sigmoid.

Sigmoid saturation is an optimization risk. This configuration finding does **not** establish that sigmoid caused the near-perfect score or any unseen-webcam failure.

### 2.5 Training did not justify more hours

- Validation accuracy was **99.7888% after epoch 1** and **100% after epoch 2**.
- The installed checkpoint is **epoch 2**. Later accuracy ties do not replace it.
- Subsequent main-phase epochs consumed **4.68 hours** of recorded epoch time without improving the selected validation accuracy.
- The trainer tracks `staleEpochs` but does not use it to stop training.
- Epoch 11 showed train loss **0.193576**, versus **0.000072** at epoch 10, and validation accuracy fell to **93.5938%**, recovering afterward. This is an instability event; gradient, BN and learning-rate logs are insufficient to identify its cause.
- Fine-tuning restarts from the best checkpoint, on 50/class from the **same acquisition distribution**. It is additional training, but not demonstrated webcam-domain adaptation.
- The final test had **one I→E error**, producing 3,599/3,600 correct images. There is no measured unseen-signer score, independent webcam score, calibration error or live false-commit rate.

Existing dense dropout is **keep probability 0.6** in the saved DL4J configuration—40% dropout. Dropout is already present. There is no explicit weight regularization in the serialized learned layers, and the production iterator applies resizing/scaling without train-time augmentation. Adding regularization cannot repair a dependent evaluation protocol.

## 3. Most likely failure mechanisms, in priority order

**Confirmed evaluation limitation:** overlapping participant/acquisition groups and highly similar cross-split images. Remedy: group-disjoint splits and fresh training. A lower honest score is preferable to a higher invalid generalization claim.

**Plausible visual shortcuts:** skin appearance, background, framing, illumination and capture geometry may predict labels within this acquisition process. Not yet causally proven. Test with hand-preserving background changes, background-only/hand-only ablations and new capture sessions. Shortcut learning is a documented general failure mode, not a finding about which exact pixels this model uses. [Geirhos et al.](https://arxiv.org/abs/2004.07780)

**Confirmed capacity/optimization concerns:** oversized flattening head, unexpected sigmoid convolution configuration, no augmentation or explicit weight decay, and unhelpful long training after validation saturation. Ablate these separately; do not attribute an improvement to five changes made simultaneously.

**Confirmed pipeline mismatch:** dataset training resizes the whole supplied photograph; the browser now crops a padded detected hand before classification. That may improve framing, but a single successful example does not validate the transformation. Cache the same deterministic hand crop for training/validation/test and use that exact version in deployment.

**Unmeasured deployment gap:** unfamiliar hands, cameras, lighting, backgrounds, occlusion and non-sign gestures. A 36-class softmax must distribute probability among known classes. High confidence is not proof of correctness, and the existing 0.85 threshold is not a measured calibration result. [Guo et al.](https://proceedings.mlr.press/v70/guo17a)

## 4. Discretization and information bottleneck analysis

### Spatial and feature discretization

128×128 resizing and JPEG compression can erase small finger separations. Compare 128 and 160/192 resolution on grouped validation, rather than assuming more pixels are always better. A hand crop reduces irrelevant background but introduces detector error; report detection failures instead of filtering them out of system accuracy.

Landmarks are a useful geometric bottleneck: wrist-relative coordinates, palm scale, joint angles, inter-finger distances, handedness/presence and relative two-hand position suppress some appearance information. They can lose texture, contact and occlusion cues, and tracking can fail. Preserve missingness and detection confidence. Compare geometry-only, RGB-only and fusion models.

The existing personal-gesture vector has 132 features and clips normalized joint coordinates. Measure clipping frequency and hand-channel consistency; test canonicalization carefully rather than indiscriminately flipping left/right hands or deleting meaningful orientation.

### Temporal discretization

The ASL capture interval is 350 ms: at most **2.86 classification frames/second**, potentially lower with backpressure. The static CNN receives no sequence, so it cannot model a movement trajectory just by running longer. J/Z motion and dynamic personal symbols need temporal features.

For a temporal baseline, cache consistently sampled short landmark sequences, retain timestamps/masks, compare DTW with a small temporal convolution/GRU, and hold out entire clips/sessions. Start with 16/32-frame windows and measure actual latency. Four confident frames at the current interval already introduce about 1.05 seconds from first to fourth sample, before acquisition and processing delays. Optimize end-to-end commit latency, not just model inference.

### Learned discrete units and numeric quantization are different

A VQ codebook could represent reusable handshape, orientation and movement units. It requires codebook-usage/perplexity checks, protection against code collapse and evaluation on unseen signs; it is not an immediate fix for this small dependent dataset. Research on phonologically structured VQ representations is relevant to extensible personal vocabularies. [Kezar et al., 2025](https://arxiv.org/abs/2509.04745)

INT8/FP16 quantization concerns numeric representation and deployment cost. It does not fix leakage. Establish a valid FP32/mixed-precision baseline first; use only training/calibration data to choose quantization scales and measure parity, worst-class recall and latency afterward. [ONNX Runtime quantization guidance](https://onnxruntime.ai/docs/how-to/quantization.html)

### Information bottleneck: useful hypothesis, not a diagnosis from these curves

Let X be images, Y gesture labels, S nuisance identity/session, and Z an embedding. The desired representation preserves gesture evidence while reducing avoidable dependence on S. A narrower layer or GAP can encourage this, but small dimensionality does not itself prove low mutual information or good generalization.

The theoretical objective is often written as minimizing I(X;Z) − βI(Z;Y). For deterministic networks, naive mutual-information estimates can be constant/infinite in idealized settings, and estimated compression can depend strongly on binning/noise choices. We have not measured mutual information here. Do not draw an information-plane plot and call it proof of overfitting. [Goldfeld et al., ICML 2019](https://arxiv.org/abs/1810.05728)

Practical tests: bottleneck widths 16/32/64/128; label and participant/session probes with controlled splits; foreground/background interventions; grouped robustness tests. An identity probe finding information in Z does not prove the classifier uses it, so combine probes with interventions. Keep all preprocessing/PCA/probe fitting inside training folds.

## 5. Relevant research frontier, as of 17 November 2026

**Signer-independent evaluation comes first.** Recent signer-fold research reports large protocol-dependent differences in sign-language translation. That is a different task, but supports auditing signer overlap before interpreting headline scores; its BLEU results are not comparable to this 36-class accuracy. [Artiaga et al., EMNLP 2025 / arXiv posting 2026](https://arxiv.org/abs/2609.07965)

**Compact temporal geometry models are credible candidates.** TransSLR studies normalized pose sequences under signer-independent evaluation on a different language/benchmark. Its existence supports a temporal-keypoint experiment, not a claim that a transformer will beat this app's CNN. [TransSLR, 2026](https://arxiv.org/abs/2608.06407)

**Frozen embeddings plus retrieval match the no-retraining requirement.** One-shot sign-recognition work uses embeddings and support-set search for evolving vocabularies. A tested embedding/prototype or DTW library is a better fit for adding symbols than repeatedly expanding and retraining a closed-set classifier. [Vandendriessche et al., 2025](https://arxiv.org/abs/2502.20171)

**Disentangled/discrete representations are a later research track.** Separate handshape, location, orientation and movement before attempting learned token codebooks. Compare against the simpler geometry baseline first. [Phonological representation learning, 2025](https://arxiv.org/abs/2509.04745)

**Efficient RGB backbones are an alternative, not a guaranteed winner.** A pretrained mobile encoder can reduce learning from scratch and improve the speed/accuracy tradeoff, subject to crop/domain evaluation and Java export. MobileNetV4 is one relevant efficient-backbone reference; hardware-specific paper latency cannot be transferred to this RTX 4050/Java pipeline. [MobileNetV4](https://arxiv.org/abs/2404.10518)

There is no defensible single state-of-the-art accuracy comparison across static ASL alphabets, isolated word signs and continuous translation. The local frontier must be measured: unseen-signer macro-F1 and worst-signer recall versus p95 system latency, VRAM, model size, rejection coverage and personal-symbol adaptability.

## 6. GPU and fixed-memory plan, reflecting your instructions

### What was verified

The laptop reports an **RTX 4050, 6,141 MiB total VRAM**, driver 621.01. `nvidia-smi` reports CUDA driver capability 13.5; that is not proof that a CUDA toolkit is installed. WSL default version is 2, but only the stopped `docker-desktop` distribution is installed. Docker's Linux engine is not running. RAPIDS training has **not** been executed or benchmarked.

RAPIDS requires a supported Linux environment; Windows support is through WSL2. Use a supported stable RAPIDS release, not nightly, and lock CUDA/Python/package versions from its matrix. The current 26.10 matrix includes Ada GPUs and Python 3.12; validate the actual environment before installation. [Official platform matrix](https://docs.nvidia.com/datascience/platform-support/index.html)

### Framework boundary

Use **RAPIDS cuDF/CuPy/cuML** for GPU numeric preprocessing, landmark logistic regression/SVM/kNN baselines and metrics. Use a **CUDA deep-learning framework** for the improved CNN. RAPIDS is not a replacement CNN trainer for DL4J. Prefer direct cuML GPU estimators rather than an accelerator path that can silently fall back to CPU. CPU file I/O/metadata bookkeeping is not CPU model-training fallback. [cuML](https://docs.nvidia.com/cuml/latest/)

### Fixed device pools, no Unified Memory or CPU spill

- Allocate a bounded RMM pool from `CudaMemoryResource`, with **initial size equal to maximum size**. Do not use `ManagedMemoryResource` or enable Unified Memory/spilling.
- Route CuPy and the selected compatible PyTorch allocator through that resource **before GPU tensor allocations**. RMM 26.10 documents both integrations. Verify allocator coverage and version compatibility rather than assuming it covers every library allocation. [RMM guide](https://docs.nvidia.com/rmm/26.10/user_guide/guide/)
- Proposed starting budgets: 1–2 GiB for a separate cuML process; about 3–3.5 GiB for a separate compact-CNN process. These are provisional budgets, not measured fit guarantees. Leave display/context/workspace headroom on this 6 GB laptop. Do not reserve separate full pools concurrently.
- Use fixed tensor shapes, reusable batch/I/O buffers and bounded queues. Mask padded validation/test rows so every real example is counted. Fail explicitly on OOM or missing CUDA; do not reroute learning/inference to CPU.
- Internal suballocations within the fixed pool are allowed by your clarified requirement. A fixed pool does not imply literally zero allocation operations, nor does it cap all driver/cuDNN/third-party allocations. Profile peak VRAM and allocations during warm-up and steady state.
- Never preload the complete dataset as FP32 images: the 20,841 selected 128×128×3 images alone require approximately **3.82 GiB**, before activations, gradients or CUDA workspaces. Landmark features are much smaller. Prefer bounded staging/cached uint8 images; do not train directly from slow OneDrive-mounted WSL paths if profiling identifies I/O stalls.

GPU acceleration and allocator policy can reduce compute/allocation overhead; they cannot fix the split or guarantee a speedup for tiny landmark models. Measure CUDA-synchronized timings including transfers and warm-up. No GPU training-time claim is made yet.

### Java deployment assessment

Keep Spring Boot/WebSocket/UI. Candidate CNN deployment is ONNX with Java ONNX Runtime and the CUDA execution provider. Check supported operators, precision, label order, crop/RGB-BGR/normalization parity, batch-1 outputs and native CUDA/cuDNN compatibility. Compare Java/Python outputs before rollout. Java and CUDA support are documented, but this project's new export has not been tested. [Java API](https://onnxruntime.ai/docs/get-started/with-java.html), [CUDA provider](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html)

RMM's Python pool does not automatically control Java/ONNX Runtime memory. GPU provider registration alone does not prove all operators execute on GPU. Verify operator placement and rejection of CPU fallback. If the Java binding cannot enforce the required memory contract, assess a local Linux GPU inference worker with fixed buffers, with Java forwarding locally; benchmark the extra hop. Do not silently claim the existing CPU DL4J inference has become GPU inference.

## 7. Prioritized execution plan — nothing here has been trained yet

### Phase A: repair the experiment before the network

1. Freeze the existing model/results as the legacy baseline. Confirm participant mapping and capture/session identifiers. Inspect all flagged similarity clusters; assign entire groups to one split.
2. Pre-register a subject-disjoint protocol, initially six training, two validation and two untouched test participant groups. Choose groups before examining scores. Audit class coverage and sufficient unique images; never borrow from test groups to fill a 350-image quota.
3. Fit scaling/PCA/augmentation policies only on the training side. The 50/class fine-tuning reserve must also belong only to training subjects/sessions. Prefer genuinely new training-domain captures for adaptation.
4. **Retrain from scratch or from generic external pretraining when later authorized.** Re-splitting and evaluating the existing model is not an unseen-signer test: it already saw all ten participant groups. Never initialize a clean held-out-signer experiment from this ASL checkpoint.
5. Version/hash the split, crop, feature schema and labels. Log per-example predictions, train/validation cross-entropy, accuracy, macro-F1, per-class/per-signer recall and detection coverage.

Deliverable: a leakage-audited dataset contract and a frozen test set. Suggested engineering estimate: 2–4 hours, excluding acquisition of missing metadata or new recordings.

### Phase B: fastest informative RAPIDS baseline

1. Provision WSL2 Ubuntu or a GPU-enabled Linux container after the plan is approved. Verify `nvidia-smi` inside it, CUDA allocation and fixed-pool behavior; lock environment versions.
2. Cache deterministic landmarks and quality flags; preserve handedness consistency and relative hand placement. Benchmark feature extraction separately—it is not automatically accelerated by cuML.
3. Train native-GPU logistic regression and a small SVM search (for example C in 0.1/1/10), plus a simple retrieval baseline. Fit train-only scaling and select by grouped validation. Start with one fixed fold/seed; repeat promising candidates across seeds/folds before making claims.
4. Record GPU-only execution, peak allocation, fit time, prediction p50/p95 and unknown rejection. These establish whether appearance-heavy RGB is actually necessary.

Deliverable: a fast geometry baseline with honest grouped scores. Engineering estimate: 2–6 hours after the GPU environment works. Actual fit/feature-extraction times require a pilot benchmark.

### Phase C: controlled CNN improvements, only after authorization

1. Reproduce the original architecture on the strict split with fresh weights; do not reuse its contaminated checkpoint for the held-out subjects.
2. Correct convolution activations explicitly; compare that change alone.
3. Replace flattening with GAP and a 64-dimensional bottleneck; compare against a small spatial head. If appropriate, compare smaller channel widths. Measure accuracy and compute separately.
4. Add train-only, label-preserving crop/scale/translation, moderate rotation and lighting/background variation. Avoid arbitrary flips or geometric changes that alter handshape/orientation meaning. Keep deterministic base preprocessing identical to deployment.
5. Use CUDA mixed precision after parity/stability checks. Test AdamW with a limited learning-rate/weight-decay search; sensible starting candidates include 3e-4/1e-3 LR and 1e-4/1e-3 weight decay. These are search candidates, not established optima.
6. Schedule LR from validation loss; stop after a predeclared patience (for example five non-improving epochs). Save by grouped validation loss with macro-F1/recall checks rather than training duration or an easily saturated accuracy alone. Log gradients and BN behavior to investigate instability.
7. Run a small pilot to determine throughput/memory before committing to a longer run. Do not train for four hours merely to occupy four hours.

Deliverable: an ablation log isolating activation, head, augmentation and optimizer effects. Engineering estimate: 1–2 days; compute budget estimated only after the CUDA pilot. A lower grouped score than 99.97% is expected to be more informative, not automatically a regression.

### Phase D: independent webcam proof and calibration

Collect a locked, independently recorded set from new signers and sessions, with varied background/light/camera distance and negative examples. Split entire clips/sessions; do not count neighboring frames as independent trials. Begin with the most confusable signs if a full 36-class capture set is not immediately available, then extend coverage.

Measure full-system accuracy including detector failures, macro-F1, worst-signer/class recall, unknown false commits per minute, calibration (NLL/Brier/ECE with documented bins), coverage at rejection thresholds, and complete capture-to-commit p50/p95 latency. Fit calibration/thresholds on a separate validation/calibration partition; never tune them against the final webcam test.

Proposed acceptance goals for review—not promises: meaningful improvement over a freshly trained grouped baseline, known-sign precision ≥95% at useful coverage, low unknown false-commit rate, stable batch-1 latency, and no OOM/CPU fallback under the chosen fixed pool. Agree on practical accuracy/latency thresholds before using the locked test set.

### Phase E: deployment, personal vocabulary and numeric compression

Choose a Pareto-efficient candidate, export and verify Java/GPU parity, then evaluate FP16/INT8 only if it improves actual end-to-end performance. Preserve a rollback artifact. Keep custom symbols in a versioned frozen-embedding/prototype or DTW library; adding examples must not retrain the entire CNN. Changing the embedding requires re-embedding stored examples or an explicit migration, not silently mixing incompatible templates.

## 8. Decision requested after this report

Approve the data/evaluation contract and GPU/memory design first. Then provision the environment and run the cheap RAPIDS baseline. Only after those results should a corrected CNN run begin. **No CNN retraining, environment installation, model replacement or changes to `cream_with_bro` were performed as part of this report.**

## 9. Scenario-by-scenario operational playbook

This section describes **future actions**, not actions already performed. Each scenario specifies its trigger, steps, evidence and decision. Environment provisioning and all model fitting remain paused until you approve execution. Your current instructions authorize planning and proof, not a new CNN run.

The order is: **freeze → verify environment → verify groups → align preprocessing → establish RAPIDS baselines → choose the next experiment → authorize CNN pilot → diagnose → calibrate → verify Java deployment → locked evaluation → rollout**. Custom-symbol evaluation runs alongside these steps, using separate enrollment and query recordings.

### S00 — Before any experiment: preserve the current state

**Trigger:** beginning the replacement project or revisiting it after a pause.

1. Record the current model, label and preprocessing versions. Preserve the existing weights and completed run as a legacy baseline.
2. Record its actual scope: same-participant image-split test, not unseen-signer webcam proof. Keep the original confusion matrix and run history unchanged.
3. Record the new experiment's purpose as one question, such as “Does geometry generalize better across people?” or “Does GAP reduce capacity without losing I/E recall?”
4. Record what is allowed now: planning only, GPU preflight, baseline fitting, CNN pilot or deployment. Do not treat approval for one stage as approval for all later stages.
5. Register the intended output directory and a distinct run ID before writing derived artifacts.

**Evidence:** a baseline inventory containing hashes, dataset/split versions, source-code revision or snapshot, and the experiment question.

**Proceed:** only when the prior result can be reproduced or inspected independently. **Stop:** if an experiment would overwrite the sole copy of a model, modify source images, or silently change the meaning of a historical result.

### S01 — RAPIDS environment is missing, stopped or incompatible

**Trigger:** the current laptop state: RTX 4050 present; Docker Linux engine stopped; no Ubuntu training distribution installed.

1. After provisioning is approved, choose one supported route: a dedicated WSL2 Ubuntu environment or a GPU-enabled Linux container. Do not attempt a native-Windows RAPIDS installation and call it equivalent.
2. Pin a compatible stable RAPIDS/Python/CUDA combination from the official matrix. Record the solved versions; a proposed specification is not an installed, tested environment.
3. Run `nvidia-smi` inside the selected Linux environment. Confirm that it sees the intended RTX 4050, not merely the Windows host reporting a GPU.
4. Verify CuPy device allocation and a small native-cuML operation, then a small CUDA tensor operation in the chosen deep-learning framework. These are future smoke checks, not a CNN training run.
5. Configure the bounded allocator before production GPU allocations. Record the device ID, driver/runtime/library versions, available VRAM and allocator configuration.
6. Save the environment lock/container digest and smoke-check output. Keep the Windows host driver; follow NVIDIA's WSL-specific toolkit guidance rather than installing an unrelated Linux display driver inside WSL.

**If Docker is merely stopped:** start the selected runtime after approval, then repeat the inside-environment checks. **If CUDA is unavailable:** fail and repair the environment; do not silently switch to CPU. **If package versions conflict:** fix the environment before changing the model or blaming its architecture.

**Evidence:** a GPU preflight record and environment lock. **Proceed:** only when the intended device is actually usable. No training-time estimate is accepted from a host-only `nvidia-smi` screenshot.

### S02 — Memory fits, runs out, grows unexpectedly or falls back

**Trigger:** preflight before each GPU model family, and whenever an allocation or performance issue appears.

1. Establish the available VRAM after display/context overhead. Choose one provisional fixed budget for the active process; do not assume all 6 GB is available to training.
2. Construct a device-memory RMM pool with equal initial and maximum sizes. Disable Unified/managed memory and spilling. Set supported CuPy/framework allocator hooks before tensor allocation.
3. Run RAPIDS and CNN jobs sequentially unless a measured combined budget proves they fit. Do not reserve two independent full-size pools on this laptop.
4. Use fixed batch/image/sequence shapes and reusable staging/I/O buffers. Record warm-up peaks, steady-state allocation peaks, total device usage and relevant library workspaces.
5. Test both the expected batch and the largest permitted batch. Deliberately test a controlled over-budget request in an isolated preflight: it must report an allocation failure rather than hiding it with host spill or CPU training.
6. Synchronize CUDA when timing. Record compute, transfers and preprocessing separately; Windows driver/display behavior and library allocations outside RMM must also be observed.

**If it fits:** preserve that configuration for the comparison. **If it OOMs:** end the run, reduce the configured batch/model/cache/workspace budget, restart cleanly and document the change. Use gradient accumulation only as an explicit training-setting change. **If memory keeps growing:** inspect retained tensors, graph lifetimes, input queues and unmanaged library allocations before increasing the pool. **If it is slower than expected:** profile; do not assume the allocator is the dominant bottleneck.

**Evidence:** allocator settings, peak-memory log, no-fallback check and synchronized timing. A fixed RMM pool constrains allocations it serves; it does not prove every driver or third-party allocation is inside it. Internal suballocations within the pool remain allowed by your clarified requirement.

### S03 — Participant/session mapping is uncertain or some classes have too few images

**Trigger:** preparing the first genuinely grouped experiment.

1. Create a metadata row for every source image: source path/hash, label, verified participant ID if known, filename prefix, capture/session/sequence identifiers if available, and quality flags.
2. Confirm what P1–P10 mean. If only filename prefixes are available, label the evaluation “prefix-group-disjoint” until physical signer identity is verified.
3. Choose the group split before measuring model performance. Start with the proposed six training, two validation and two locked test participant groups, subject to coverage and metadata checks.
4. Assign all photographs/frames from a participant to one partition for unseen-signer evaluation. If the question is instead personalization to a known user, use session/clip separation and label that different task explicitly.
5. Check each class's unique-image count inside the training groups before applying the requested main/fine-tuning caps. Validation and test groups are not available to fill a quota.
6. Publish the group IDs, split seed, label order, counts and manifest digests in a split contract.

**If counts are insufficient:** lower a cap or collect additional training-group data; do not copy/augment images into test or borrow test people. **If identity mapping is missing:** keep the limitation explicit and obtain metadata/new signers before making an unseen-person claim. **If a class is absent from a held-out group:** document the evaluation coverage and revise the protocol before fitting models, without choosing a split for its flattering score.

**Evidence:** split contract and automated zero-group-overlap assertions. **Proceed:** only when the evaluation task and grouping are unambiguous.

### S04 — Exact duplicates, near duplicates or conflicting labels cross partitions

**Trigger:** the existing 965 similarity candidates, any repeated hash, or a visual-quality concern.

1. Compute exact content hashes; distinguish repeated bytes from repeated-looking photographs.
2. For perceptual candidates, retain the original path, label, group, similarity method/threshold and example preview. Review representative clusters, especially across partitions.
3. Preserve known capture/session/sequence groups as indivisible units. A verified repeated capture or known source-image derivative must not straddle evaluation partitions.
4. Quarantine contradictory labels in a derived manifest for review; preserve the original files and an audit trail.
5. Recompute overlap and coverage after resolving the grouping. Hash the final manifests before model fitting.

**If two different people make similar valid signs:** do not merge them automatically just because a low-resolution hash matches. **If the same photograph was renamed under another prefix:** investigate the source mapping and keep the verified duplicate family on one side. **If a candidate is inconclusive:** retain it as an unresolved quality flag and prioritize stronger person/session separation.

**Evidence:** reviewed cluster log and final overlap report. Do not claim the entire candidate count is a proven duplicate count or delete source images on that basis.

### S05 — Hand tracking or cropping fails, or the CNN sees a different representation in deployment

**Trigger:** missing landmarks, clipped fingers, unstable left/right channels, or a difference between offline and webcam preprocessing.

1. Define one versioned base pipeline: image orientation, detector version, hand choice, padding, crop coordinates, resize/interpolation, channel order, scaling, landmark normalization and missingness policy.
2. Cache that deterministic base representation for all splits. Apply stochastic augmentation only to training examples, after the base pipeline.
3. Review examples stratified by label and participant, not just easy examples: include I/E, folded-finger shapes, edge-of-frame hands, occlusion and two hands.
4. Report detector coverage for every split and class. Keep failed detections in full-system evaluation; classification accuracy conditioned on successful detection is a separate metric.
5. Run the same image through offline preprocessing and the deployed path. Compare crop geometry, normalized arrays, landmark features and final predictions, not only two visually plausible previews.
6. Store preprocessing/schema hashes with each trained/exported artifact.

**If failures concentrate on a particular sign:** adjust detector/crop handling using training/validation data, or retain an RGB branch when geometry loses the relevant detail. **If handedness slots flicker:** test label-preserving canonicalization and temporal consistency. **If crop changes make a classifier worse:** revert that change or retrain on the matching representation later; do not keep a mismatch because one demonstration worked.

**Evidence:** preprocessing parity fixtures, coverage/error breakdown and manually reviewed examples. **Proceed:** only when train and deployment representations agree.

### S06 — The first RAPIDS landmark baselines are strong, weak or unreliable

**Trigger:** grouped data and GPU/memory preflight are approved and ready. This fitting step is not authorized by the current planning request.

1. Start with a native-cuML logistic regression baseline using normalized landmarks, joint geometry, hand-presence flags and quality metadata that do not encode label strings, filenames or participant IDs.
2. Fit learned scaling only on training data. Retain validation/test statistics solely for evaluation.
3. Run a bounded SVM search, initially C values 0.1, 1 and 10 with a documented kernel/gamma policy. Compare with a simple nearest-neighbor/prototype baseline.
4. Save per-example predictions and the exact model/feature settings. Check macro-F1, class recall, per-participant results, rejection coverage, fit/predict timing and peak VRAM.
5. Repeat promising candidates across predefined seeds/folds. Do not choose a new participant split because it makes a weak model look good.

**If geometry is strong and stable:** retain it as the primary candidate and train a CNN only if it addresses a measured residual failure or materially improves the frontier. **If geometry is weak because landmarks miss folded/contact details:** test an RGB or fusion branch. **If every baseline is poor:** inspect labels, group coverage, feature ordering, normalization and detector quality before scaling architecture. **If GPU setup/transfer dominates a tiny fit:** report that overhead honestly; keep GPU-only execution if that remains your requirement, without claiming an unmeasured speedup.

**Evidence:** baseline comparison on the same validation groups. **Proceed to CNN:** only with a concrete hypothesis and explicit fitting authorization.

### S07 — A new CNN pilot is approved

**Trigger:** explicit approval after the baseline and evaluation contract are reviewed.

1. Start fresh, or use generic external pretraining with documented provenance. Do not initialize from this ASL model for a claimed unseen-P1–P10 experiment: it has already seen every group.
2. First reproduce the original architecture on the strict split as a controlled reference. Use the same data and preprocessing contract as the candidate comparisons.
3. Test explicit linear convolution → BN → ReLU as a separate variant. Verify the configured and exported activations.
4. Test GAP plus a small bottleneck/head, then a small spatial head if GAP loses distinctions. Keep channel widths fixed for that comparison; reduce widths in a separate experiment.
5. Run a short CUDA pilot with fixed shapes and memory budget. Inspect finite losses, gradients, optimizer steps, prediction changes and validation logging before scheduling longer work.
6. Record training and validation loss/accuracy, macro-F1, class/group recall, learning rate, gradient norms, throughput and allocation peaks per epoch.
7. Use a predefined checkpoint rule based on independent validation loss with classification/coverage checks, plus a patience/maximum-epoch budget. Do not select training duration as the quality objective.

**If the pilot fails numerical/device checks:** stop immediately and repair it. **If it passes:** estimate the remaining compute from measured batches/epochs; provide a range, not a promised GPU speedup. **If CNN improvement is negligible:** retain the cheaper baseline instead of growing the network automatically.

**Evidence:** pilot log, architecture digest and a registered ablation question. No such new CNN pilot has run yet.

### S08 — Learning curves look wrong: choose the correct diagnosis

**Scenario A: training improves while independent validation loss worsens.** Confirm the same evaluation pipeline and adequate validation group coverage. Then test stronger label-preserving augmentation, weight decay, a smaller head and earlier stopping, one controlled change at a time. Retain the checkpoint before deterioration. This is evidence consistent with classical overfitting.

**Scenario B: both training and validation are poor.** First check label/order bugs, failed crops, feature scaling, unintended activations, learning-rate extremes and insufficient updates. If the pipeline is correct, compare capacity/optimization changes. Reducing capacity or increasing dropout indiscriminately may make underfitting worse.

**Scenario C: image-random scores remain high while grouped scores drop.** Treat the drop as evidence that the original evaluation was optimistic. Inspect acquisition/identity shortcuts and collect diverse training sessions. Do not “repair” the score by returning to the random split.

**Scenario D: grouped validation reaches 100% almost immediately.** Re-audit group mapping, feature leakage, derived-image families and preprocessing caches. Check a second predeclared development fold and an independently recorded validation session. A genuinely easy dataset is possible; rapid saturation alone is not proof of a bug.

**Scenario E: isolated loss spikes or a temporary accuracy collapse occurs.** Check gradients, learning rate, BN statistics, bad batches, mixed-precision scaling and corrupt/changed inputs. The existing epoch-11 event belongs here until stronger evidence is available. Do not label every instability event “overfitting.”

**Scenario F: validation accuracy is unchanged but validation loss/calibration worsens.** Inspect confidence on errors and margin distributions. Select by the registered loss/calibration rule rather than a saturated accuracy alone. Temperature scaling can be evaluated later; it cannot repair a dependent split.

**Evidence:** complete curves on independent groups and the specific diagnostic checks. **Proceed:** only with the remedy matching the observed pattern; record competing explanations when evidence is incomplete.

### S09 — Bottleneck width or pooling improves some metrics but harms others

**Trigger:** choosing between compact representations rather than assuming smaller is always better.

1. Compare a small, predefined bottleneck-width set such as 16/32/64/128 under the same split and training budget. First use a pilot to eliminate clearly unsuitable sizes.
2. Measure grouped gesture performance, worst-class recall, latency, model size and peak memory. Include close handshapes; a better mean score can hide a worse important class.
3. Compare GAP with a small spatial head to test whether discarding explicit location/layout hurts the task.
4. If examining nuisance identity, train a probe only on training-participant data with label-balanced examples and held-out captures of those same identities. Testing an identity classifier on entirely unseen identity labels is not a meaningful leakage test.
5. Combine representation probes with foreground/background interventions. A probe can show that an embedding contains identity information; it does not show the gesture classifier uses that information causally.
6. Choose a Pareto-efficient candidate under the agreed accuracy/coverage constraints. Do not claim the 81× parameter reduction implies an 81× runtime improvement.

**If the narrow bottleneck hurts gesture recall:** increase it or preserve more spatial detail. **If it mainly suppresses nuisance sensitivity and keeps recall:** retain it. **If only a visualization looks cleaner:** do not treat a t-SNE plot, binned mutual-information curve or attractive clusters as acceptance evidence.

**Evidence:** a width/pooling ablation with parameter counts and measured performance. Information-plane or VQ research remains optional after this practical comparison.

### S10 — Static signs work, but J/Z, movement or transitions fail

**Trigger:** temporal behavior is the dominant residual failure.

1. Separate static-pose classification from trajectory recognition in the task definition. Specify when a gesture starts/ends and whether recognition is explicitly triggered or continuous.
2. Record timestamped landmark sequences, hand-presence masks and tracking quality. Keep entire clips and sessions in one split.
3. Establish DTW as the temporal reference. Compare a small temporal convolution/GRU only after that reference and a timing budget are defined.
4. Compare short fixed windows such as 16 and 32 frames while preserving duration/timestamp information. Measure actual sampling rate; nominal timers do not prove regularly spaced frames.
5. Test speed variation, pauses, repeated letters, gesture-to-rest transitions, occlusion and hand-channel swaps. Add realistic non-sign movement to rejection evaluation.
6. Measure capture-to-commit latency and false commits, including window accumulation and stabilization time.

**If a smaller window misses motion:** increase context or improve segmentation. **If a larger window delays interaction:** consider event-driven start/end detection and a bounded rolling buffer. **If tracker jitter resembles motion:** improve tracking/quality gating before enlarging the temporal model. Faster CNN inference alone cannot make a single-frame model understand a trajectory.

**Evidence:** held-out clip/session results and full latency distributions. Do not count hundreds of adjacent frames from one clip as hundreds of independent trials.

### S11 — The model is confidently wrong on empty frames or unfamiliar gestures

**Trigger:** high-confidence mistakes, accidental transcript commits or unfamiliar inputs.

1. Create separate validation negative sets: no hand, objects, partial hands, transitions and unregistered gestures. Keep an untouched negative test set from different sessions.
2. Measure detector misses/false detections separately from classifier errors. Preserve all failures in the full-system denominator.
3. Evaluate confidence calibration on held-out known-class validation data, with documented NLL/Brier/ECE definitions. Fit any temperature there, not on the test set.
4. Compare rejection rules using validation negatives: confidence, margin and/or embedding distance with quality gates. Select operating thresholds for useful coverage and false-commit rate, not maximum accepted-frame accuracy alone.
5. Freeze thresholds before final testing. Report accepted precision, total coverage, unknown false accepts and transcript false commits per minute together.

**If precision improves only because almost every input is rejected:** that is not a useful recognition system; report the lost coverage. **If unknown confidence remains high:** calibration alone is insufficient; improve negative/OOD handling and representation. **If a GPU is unavailable:** show an explicit unavailable state under the no-CPU-fallback requirement rather than silently invoking a CPU model.

**Evidence:** a risk–coverage/rejection operating-point record. Proposed numerical targets require review; they are not already achieved requirements or measured results.

### S12 — A user adds or corrects a personal symbol without CNN retraining

**Trigger:** enrollment of a custom static or dynamic symbol.

1. Keep the gesture embedding/feature extractor frozen and versioned. Save the schema/model ID with every template.
2. Collect 3–5 enrollment examples with natural variation. Collect additional, separately recorded query examples; do not evaluate only by matching an enrollment recording back to itself.
3. Match against prototypes/nearest neighbors or DTW as appropriate. Require rejection of distant and ambiguous candidates.
4. Ask for confirmation/correction of a specific prediction. Add evidence only after an explicit user decision; do not reinforce the model's own guesses automatically.
5. Bound example counts, retain negative feedback and inspect/prune outliers using enrollment/development data. Evaluate again on held-out query sessions.
6. Confirm persistence, deletion and restart behavior. Keep personal adaptation results distinct from unseen-signer results.

**If two labels have essentially the same visible gesture:** request discriminative examples or explicit contextual selection; more epochs cannot create missing visual evidence. **If dynamic direction matters:** retain relative movement and hand placement. **If the embedding changes:** re-embed compatible stored source features or migrate the library explicitly; never mix old/new embeddings as if distances are comparable.

**Evidence:** enrollment/query manifests, rejected-match examples, confirmed feedback records and persistence tests. Updating the template library does not authorize retraining the CNN.

### S13 — The GPU-trained model works in Python but fails or differs in Java

**Trigger:** assessing a candidate export before replacing the current production classifier.

1. Freeze a parity set of ordinary, difficult, low-confidence and negative inputs. Store expected preprocessing tensors and model outputs before export.
2. Export a supported static-shape graph with its labels, preprocessing/version metadata and precision specification. Keep the original artifact unchanged.
3. Check Java's crop, color order, tensor layout, normalization and class ordering against the parity fixtures before debugging model weights.
4. Load the intended CUDA execution provider and inspect actual operator placement. Provider availability alone does not prove GPU-only computation.
5. Compare output differences and label/margin behavior across the parity set. Define precision-appropriate tolerances before testing; investigate differences near decision boundaries instead of demanding arbitrary universal numerical equality.
6. Measure batch-1 latency, copies, native memory and steady-state allocation behavior in the Java path. RMM's Python allocator does not automatically govern Java/ONNX Runtime allocations.

**If an operator or binding forces CPU fallback:** change the supported graph/runtime path or reject that deployment candidate. **If the memory contract cannot be enforced in Java:** evaluate the proposed local Linux GPU worker with Java forwarding locally, then measure the extra hop. **If export of a chosen cuML estimator is unsupported:** establish a supported serving/export route before committing to it as the production model.

**Evidence:** parity report, operator/device-placement report, dependency lock and latency/memory measurements. The old CPU DL4J model remains a historical baseline; do not describe it as GPU-accelerated merely because training elsewhere used CUDA.

### S14 — FP16/INT8 reduces size but may change accuracy or latency

**Trigger:** an already valid model meets evaluation requirements and deployment cost is still a bottleneck.

1. Preserve the validated reference model and preprocessing.
2. Evaluate FP16 first where supported. Measure output drift, calibration, class/group recall and latency rather than assuming lower precision is harmless.
3. For INT8, use a representative training/calibration subset with diverse permitted groups and capture conditions. Do not derive scales from the locked test set.
4. Repeat the complete parity and rejection evaluation in the actual target runtime. Check supported quantized operators and actual GPU placement.
5. Keep quantization only if it improves the measured frontier without violating agreed accuracy/coverage constraints.

**If size shrinks but latency does not:** identify transfer/kernel/unsupported-operator overhead; keep the simpler reference if it is better overall. **If rare classes degrade:** alter calibration/model choices or abandon INT8. **If the underlying split is still invalid:** return to S03; numerical compression is not an overfitting remedy.

**Evidence:** reference-versus-compressed parity and performance report. This step follows successful evaluation; it is not the first experiment.

### S15 — Final evaluation, acceptance and rollout

**Trigger:** one candidate, preprocessing pipeline and threshold configuration have been selected using development data only.

1. Freeze weights, schemas, thresholds, environment and test protocol. Identify the precise unseen-signer, known-user/new-session and unknown-gesture questions being tested.
2. Evaluate the locked dataset and independent webcam sessions, including failed detections. Produce per-example predictions and per-group/class metrics.
3. Estimate uncertainty at the person/clip/session level when sufficient groups exist. Do not treat correlated video frames as independent samples for narrow confidence intervals.
4. Review overall and worst-group results, rejection/coverage, false commits, latency, memory limits and GPU-only behavior. Explain failures rather than hiding them in one average.
5. If accepted, package versioned weights, preprocessing, labels, calibration, environment and personal-library compatibility rules. Install side by side before changing the active route.
6. Run restart, model-load, camera, repeated-letter, feedback, persistence and deletion checks. Preserve the previous approved artifacts for explicit rollback.

**If the final test fails:** do not repeatedly tune against that same locked test and continue calling it untouched. Treat it as development evidence and create a new independent final holdout after redesign. **If production GPU execution fails:** halt the GPU route or restore an approved policy-compatible version; do not silently fall back to CPU. **If baseline and candidate trade wins:** select according to the agreed operating constraints, not the biggest accuracy headline.

**Evidence:** a final model card that states the exact evaluation population and remaining limitations. No model is accepted solely because it exceeds the old dependent-split 99.97% score.

### S16 — There is only a four-hour experiment window

**Trigger:** imposing a wall-clock budget after the environment, metadata and required recordings are ready.

1. Allocate the first 20 minutes to device/allocator/preprocessing preflight. Fail fast if a required dependency is unavailable.
2. Allocate the next 30 minutes to final group/coverage checks and a measured feature-extraction/cache pilot. Extend or postpone the experiment if extraction cannot fit; do not conceal this work outside the estimate.
3. Allocate about 50 minutes to the bounded RAPIDS baseline experiments and diagnostics. Their actual cost must be measured; this allocation is a timebox, not a fit-time prediction.
4. Spend 15 minutes choosing the next hypothesis based on those results. A good geometry baseline can make a CNN unnecessary for the immediate milestone.
5. Only if authorized, allocate up to 85 minutes to a small CNN pilot and selected controlled comparisons. Stop at a safe checkpoint; record incomplete experiments honestly.
6. Reserve the final 40 minutes for calibration/parity or evaluation that is genuinely ready. If collection, export or validation is not ready, use the time to produce the missing evidence instead of forcing a model release.

These intervals total 240 minutes. WSL/container provisioning, new-user recording and annotation may require additional time; no end-to-end four-hour completion guarantee is implied. The outcome may be a sound baseline and a next-experiment decision, rather than a newly deployed CNN. All fitting remains subject to your approval.

## 10. Evidence package required from every approved run

Use a separate run directory containing the following proposed records:

- `experiment.json`: hypothesis, dataset/group mapping digests, split seed, model/initialization source, input representation, optimizer/search space, checkpoint rule and permitted actions.
- `environment.json`: OS/container, exact package versions, CUDA device/runtime/driver and native inference dependencies.
- `memory_policy.json`: pool initial/maximum size, device-only upstream, library allocator hooks, static shapes/buffers, spill disabled and explicit no-CPU-fallback policy.
- `data_audit.json`: image/clip/person counts, class coverage, exact/perceptual/group overlap checks, quality exclusions and reasons.
- `history.csv`: train and validation loss/accuracy, macro-F1, worst-group/class recall, learning rate, gradient/BN diagnostics as applicable, elapsed time and peak memory.
- `predictions.csv`: sample/clip ID, group/session, true/predicted class, scores, detector status, rejection decision and model/schema version. Do not log private raw camera images by default.
- `performance.json`: warm-up method, sample count, synchronized model timing, transfer/preprocessing timing, p50/p95 full-system timing, VRAM and allocation observations.
- `selection.json`: the selected checkpoint, calibration/rejection settings, development evidence, test-access history and reason for selection.
- `deployment-parity.json`: preprocessing/output comparison, provider/operator placement, supported precision and GPU/memory-policy results.
- `model-card.md`: what the model was tested on, known weaknesses, supported static/dynamic scope, personal-library compatibility and rollback policy.

These filenames are an operational proposal; they are not claims that the corresponding new experiments have run.

## 11. What should happen next, in exact order

1. Review and approve or revise the evaluation population, grouping rules and proposed acceptance criteria.
2. Approve environment provisioning/GPU preflight separately if you want implementation to begin.
3. Produce the group-disjoint manifests and aligned preprocessing evidence without fitting a CNN.
4. Authorize the bounded RAPIDS baseline experiment if its inputs and memory/device checks pass.
5. Review baseline failures and select a specific CNN hypothesis only if useful.
6. Ask for explicit CNN pilot authorization; **do not start it under the present “plan and proof first” instruction**.
7. Review the candidate's independent validation and deployment evidence before unlocking a final test or replacing the installed model.

The original model and source dataset remain the reference during this process. `cream_with_bro` remains outside the write scope.
