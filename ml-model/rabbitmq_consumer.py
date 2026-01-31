import pika
import json
import logging
import time
from datetime import datetime
from typing import Callable
from config import Config

logger = logging.getLogger(__name__)

class RabbitMQConsumer:
    def __init__(self, config: Config):
        """
        Initialize RabbitMQ Consumer
        
        Args:
            config: Configuration object containing RabbitMQ settings
        """
        self.config = config
        self.connection = None
        self.channel = None
        self.is_running = False

    def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(
                self.config.RABBITMQ_USERNAME,
                self.config.RABBITMQ_PASSWORD
            )
            
            parameters = pika.ConnectionParameters(
                host=self.config.RABBITMQ_HOST,
                port=self.config.RABBITMQ_PORT,
                virtual_host=self.config.RABBITMQ_VIRTUAL_HOST,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Declare exchanges
            self.channel.exchange_declare(
                exchange=self.config.MODEL_PREDICT_REQUESTED_EXCHANGE,
                exchange_type='topic',
                durable=True
            )
            self.channel.exchange_declare(
                exchange=self.config.MODEL_PREDICT_COMPLETED_EXCHANGE,
                exchange_type='topic',
                durable=True
            )
            
            # Declare queues
            self.channel.queue_declare(
                queue=self.config.MODEL_PREDICT_REQUESTED_QUEUE,
                durable=True
            )
            self.channel.queue_declare(
                queue=self.config.MODEL_PREDICT_COMPLETED_QUEUE,
                durable=True
            )
            
            # Bind queues to exchanges
            self.channel.queue_bind(
                exchange=self.config.MODEL_PREDICT_REQUESTED_EXCHANGE,
                queue=self.config.MODEL_PREDICT_REQUESTED_QUEUE,
                routing_key=self.config.MODEL_PREDICT_REQUESTED_ROUTING_KEY
            )
            self.channel.queue_bind(
                exchange=self.config.MODEL_PREDICT_COMPLETED_EXCHANGE,
                queue=self.config.MODEL_PREDICT_COMPLETED_QUEUE,
                routing_key=self.config.MODEL_PREDICT_COMPLETED_ROUTING_KEY
            )
            
            # Set QoS
            self.channel.basic_qos(prefetch_count=1)
            
            logger.info("Successfully connected to RabbitMQ")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False

    def start_consuming(self, callback: Callable):
        """
        Start consuming messages from the queue
        
        Args:
            callback: Function to process received messages
        """
        if not self.connection or self.connection.is_closed:
            if not self.connect():
                logger.error("Cannot start consuming - connection failed")
                return

        def wrapped_callback(ch, method, properties, body):
            """Wrapper to handle message acknowledgment"""
            try:
                # Parse message
                message = json.loads(body.decode('utf-8'))
                logger.info(f"Received prediction request: {message.get('predictionId')}")
                
                # Process message
                response = callback(message)
                
                # Publish response
                if response:
                    self.publish_prediction_result(response)
                
                # Acknowledge message
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.info(f"Message acknowledged: {method.delivery_tag}")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        try:
            self.is_running = True
            self.channel.basic_consume(
                queue=self.config.MODEL_PREDICT_REQUESTED_QUEUE,
                on_message_callback=wrapped_callback,
                auto_ack=False
            )
            
            logger.info(f"Started consuming from queue: {self.config.MODEL_PREDICT_REQUESTED_QUEUE}")
            self.channel.start_consuming()
            
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            self.stop_consuming()
        except Exception as e:
            logger.error(f"Error in consumer: {e}")
            self.stop_consuming()

    def publish_prediction_result(self, result: dict):
        """
        Publish prediction result to RabbitMQ
        
        Args:
            result: Dictionary containing prediction result
        """
        try:
            message = json.dumps(result, default=str)
            
            self.channel.basic_publish(
                exchange=self.config.MODEL_PREDICT_COMPLETED_EXCHANGE,
                routing_key=self.config.MODEL_PREDICT_COMPLETED_ROUTING_KEY,
                body=message.encode('utf-8'),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Persistent message
                    content_type='application/json'
                )
            )
            
            logger.info(f"Published prediction result: {result.get('predictionId')}")
            
        except Exception as e:
            logger.error(f"Failed to publish result: {e}")
            raise

    def stop_consuming(self):
        """Stop consuming messages and close connection"""
        try:
            self.is_running = False
            if self.channel and self.channel.is_open:
                self.channel.stop_consuming()
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("RabbitMQ connection closed")
        except Exception as e:
            logger.error(f"Error closing connection: {e}")

    def reconnect(self, max_retries: int = 5, delay: int = 5):
        """
        Attempt to reconnect to RabbitMQ
        
        Args:
            max_retries: Maximum number of reconnection attempts
            delay: Delay between attempts in seconds
        """
        for attempt in range(max_retries):
            logger.info(f"Reconnection attempt {attempt + 1}/{max_retries}")
            if self.connect():
                logger.info("Reconnection successful")
                return True
            time.sleep(delay)
        
        logger.error("Failed to reconnect after maximum retries")
        return False
