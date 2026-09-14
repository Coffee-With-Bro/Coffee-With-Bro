import cv2
import pandas as pd
from pathlib import Path
from tqdm import tqdm

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

BASE_DIR = Path(__file__).parent / "Data"
MODEL_PATH = Path(__file__).parent / "hand_landmarker.task"
OUTPUT_DIR = Path(__file__).parent / "landmarks_output"

NUM_HANDS = 2
POINTS_PER_HAND = 21
COORDS_PER_POINT = 3

def build_landmarker():
    base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=NUM_HANDS,
    )
    return vision.HandLandmarker.create_from_options(options)


def extract_row(landmarker, image_path: Path):
    image = cv2.imread(str(image_path))
    if image is None:
        return None, 0

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    result = landmarker.detect(mp_image)

    row_values = []
    hands_found = len(result.hand_landmarks)

    for hand_index in range(NUM_HANDS):
        if hand_index < hands_found:
            hand = result.hand_landmarks[hand_index]
            for point in hand:
                row_values.extend([point.x, point.y, point.z])
        else:
            row_values.extend([0.0] * POINTS_PER_HAND * COORDS_PER_POINT)

    return row_values, hands_found


def process_split(landmarker, split_name: str):
    split_dir = BASE_DIR / split_name
    label_dirs = sorted([d for d in split_dir.iterdir() if d.is_dir()])

    rows = []
    skipped_no_hand = 0
    skipped_unreadable = 0

    for label_dir in label_dirs:
        label = label_dir.name
        image_paths = list(label_dir.glob("*"))

        for image_path in tqdm(image_paths, desc=f"{split_name}/{label}"):
            row_values, hands_found = extract_row(landmarker, image_path)

            if row_values is None:
                skipped_unreadable += 1
                continue
            if hands_found == 0:
                skipped_no_hand += 1
                continue

            rows.append([label, hands_found] + row_values)

    columns = ["label", "hand_count"]
    for hand_index in range(NUM_HANDS):
        for point_index in range(POINTS_PER_HAND):
            columns += [
                f"h{hand_index}_x{point_index}",
                f"h{hand_index}_y{point_index}",
                f"h{hand_index}_z{point_index}",
            ]

    df = pd.DataFrame(rows, columns=columns)

    OUTPUT_DIR.mkdir(exist_ok=True)
    out_path = OUTPUT_DIR / f"{split_name}.csv"
    df.to_csv(out_path, index=False)

    print(f"\n{split_name}: wrote {len(df)} rows to {out_path}")
    print(f"{split_name}: skipped {skipped_no_hand} images (no hand detected), "
          f"{skipped_unreadable} images (unreadable file)")


def main():
    landmarker = build_landmarker()
    process_split(landmarker, "train")
    process_split(landmarker, "test")


if __name__ == "__main__":
    main()