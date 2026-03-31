import paho.mqtt.client as mqtt
from typing import Callable, List, Optional
import asyncio
import logging
import threading

logger = logging.getLogger(__name__)

class MQTTClient:
    def __init__(self, broker: str, port: int, username: str, password: str, keepalive: int):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.client.username_pw_set(username, password)
        self.broker = broker
        self.port = port
        self.keepalive = keepalive
        self.connected = False
        self._message_callback = None
        
        # Setup callbacks
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """Callback for when client connects to broker"""
        if reason_code == 0:
            self.connected = True
            logger.info(f"Connected to MQTT broker at {self.broker}:{self.port}")
        else:
            logger.error(f"Failed to connect to MQTT broker: {reason_code}")

    def _on_disconnect(self, client, userdata, reason_code, properties):
        """Callback for when client disconnects from broker"""
        self.connected = False
        logger.warning(f"Disconnected from MQTT broker (code: {reason_code})")

    def _on_message(self, client, userdata, message):
        """Internal message callback"""
        if self._message_callback:
            self._message_callback(client, userdata, message)

    def on_message(self, callback: Callable):
        """Set message callback"""
        self._message_callback = callback

    async def connect_and_subscribe(self, topics: List[str], qos: int = 0):
        """
        Connect to broker and subscribe to topics
        """
        try:
            # Connect to broker
            logger.info(f"Connecting to MQTT broker at {self.broker}:{self.port}")
            self.client.connect(self.broker, self.port, self.keepalive)
            
            # Start the network loop in a separate thread
            self.client.loop_start()
            
            # Wait for connection
            for _ in range(10):  # Wait up to 5 seconds
                await asyncio.sleep(0.5)
                if self.connected:
                    break
            
            if not self.connected:
                logger.error("Failed to connect to MQTT broker within timeout")
                return
            
            # Subscribe to topics
            if topics:
                subscription_tuples = [(topic, qos) for topic in topics]
                logger.info(f"Subscribing to topics: {topics}")
                
                result, mid = self.client.subscribe(subscription_tuples)
                
                if result == mqtt.MQTT_ERR_SUCCESS:
                    logger.info(f"Successfully subscribed to {len(topics)} topics")
                else:
                    logger.error(f"Failed to subscribe: {result}")
            else:
                logger.warning("No topics to subscribe to")
                
        except Exception as e:
            logger.error(f"MQTT connection error: {e}")
            raise

    async def loop_forever(self):
        """Keep the client running - now just waits since loop runs in thread"""
        try:
            while True:
                await asyncio.sleep(1)
                if not self.connected:
                    logger.warning("MQTT disconnected, attempting to reconnect...")
                    await self.reconnect()
        except asyncio.CancelledError:
            logger.info("MQTT client stopping...")
            self.client.loop_stop()
            self.client.disconnect()

    async def reconnect(self):
        """Reconnect to broker"""
        try:
            self.client.reconnect()
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")
            await asyncio.sleep(5)

    def publish(self, topic: str, payload: str, qos: int = 0):
        """Publish a message"""
        if self.connected:
            result = self.client.publish(topic, payload, qos)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Published to {topic}: {payload}")
            else:
                logger.error(f"Failed to publish to {topic}: {result.rc}")
        else:
            logger.warning(f"Not connected, cannot publish to {topic}")
