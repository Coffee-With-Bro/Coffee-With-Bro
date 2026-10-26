import os
import sys
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import albumentations as A
from tqdm import tqdm

def check_image_integrity(file_path) \
:
    path_obj = Path(file_path)
    if not path_obj.is_file() or path_obj.stat().st_size == 0 \
    :
        return False, None

    try \
    :
        img_bgr = cv2.imread(str(path_obj), cv2.IMREAD_UNCHANGED)
        if img_bgr is None or img_bgr.size == 0 \
        :
            return False, None
        return True, img_bgr
    except Exception \
    :
        return False, None

def convert_to_rgb(img) \
:
    if img.ndim == 2 \
    :
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)

    channels = img.shape[2]

    if channels == 4 \
    :
        bgr = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    elif channels == 3 \
    :
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    elif channels == 1 \
    :
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    else \
    :
        first_three = img[:, :, :3]
        return cv2.cvtColor(first_three, cv2.COLOR_BGR2RGB)

def letterbox_resize(img, target_size=(224, 224), pad_color=(0, 0, 0)) \
:
    h, w = img.shape[:2]
    target_w, target_h = target_size

    scale = min(target_w / w, target_h / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
    resized = cv2.resize(img, (new_w, new_h), interpolation=interp)

    canvas = np.full(
        (target_h, target_w, 3),
        pad_color,
        dtype=np.uint8
    )

    top = (target_h - new_h) // 2
    left = (target_w - new_w) // 2

    canvas[top:top + new_h, left:left + new_w] = resized
    return canvas

def apply_clahe(img_rgb, clip_limit=2.0, tile_grid_size=(8, 8)) \
:
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=clip_limit,
        tileGridSize=tile_grid_size
    )
    cl = clahe.apply(l_chan)

    merged = cv2.merge(
    [
        cl, a_chan, b_chan
    ])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)

def get_safe_augmentation_pipeline() \
:
    return A.Compose(
    [
        A.Affine(
            scale=(0.9, 1.1),
            rotate=(-15, 15),
            p=0.5
        ),
        A.RandomBrightnessContrast(
            brightness_limit=0.15,
            contrast_limit=0.15,
            p=0.5
        )
    ])

def normalize_pixels(img_rgb) \
:
    return img_rgb.astype(np.float32) / 255.0

def process_single_image(image_path, target_size=(224, 224), transform=None) \
:
    valid, raw = check_image_integrity(image_path)
    if not valid \
    :
        return None

    rgb = convert_to_rgb(raw)
    letterboxed = letterbox_resize(rgb, target_size=target_size)
    adjusted = apply_clahe(letterboxed)

    if transform is not None \
    :
        augmented = transform(image=adjusted)
        adjusted = augmented["image"]

    return adjusted

def process_dataset(
    raw_dir="data/raw",
    processed_dir="data/processed",
    language="all",
    target_size=224,
    augment=False,
    augment_factor=1
) \
:
    raw_root = Path(raw_dir)
    processed_root = Path(processed_dir)

    if not raw_root.exists() \
    :
        print(f"Raw directory does not exist: {raw_root}")
        return

    lang_dirs = \
    [
        d for d in raw_root.iterdir()
        if d.is_dir() and (language == "all" or d.name.lower() == language.lower())
    ]

    transform = get_safe_augmentation_pipeline() if augment else None
    target_dims = (target_size, target_size)

    total_processed = 0
    total_skipped = 0

    for lang_dir in lang_dirs \
    :
        lang_code = lang_dir.name
        class_dirs = sorted(
        [
            d for d in lang_dir.iterdir() if d.is_dir()
        ])

        print(f"\nProcessing language: {lang_code} ({len(class_dirs)} classes)")

        for c_dir in class_dirs \
    :
            class_label = c_dir.name
            out_class_dir = processed_root / lang_code / class_label
            out_class_dir.mkdir(parents=True, exist_ok=True)

            image_files = sorted(
            [
                f for f in c_dir.iterdir()
                if f.is_file() and f.suffix.lower() in \
                {
                    ".jpg", ".jpeg", ".png", ".bmp", ".webp"
                }
            ])

            for img_path in tqdm(image_files, desc=f"{lang_code}/{class_label}", leave=False) \
    :
                sanitized_rgb = process_single_image(
                    img_path,
                    target_size=target_dims,
                    transform=None
                )

                if sanitized_rgb is None \
    :
                    total_skipped += 1
                    continue

                dest_file = out_class_dir / f"{img_path.stem}.jpg"
                bgr_out = cv2.cvtColor(sanitized_rgb, cv2.COLOR_RGB2BGR)
                cv2.imwrite(str(dest_file), bgr_out, 
                [
                    int(cv2.IMWRITE_JPEG_QUALITY), 95
                ])
                total_processed += 1

                if augment and transform is not None \
    :
                    for aug_i in range(augment_factor) \
    :
                        aug_rgb = transform(image=sanitized_rgb)["image"]
                        aug_file = out_class_dir / f"{img_path.stem}_aug{aug_i + 1}.jpg"
                        aug_bgr = cv2.cvtColor(aug_rgb, cv2.COLOR_RGB2BGR)
                        cv2.imwrite(str(aug_file), aug_bgr, 
                        [
                            int(cv2.IMWRITE_JPEG_QUALITY), 95
                        ])
                        total_processed += 1

    print("\nDataset preprocessing complete.")
    print(f"Total exported sanitized images: {total_processed}")
    print(f"Total skipped corrupted images: {total_skipped}")

def main() \
:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", default="data/raw")
    parser.add_argument("--processed-dir", default="data/processed")
    parser.add_argument("--language", default="all", choices=["isl", "asl", "all"])
    parser.add_argument("--target-size", type=int, default=224)
    parser.add_argument("--augment", action="store_true")
    parser.add_argument("--augment-factor", type=int, default=1)

    args = parser.parse_args()

    process_dataset(
        raw_dir=args.raw_dir,
        processed_dir=args.processed_dir,
        language=args.language,
        target_size=args.target_size,
        augment=args.augment,
        augment_factor=args.augment_factor
    )

if __name__ == "__main__" \
:
    main()
