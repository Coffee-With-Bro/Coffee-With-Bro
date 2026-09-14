# ice_with_bro — Machine Learning & Data Preprocessing Pipeline

The Python data engineering and deep learning experimentation suite for **Coffee with Bro**.

Built for **UCS503 Software Engineering** at Thapar Institute of Engineering and Technology.

---

## Overview

`ice_with_bro` handles all offline data preparation, image preprocessing, landmark extraction, and baseline neural network training. It prepares the raw American Sign Language (ASL-HG) dataset into normalized 128×128 image folders and tabular landmark CSV files used for training both the PyTorch baseline model and the final DeepLearning4j (Java) model.

---

## Directory Contents

| File | Purpose |
| :--- | :--- |
| `preprocess_raw.py` | Reads raw dataset folders, resizes images to uniform 128×128 RGB, and creates an 80/20 train/test split. |
| `PreProcessing.py` | MediaPipe vision pipeline that extracts 21 hand landmarks (x, y, z coordinates) per hand and outputs `train.csv` and `test.csv`. |
| `train_cnn.py` | PyTorch training script that trains a 3-block convolutional neural network from scratch on 128×128 images. |
| `requirements.txt` | Python library dependencies (torch, torchvision, opencv-python, mediapipe, pillow, scikit-learn, tqdm, pandas). |
| `Data/` | Directory where raw and processed dataset splits are placed. |

---

## Prerequisites & Environment Setup

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Pipelines

### 1. Dataset Image Resizing and Splitting
```bash
python preprocess_raw.py
```
Processes raw ASL image directories and outputs structured `train/` and `test/` folders of 128×128 images.

### 2. MediaPipe Landmark Extraction
```bash
python PreProcessing.py
```
Extracts 21 3D joint coordinates for hands in each photo and saves tabular CSV files.

### 3. CNN Training (PyTorch)
```bash
python train_cnn.py
```
Trains the convolutional neural network across all 36 classes and saves model checkpoints to `asl_cnn.pt`.
