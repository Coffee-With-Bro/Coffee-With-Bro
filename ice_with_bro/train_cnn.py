"""
train_cnn.py

Trains a CNN from scratch to classify ASL hand signs (0-9, a-z) directly
from images - no landmark extraction involved. Uses the existing
train/test split in ASL_Processed_Images.

Usage:
    python train_cnn.py

Before running:
    pip install torch torchvision
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from pathlib import Path
import time

# ---- Config ----
BASE_DIR = Path(r"D:\5th_Sem\Project_Self\ice_with_bro\ASL-HG American Sign Language Hand Gesture Image D\ASL_HG_36000\ASL_Processed_Images")
TRAIN_DIR = BASE_DIR / "train"
TEST_DIR = BASE_DIR / "test"

IMAGE_SIZE = 128
BATCH_SIZE = 64
EPOCHS = 20
LEARNING_RATE = 0.001

CHECKPOINT_PATH = Path(__file__).parent / "asl_cnn.pt"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_transforms():
    """
    Train and test images go through different processing:

    - Train: includes light augmentation (rotation, color jitter) so the
      model doesn't just memorize the exact ~1000 photos per class - it
      sees slightly varied versions each epoch. Deliberately NOT using
      horizontal flip - flipping a hand sign can turn it into a
      different (or nonsensical) sign, since hand shapes aren't
      symmetric the way, say, a photo of a cat is.
    - Test: no augmentation - we want to evaluate on the images exactly
      as they are, for a fair, repeatable accuracy number.

    Both get resized to a fixed size (the CNN needs consistent input
    dimensions) and normalized to roughly [-1, 1], which tends to help
    training converge faster than raw [0, 255] pixel values.
    """
    train_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ])

    test_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ])

    return train_transform, test_transform


class ASLCnn(nn.Module):
    """
    A small CNN built from scratch (no pretrained backbone).

    Structure: three conv blocks (conv -> batch norm -> relu -> pool),
    each doubling the number of feature channels while halving the
    spatial size, followed by two fully connected layers ending in
    num_classes outputs (one score per possible letter/digit).
    """

    def __init__(self, num_classes: int):
        super().__init__()

        self.conv_block1 = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 128 -> 64
        )
        self.conv_block2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 64 -> 32
        )
        self.conv_block3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 32 -> 16
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 16 * 16, 256),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.conv_block1(x)
        x = self.conv_block2(x)
        x = self.conv_block3(x)
        x = self.classifier(x)
        return x


def train_one_epoch(model, loader, optimizer, criterion):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(DEVICE), labels.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        predictions = outputs.argmax(dim=1)
        correct += (predictions == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


def evaluate(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item() * images.size(0)
            predictions = outputs.argmax(dim=1)
            correct += (predictions == labels).sum().item()
            total += labels.size(0)

    return total_loss / total, correct / total


def main():
    print(f"Using device: {DEVICE}")

    train_transform, test_transform = build_transforms()

    train_dataset = datasets.ImageFolder(TRAIN_DIR, transform=train_transform)
    test_dataset = datasets.ImageFolder(TEST_DIR, transform=test_transform)

    # ImageFolder assigns each subfolder name a numeric label based on
    # sorted order - class_to_idx shows exactly which folder maps to
    # which number, useful later when interpreting predictions.
    print("Classes found:", train_dataset.classes)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    model = ASLCnn(num_classes=len(train_dataset.classes)).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    best_test_accuracy = 0.0

    for epoch in range(1, EPOCHS + 1):
        start_time = time.time()

        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion)
        test_loss, test_acc = evaluate(model, test_loader, criterion)

        elapsed = time.time() - start_time
        print(f"Epoch {epoch}/{EPOCHS} ({elapsed:.1f}s) - "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} - "
              f"test_loss={test_loss:.4f} test_acc={test_acc:.4f}")

        if test_acc > best_test_accuracy:
            best_test_accuracy = test_acc
            torch.save({
                "model_state_dict": model.state_dict(),
                "classes": train_dataset.classes,
            }, CHECKPOINT_PATH)
            print(f"  -> New best model saved (test_acc={test_acc:.4f})")

    print(f"\nTraining complete. Best test accuracy: {best_test_accuracy:.4f}")
    print(f"Best model saved to: {CHECKPOINT_PATH}")


if __name__ == "__main__":
    main()