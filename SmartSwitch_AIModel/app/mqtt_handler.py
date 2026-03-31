import asyncio
import logging
import threading
from typing import Optional
from queue import Queue
from datetime import datetime

import paho.mqtt.client as mqtt

from config.settings import settings
from domain.event import Event
from infrastructure.mqtt.parser import MQTTParser
from infrastructure.mqtt.client import MQTTClient
from app.core import EventProcessor
from app.ai_decision_engine import AIDecisionEngine

logger = logging.getLogger(__name__)

class MQTTHandler:
    def __init__(self, processor: EventProcessor = None):
        self.parser = MQTTParser()
        self.client = MQTTClient(
            broker=settings.MQTT_BROKER,
            port=settings.MQTT_PORT,
            username=settings.MQTT_USERNAME,
            password=settings.MQTT_PASSWORD,
            keepalive=settings.MQTT_KEEPALIVE
        )
        
        # Initialize processor with MQTT client for AI actions
        self.processor = processor or EventProcessor(mqtt_client=self.client)
        
        # Initialize AI Decision Engine
        self.ai_engine = AIDecisionEngine(self.client)
        
        # Thread-safe queue for async processing
        self.event_queue = Queue()
        self.running = True
        self.message_count = 0
        
        # Start background task for processing events
        self.loop = None
        self.thread = None

    def _on_message(self, client: mqtt.Client, userdata, msg):
        """
        Callback for MQTT messages - runs in MQTT thread
        """
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8', errors='ignore')
            
            self.message_count += 1
            logger.debug(f"Received MQTT message #{self.message_count}: {topic}")
            
            # Parse the message
            event = self.parser.parse(topic, payload)
            
            if event:
                # Add to queue for async processing
                self.event_queue.put(event)
                logger.debug(f"Queued event: {event.type} for {event.board_uid}")
            else:
                logger.debug(f"Could not parse message: {topic} - {payload[:50]}...")
                
        except Exception as e:
            logger.error(f"Error in MQTT callback: {e}")

    async def _process_queue(self):
        """
        Process events from queue asynchronously
        """
        logger.info("Starting event queue processor")
        while self.running:
            try:
                # Check queue with timeout to allow graceful shutdown
                try:
                    event = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: self.event_queue.get(timeout=1)
                    )
                except:
                    continue
                
                # Process the event
                try:
                    result = await self.processor.process_event(event)
                    if result.get("status") == "error":
                        logger.error(f"Processing failed: {result}")
                    elif result.get("status") == "blocked":
                        logger.warning(f"Event blocked: {result}")
                    else:
                        logger.debug(f"Event processed: {result}")
                        
                    # AI can also react to processing results
                    if result and self.ai_engine:
                        # Additional AI reactions if needed
                        pass
                        
                except Exception as e:
                    logger.error(f"Error processing event: {e}")
                    
            except Exception as e:
                logger.error(f"Queue processor error: {e}")
                await asyncio.sleep(1)

    async def run(self):
        """
        Run the MQTT handler loop.
        """
        # Set message callback
        self.client.on_message(self._on_message)
        
        # Connect and subscribe
        logger.info(f"Connecting to MQTT broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        await self.client.connect_and_subscribe(settings.MQTT_TOPICS, qos=0)
        
        logger.info("MQTT handler started, waiting for messages...")
        
        # Start queue processor
        queue_task = asyncio.create_task(self._process_queue())
        
        # Keep running
        try:
            await self.client.loop_forever()
        finally:
            self.running = False
            queue_task.cancel()
            try:
                await queue_task
            except:
                pass

    def stop(self):
        """Stop the MQTT handler"""
        self.running = False
        if self.ai_engine:
            self.ai_engine.stop()
        logger.info("MQTT handler stopping...")
