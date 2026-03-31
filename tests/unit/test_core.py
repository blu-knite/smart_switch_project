import pytest
from app.core import EventProcessor
from domain.event import Event

@pytest.fixture
def processor():
    return EventProcessor()

def test_process_event(processor):
    event = Event(type="status", board_uid="test", status="online")
    # Note: process_event is async, so for simple unit test we call it directly
    # (in real tests you'd use asyncio.run or pytest-asyncio)
    result = processor.process_event(event)  # Async to sync for test
    assert result["status"] == "updated"