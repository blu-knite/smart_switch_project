import numpy as np
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
import joblib
import os
from typing import List, Optional

from config.settings import settings
from models.base.predictor import BasePredictor
from utils.metrics import calculate_mape

class LSTMPredictor(BasePredictor):
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.model_dir = settings.MODEL_DIR / "lstm"
        self.model_dir.mkdir(exist_ok=True)

    def predict(self, key: str, seq: List[float]) -> Optional[float]:
        if key not in self.models or len(seq) < settings.SEQUENCE_LENGTH:
            return None

        model = self.models[key]
        scaler = self.scalers[key]
        input_seq = np.array(seq[-settings.SEQUENCE_LENGTH:]).reshape(1, -1, 1)

        # Scale
        input_scaled = scaler.transform(input_seq.reshape(-1, settings.SEQUENCE_LENGTH)).reshape(1, settings.SEQUENCE_LENGTH, 1)

        pred_scaled = model.predict(input_scaled, verbose=0)[0][0]

        # Inverse scale (simplified)
        pred = scaler.inverse_transform(np.array([[pred_scaled]] * settings.SEQUENCE_LENGTH))[-1][0]

        return float(max(0, pred))

    def train(self, key: str, history: List[float]) -> bool:
        if len(history) < settings.MIN_TRAIN_SAMPLES:
            return False

        X, y = self._prepare_sequences(history)
        if len(X) == 0:
            return False

        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X.reshape(-1, settings.SEQUENCE_LENGTH)).reshape(-1, settings.SEQUENCE_LENGTH, 1)

        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(settings.SEQUENCE_LENGTH, 1)),
            Dropout(0.2),
            LSTM(50),
            Dropout(0.2),
            Dense(1)
        ])
        model.compile(optimizer=Adam(learning_rate=settings.LEARNING_RATE), loss='mse')

        model.fit(X_scaled, y, epochs=settings.TRAIN_EPOCHS, batch_size=settings.BATCH_SIZE, verbose=0)

        self.models[key] = model
        self.scalers[key] = scaler

        # Save
        model.save(self.model_dir / f"{key}.h5")
        joblib.dump(scaler, self.model_dir / f"{key}_scaler.pkl")

        # Metrics
        preds = model.predict(X_scaled, verbose=0).flatten()
        accuracy = 1 - calculate_mape(y, preds)

        # Save metadata (placeholder)
        print(f"Trained LSTM for {key} with accuracy {accuracy:.2f}")

        return True

    def _prepare_sequences(self, history: List[float]) -> tuple:
        X, y = [], []
        for i in range(len(history) - settings.SEQUENCE_LENGTH):
            X.append(history[i:i + settings.SEQUENCE_LENGTH])
            y.append(history[i + settings.SEQUENCE_LENGTH])
        return np.array(X).reshape(-1, settings.SEQUENCE_LENGTH, 1), np.array(y)