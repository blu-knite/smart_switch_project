import numpy as np

def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Mean Absolute Percentage Error.
    """
    return np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100