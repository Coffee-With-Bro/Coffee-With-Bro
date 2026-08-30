from pathlib import Path
from PIL import Image
from sklearn.model_selection import train_test_split
from tqdm import tqdm


# -----------------------------
# Configuration
# -----------------------------

RAW_DIR = Path(r"C:\Users\abhis\OneDrive\Desktop\ENGINEERING\5th sem\java\asl_dataset")
PROCESSED_DIR = Path(__file__).parent / "Processed"

IMG_SIZE = (128, 128)
TEST_SIZE = 0.2
RANDOM_STATE = 42

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


# -----------------------------
# Create output directories
# -----------------------------

(PROCESSED_DIR / "train").mkdir(parents=True, exist_ok=True)
(PROCESSED_DIR / "test").mkdir(parents=True, exist_ok=True)


# -----------------------------
# Process each class
# -----------------------------

for class_dir in sorted(RAW_DIR.iterdir()):

    if not class_dir.is_dir():
        continue

    class_name = class_dir.name

    # Get all images belonging to this class
    images = [
        p for p in class_dir.iterdir()
        if p.suffix.lower() in VALID_EXTENSIONS
    ]

    if len(images) == 0:
        print(f"Skipping {class_name}: no images found")
        continue

    # -----------------------------
    # Train/test split
    # -----------------------------

    train_images, test_images = train_test_split(
        images,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE
    )

    # Create class directories
    train_dir = PROCESSED_DIR / "train" / class_name
    test_dir = PROCESSED_DIR / "test" / class_name

    train_dir.mkdir(parents=True, exist_ok=True)
    test_dir.mkdir(parents=True, exist_ok=True)

    # -----------------------------
    # Resize + save training images
    # -----------------------------

    for image_path in tqdm(
        train_images,
        desc=f"Train {class_name}"
    ):
        try:
            img = Image.open(image_path).convert("RGB")
            img = img.resize(IMG_SIZE)

            output_path = train_dir / image_path.name
            img.save(output_path)

        except Exception as e:
            print(f"Error processing {image_path}: {e}")

    # -----------------------------
    # Resize + save test images
    # -----------------------------

    for image_path in tqdm(
        test_images,
        desc=f"Test {class_name}"
    ):
        try:
            img = Image.open(image_path).convert("RGB")
            img = img.resize(IMG_SIZE)

            output_path = test_dir / image_path.name
            img.save(output_path)

        except Exception as e:
            print(f"Error processing {image_path}: {e}")


print("\nProcessing complete!")