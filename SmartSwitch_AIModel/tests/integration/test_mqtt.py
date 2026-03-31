import pytest
from app.mqtt_handler import MQTTHandler
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_mqtt_handler():
    processor = AsyncMock()
    handler = MQTTHandler(processor)
    # Test logic
    assert handler is not None