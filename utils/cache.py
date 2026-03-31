from typing import Any, Optional
from functools import lru_cache

# Simple LRU cache wrapper
def simple_cache(maxsize: int = 128):
    cache = {}
    def decorator(f):
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            if key in cache:
                return cache[key]
            result = f(*args, **kwargs)
            if len(cache) >= maxsize:
                # Evict oldest
                oldest_key = next(iter(cache))
                del cache[oldest_key]
            cache[key] = result
            return result
        return wrapper
    return decorator