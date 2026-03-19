import logging
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify
from config import Config
from model_service import ModelService
from rabbitmq_consumer import RabbitMQConsumer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
config = Config()

# Global variables
model_service = None
rabbitmq_consumer = None
is_ready = False

def initialize_services():
    """Initialize model service and RabbitMQ consumer"""
    global model_service, rabbitmq_consumer, is_ready
    
    try:
        # Initialize Model Service v2 (LightGBM + SHAP + LIME)
        logger.info("Loading ML model v2 and preprocessors...")
        model_service = ModelService(
            lgbm_bundle_path        = config.LGBM_BUNDLE_PATH,
            preprocessing_meta_path = config.PREPROCESSING_META_PATH,
            shap_explainer_path     = config.SHAP_EXPLAINER_PATH,
            lime_train_data_path    = config.LIME_TRAIN_DATA_PATH,
        )
        logger.info("Model service v2 initialized successfully")
        
        # Initialize RabbitMQ Consumer
        logger.info("Connecting to RabbitMQ...")
        rabbitmq_consumer = RabbitMQConsumer(config)
        
        # Try to connect with retry
        max_retries = 5
        for attempt in range(max_retries):
            if rabbitmq_consumer.connect():
                logger.info("RabbitMQ consumer initialized successfully")
                is_ready = True
                break
            else:
                logger.warning(f"RabbitMQ connection attempt {attempt + 1}/{max_retries} failed")
                if attempt < max_retries - 1:
                    time.sleep(5)
        
        if not is_ready:
            logger.error("Failed to connect to RabbitMQ after all retries")
            
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

def process_prediction_request(message: dict) -> dict:
    """
    Process prediction request from RabbitMQ.
    Request may come from PredictionService (no loanApplicationId) or LoanManagementService (with loanApplicationId).
    Returns prediction result + SHAP/LIME explanation.
    """
    try:
        start_time = time.time()

        prediction_id = message.get('predictionId')
        customer_id = message.get('customerId')
        input_data = message.get('input')
        loan_application_id = message.get('loanApplicationId')  # optional: present when from LoanManagementService

        logger.info(f"Processing prediction request - PredictionId: {prediction_id}, loanApplicationId: {loan_application_id}")

        if not input_data:
            raise ValueError("Input data is missing")

        # Make prediction with SHAP + LIME explanation
        result = model_service.predict_with_explanation(input_data)

        # Calculate inference time
        inference_time_ms = int((time.time() - start_time) * 1000)

        # Prepare response (same format for both PredictionService and LoanManagementService)
        response = {
            'predictionId': prediction_id,
            'customerId': customer_id,
            'result': {
                'label': result['prediction'] != 'Default',   # True = Non-Default = Safe = Approve
                'probability': result['p_default'],
                'modelVersion': config.MODEL_VERSION,
                'inferenceTimeMs': inference_time_ms
            },
            'explanation': {
                'riskLevel': result['risk_level'],
                'shapBaseValue': result['shap_base_value'],
                'shapValues': result['shap_values'],
                'limeFeatures': result['lime_features'],
            },
            'predictedAt': datetime.now().isoformat()
        }
        if loan_application_id is not None:
            response['loanApplicationId'] = loan_application_id

        logger.info(f"Prediction+Explain completed - PredictionId: {prediction_id}, "
                    f"Label: {result['prediction']}, Probability: {result['p_default']:.4f}, "
                    f"Risk: {result['risk_level']}, Time: {inference_time_ms}ms, "
                    f"loanFlow: {loan_application_id is not None}")

        return response

    except Exception as e:
        logger.error(f"Error processing prediction request: {e}")
        raise

def start_rabbitmq_consumer():
    """Start RabbitMQ consumer in a separate thread"""
    try:
        logger.info("Starting RabbitMQ consumer thread...")
        rabbitmq_consumer.start_consuming(process_prediction_request)
    except Exception as e:
        logger.error(f"RabbitMQ consumer thread error: {e}")

# REST API Endpoints

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy' if is_ready else 'starting',
        'timestamp': datetime.now().isoformat(),
        'modelVersion': config.MODEL_VERSION,
        'rabbitmqConnected': rabbitmq_consumer and rabbitmq_consumer.connection and not rabbitmq_consumer.connection.is_closed
    }
    return jsonify(status), 200 if is_ready else 503

@app.route('/predict', methods=['POST'])
def predict():
    """REST API endpoint for direct predictions (optional)"""
    if not is_ready or not model_service:
        return jsonify({'error': 'Service not ready'}), 503
    
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        start_time = time.time()
        label, probability = model_service.predict(data)
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        result = {
            'label': label,
            'probability': probability,
            'modelVersion': config.MODEL_VERSION,
            'inferenceTimeMs': inference_time_ms,
            'predictedAt': datetime.now().isoformat()
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/predict/explain', methods=['POST'])
def predict_with_explain():
    """Predict + SHAP + LIME explanation. Slower (~2-5s) — use /predict for fast responses."""
    if not is_ready or not model_service:
        return jsonify({'error': 'Service not ready'}), 503

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        start_time = time.time()
        result = model_service.predict_with_explanation(data)
        inference_time_ms = int((time.time() - start_time) * 1000)

        result['modelVersion']    = config.MODEL_VERSION
        result['inferenceTimeMs'] = inference_time_ms
        result['predictedAt']     = datetime.now().isoformat()

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Explain prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/info', methods=['GET'])
def info():
    """Service information endpoint"""
    info_data = {
        'serviceName': 'ML Model Service',
        'version': config.MODEL_VERSION,
        'modelType': 'LightGBM',
        'status': 'ready' if is_ready else 'starting',
        'endpoints': {
            'health': '/health',
            'predict': '/predict',
            'info': '/info'
        }
    }
    return jsonify(info_data), 200

if __name__ == '__main__':
    try:
        # Initialize services
        logger.info("Initializing ML Model Service...")
        initialize_services()
        
        # Start RabbitMQ consumer in a separate thread
        if is_ready:
            consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
            consumer_thread.start()
            logger.info("RabbitMQ consumer thread started")
        
        # Start Flask app
        logger.info(f"Starting Flask app on {config.HOST}:{config.PORT}")
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG,
            threaded=True
        )
        
    except KeyboardInterrupt:
        logger.info("Shutting down service...")
        if rabbitmq_consumer:
            rabbitmq_consumer.stop_consuming()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
