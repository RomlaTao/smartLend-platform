"""
Test script for ML Model Service RabbitMQ integration
This script sends a test message to the model.predict.requested queue
"""

import pika
import json
import uuid
from datetime import datetime
import time

# Configuration
RABBITMQ_HOST = 'localhost'
RABBITMQ_PORT = 5672
RABBITMQ_USERNAME = 'guest'
RABBITMQ_PASSWORD = 'guest'
RABBITMQ_VIRTUAL_HOST = '/'

MODEL_PREDICT_REQUESTED_EXCHANGE = 'model.predict.exchange'
MODEL_PREDICT_REQUESTED_ROUTING_KEY = 'model.predict.requested'
MODEL_PREDICT_COMPLETED_QUEUE = 'model.predict.completed'

def send_prediction_request():
    """Send a test prediction request to RabbitMQ"""
    
    # Create sample prediction request
    prediction_id = str(uuid.uuid4())
    customer_id = str(uuid.uuid4())
    
    request_data = {
        "predictionId": prediction_id,
        "customerId": customer_id,
        "input": {
            "customerProfileId": str(uuid.uuid4()),
            "customerSlug": "john-doe",
            "fullName": "John Doe",
            "email": "john.doe@example.com",
            "personAge": 30,
            "personIncome": 60000.0,
            "personHomeOwnership": "RENT",
            "personEmpLength": 5.0,
            "loanIntent": "EDUCATION",
            "loanGrade": "B",
            "loanAmnt": 8000.0,
            "loanIntRate": 7.5,
            "loanStatus": "PENDING",
            "loanPercentIncome": 0.13,
            "cbPersonDefaultOnFile": "N",
            "cbPersonCredHistLength": 5
        }
    }
    
    print("="*80)
    print("  Testing RabbitMQ Integration")
    print("="*80)
    print(f"\nSending Prediction Request:")
    print(f"  Prediction ID: {prediction_id}")
    print(f"  Customer ID: {customer_id}")
    print(f"\nRequest Data:")
    print(json.dumps(request_data, indent=2))
    
    try:
        # Connect to RabbitMQ
        credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            virtual_host=RABBITMQ_VIRTUAL_HOST,
            credentials=credentials
        )
        
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Publish message
        channel.basic_publish(
            exchange=MODEL_PREDICT_REQUESTED_EXCHANGE,
            routing_key=MODEL_PREDICT_REQUESTED_ROUTING_KEY,
            body=json.dumps(request_data),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Persistent message
                content_type='application/json'
            )
        )
        
        print("\n✅ Message sent successfully to RabbitMQ!")
        print(f"  Exchange: {MODEL_PREDICT_REQUESTED_EXCHANGE}")
        print(f"  Routing Key: {MODEL_PREDICT_REQUESTED_ROUTING_KEY}")
        
        connection.close()
        
        return prediction_id
        
    except Exception as e:
        print(f"\n❌ Error sending message: {e}")
        return None

def listen_for_response(prediction_id, timeout=30):
    """Listen for prediction response"""
    print("\n" + "="*80)
    print("  Listening for Response")
    print("="*80)
    print(f"\nWaiting for response (timeout: {timeout}s)...")
    
    try:
        # Connect to RabbitMQ
        credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            virtual_host=RABBITMQ_VIRTUAL_HOST,
            credentials=credentials
        )
        
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Declare queue
        channel.queue_declare(queue=MODEL_PREDICT_COMPLETED_QUEUE, durable=True)
        
        # Callback function
        response_received = [False]
        
        def callback(ch, method, properties, body):
            try:
                message = json.loads(body.decode('utf-8'))
                
                # Check if this is the response we're looking for
                if message.get('predictionId') == prediction_id:
                    print("\n✅ Response received!")
                    print(f"\nResponse Data:")
                    print(json.dumps(message, indent=2))
                    
                    result = message.get('result', {})
                    print(f"\n📊 Prediction Result:")
                    print(f"  Label: {'LOAN DEFAULT' if result.get('label') else 'NO DEFAULT'}")
                    print(f"  Probability: {result.get('probability', 0):.2%}")
                    print(f"  Model Version: {result.get('modelVersion')}")
                    print(f"  Inference Time: {result.get('inferenceTimeMs')}ms")
                    
                    # Acknowledge message
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    response_received[0] = True
                    ch.stop_consuming()
                else:
                    # Not our response, re-queue it
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                    
            except Exception as e:
                print(f"\n❌ Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        
        # Start consuming
        channel.basic_consume(
            queue=MODEL_PREDICT_COMPLETED_QUEUE,
            on_message_callback=callback,
            auto_ack=False
        )
        
        # Set timeout
        connection.call_later(timeout, lambda: channel.stop_consuming())
        
        channel.start_consuming()
        
        connection.close()
        
        if not response_received[0]:
            print(f"\n⚠️  Timeout: No response received after {timeout}s")
            return False
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error listening for response: {e}")
        return False

def main():
    """Main test function"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*25 + "ML Model RabbitMQ Test" + " "*31 + "║")
    print("╚" + "="*78 + "╝")
    
    # Send request
    prediction_id = send_prediction_request()
    
    if prediction_id:
        # Wait a bit before listening
        time.sleep(2)
        
        # Listen for response
        listen_for_response(prediction_id, timeout=30)
    
    print("\n" + "="*80)
    print("  Test Completed")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
