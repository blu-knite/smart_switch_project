#!/usr/bin/env python3
"""
Export system metrics to CSV.
"""

import csv
from pathlib import Path

# Placeholder
metrics = {'accuracy': 0.85, 'drift_score': 0.1}

with open(Path("metrics.csv"), 'w') as f:
    writer = csv.DictWriter(f, fieldnames=metrics.keys())
    writer.writeheader()
    writer.writerow(metrics)

print("Metrics exported.")