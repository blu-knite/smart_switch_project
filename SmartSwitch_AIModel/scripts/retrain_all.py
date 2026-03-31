#!/usr/bin/env python3
"""
Retrain all models.
"""

from models.retraining.auto_retrainer import auto_retrainer
import asyncio

async def main():
    # Get all switch keys
    switch_keys = ["switch_1", "switch_2"]  # Placeholder
    for key in switch_keys:
        await auto_retrainer.check_and_retrain(key)
    print("Retraining completed.")

if __name__ == "__main__":
    asyncio.run(main())