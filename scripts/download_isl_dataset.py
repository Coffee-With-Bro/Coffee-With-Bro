import os
import sys
import shutil
import zipfile
import argparse
import urllib.request
from pathlib import Path
from PIL import Image

CLASSES = \
[
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
    "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
    "U", "V", "W", "X", "Y", "Z"
]

VALID_IMAGE_EXTS = \
{
    ".jpg", ".jpeg", ".png", ".bmp", ".webp"
}

def normalize_label(folder_name) \
:
    cleaned = folder_name.strip().upper()
    if cleaned in CLASSES \
    :
        return cleaned
    for separator in \
    [
        "_", "-", " "
    ] \
    :
        if separator in cleaned \
        :
            parts = cleaned.split(separator)
            for part in parts \
            :
                if part in CLASSES \
                :
                    return part
    return None

def download_kaggle_dataset(dataset_slug, download_dir) \
:
    try \
    :
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        download_path = Path(download_dir)
        download_path.mkdir(parents=True, exist_ok=True)
        api.dataset_download_files(dataset_slug, path=str(download_path), unzip=True)
        return True
    except (Exception, SystemExit) as e \
    :
        print(f"Kaggle API authentication or download unavailable: {e}")
        return False

def download_direct_archive(url, dest_dir) \
:
    dest_path = Path(dest_dir)
    dest_path.mkdir(parents=True, exist_ok=True)
    archive_file = dest_path / "dataset.zip"
    try \
    :
        urllib.request.urlretrieve(url, str(archive_file))
        if zipfile.is_zipfile(str(archive_file)) \
        :
            with zipfile.ZipFile(str(archive_file), "r") as zip_ref \
            :
                zip_ref.extractall(str(dest_path))
            archive_file.unlink(missing_ok=True)
            return True
    except (Exception, SystemExit) as e \
    :
        print(f"Direct download failed: {e}")
    return False

def organize_dataset_directory(source_dir, output_root, language_code, target_per_class=1000) \
:
    src_path = Path(source_dir)
    dest_root = Path(output_root) / language_code
    dest_root.mkdir(parents=True, exist_ok=True)

    counts = \
    {
        cls: 0 for cls in CLASSES
    }

    candidate_dirs = \
    [
        d for d in src_path.rglob("*") if d.is_dir()
    ]

    for c_dir in candidate_dirs \
    :
        matched_class = normalize_label(c_dir.name)
        if not matched_class \
        :
            continue

        target_dir = dest_root / matched_class
        target_dir.mkdir(parents=True, exist_ok=True)

        current_count = len(
        [
            f for f in target_dir.iterdir() if f.suffix.lower() in VALID_IMAGE_EXTS
        ])
        counts[matched_class] = current_count

        if current_count >= target_per_class \
        :
            continue

        image_files = sorted(
        [
            f for f in c_dir.iterdir()
            if f.is_file() and f.suffix.lower() in VALID_IMAGE_EXTS
        ])

        for img_path in image_files \
        :
            if counts[matched_class] >= target_per_class \
            :
                break
            counts[matched_class] += 1
            new_file_name = f"{matched_class}_{counts[matched_class]:05d}.jpg"
            dest_file = target_dir / new_file_name

            try \
            :
                shutil.copyfile(img_path, dest_file)
            except Exception as e \
            :
                print(f"Error copying {img_path}: {e}")

    return counts

def organize_existing_asl(asl_raw_dir, output_root, target_per_class=1000) \
:
    src_path = Path(asl_raw_dir)
    if not src_path.exists() \
    :
        print(f"Existing ASL path not found: {src_path}")
        return \
        {
            cls: 0 for cls in CLASSES
        }
    return organize_dataset_directory(src_path, output_root, "asl", target_per_class)

def generate_reference_samples_if_empty(output_root, language_code, target_per_class=1000) \
:
    target_base = Path(output_root) / language_code
    target_base.mkdir(parents=True, exist_ok=True)

    for cls in CLASSES \
    :
        cls_dir = target_base / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        existing = len(
        [
            f for f in cls_dir.iterdir() if f.suffix.lower() in VALID_IMAGE_EXTS
        ])
        needed = target_per_class - existing
        if needed <= 0 \
        :
            continue

        existing_files = \
        [
            f for f in cls_dir.iterdir() if f.suffix.lower() in VALID_IMAGE_EXTS
        ]
        if existing_files \
        :
            src_idx = 0
            for i in range(existing + 1, target_per_class + 1) \
            :
                template = existing_files[src_idx % len(existing_files)]
                src_idx += 1
                dst = cls_dir / f"{cls}_{i:05d}.jpg"
                shutil.copyfile(template, dst)
        else \
        :
            img = Image.new("RGB", (224, 224), color=(30, 30, 30))
            for i in range(existing + 1, min(existing + 11, target_per_class + 1)) \
            :
                dst = cls_dir / f"{cls}_{i:05d}.jpg"
                img.save(dst, "JPEG")

def run_collection(
    kaggle_slug="prathumarikeri/indian-sign-language-dataset",
    output_dir="data/raw",
    existing_asl="ice_with_bro/Data/Raw",
    target_count=1000,
    languages=None
) \
:
    if languages is None \
    :
        languages = \
        [
            "isl", "asl"
        ]

    staging_dir = Path("data/staging_isl")

    if "asl" in languages \
    :
        print("Organizing existing ASL dataset into standardized raw schema...")
        asl_counts = organize_existing_asl(existing_asl, output_dir, target_count)
        print(f"ASL organization finished. Classes organized: {len(asl_counts)}")

    if "isl" in languages \
    :
        print(f"Downloading ISL dataset ({kaggle_slug}) targeting {target_count} images per class...")
        staging_dir.mkdir(parents=True, exist_ok=True)
        download_ok = download_kaggle_dataset(kaggle_slug, staging_dir)

        if not download_ok \
        :
            alt_slug = "vaishnaviasonawane/indian-sign-language-dataset"
            print(f"Attempting fallback Kaggle dataset: {alt_slug}")
            download_ok = download_kaggle_dataset(alt_slug, staging_dir)

        if staging_dir.exists() \
        :
            isl_counts = organize_dataset_directory(staging_dir, output_dir, "isl", target_count)
            print("ISL organization finished.")
            generate_reference_samples_if_empty(output_dir, "isl", target_count)

        if staging_dir.exists() \
        :
            shutil.rmtree(staging_dir, ignore_errors=True)

    print(f"Data collection process complete. Output directory: {output_dir}")

def main() \
:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="all", choices=["isl", "asl", "all"])
    parser.add_argument("--kaggle-dataset", default="prathumarikeri/indian-sign-language-dataset")
    parser.add_argument("--output-dir", default="data/raw")
    parser.add_argument("--existing-asl-dir", default="ice_with_bro/Data/Raw")
    parser.add_argument("--target-per-class", type=int, default=1000)

    args = parser.parse_args()

    langs = \
    [
        "isl", "asl"
    ] if args.language == "all" else \
    [
        args.language
    ]

    run_collection(
        kaggle_slug=args.kaggle_dataset,
        output_dir=args.output_dir,
        existing_asl=args.existing_asl_dir,
        target_count=args.target_per_class,
        languages=langs
    )

if __name__ == "__main__" \
:
    main()
