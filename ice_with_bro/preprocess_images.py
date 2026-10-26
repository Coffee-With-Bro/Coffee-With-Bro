import os
import sys
from pathlib import Path

root_path = Path(__file__).parent.parent
sys.path.insert(0, str(root_path))

from preprocess_images import main

if __name__ == "__main__" \
:
    main()
