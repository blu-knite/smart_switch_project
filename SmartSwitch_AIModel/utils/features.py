import numpy as np
from typing import List

def extract_features(sequence: List[float]) -> List[float]:
    """
    Extract statistical features from sequence.
    """
    if not sequence:
        return []
    return [
        np.mean(sequence),
        np.std(sequence),
        np.min(sequence),
        np.max(sequence),
        sequence[-1],
    ]