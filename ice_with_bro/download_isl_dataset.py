import os
import sys
from pathlib import Path

scripts_path = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_path))

from download_isl_dataset import main

if __name__ == "__main__" \
:
    main()
