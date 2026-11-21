"""Preprocessing diagnostic only: test whether image context/orientation prevents detection."""
import json
from pathlib import Path
from collections import Counter
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

root = Path(__file__).resolve().parent.parent
options = vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path=str(
    root / 'milk_with_bro/public/mediapipe/hand_landmarker.task')),
    running_mode=vision.RunningMode.IMAGE, num_hands=2,
    min_hand_detection_confidence=.6, min_hand_presence_confidence=.6)
counts = Counter()
with vision.HandLandmarker.create_from_options(options) as detector:
    for label in ('A', 'C', 'O', 'T'):
        failures = []
        for file in sorted((root / 'ice_with_bro/runs/java-cuda-grouped/crops/images' / label).glob('*.json')):
            row = json.loads(file.read_text())
            if not row['detected']:
                failures.append(row)
        for row in failures[:100]:
            image = cv2.cvtColor(cv2.imread(row['source_path']), cv2.COLOR_BGR2RGB)
            h, w = image.shape[:2]
            padded = cv2.copyMakeBorder(image, h//3, h//3, w//3, w//3, cv2.BORDER_REPLICATE)
            counts[label + '.tested'] += 1
            for turns in (0, 1, 2, 3):
                candidate = np.ascontiguousarray(np.rot90(padded, turns))
                result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=candidate))
                if result.hand_landmarks:
                    counts[label + '.recovered'] += 1
                    break
        print(json.dumps(dict(counts)), flush=True)
print(json.dumps(dict(counts)), flush=True)
