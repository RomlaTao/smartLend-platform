import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Configuration
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
    
    # RabbitMQ Configuration
    RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
    RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
    RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME', 'guest')
    RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'guest')
    RABBITMQ_VIRTUAL_HOST = os.getenv('RABBITMQ_VIRTUAL_HOST', '/')
    
    # RabbitMQ Queue Configuration
    MODEL_PREDICT_REQUESTED_EXCHANGE = os.getenv('MODEL_PREDICT_REQUESTED_EXCHANGE', 'model.predict.exchange')
    MODEL_PREDICT_REQUESTED_QUEUE = os.getenv('MODEL_PREDICT_REQUESTED_QUEUE', 'model.predict.requested')
    MODEL_PREDICT_REQUESTED_ROUTING_KEY = os.getenv('MODEL_PREDICT_REQUESTED_ROUTING_KEY', 'model.predict.requested')
    
    MODEL_PREDICT_COMPLETED_EXCHANGE = os.getenv('MODEL_PREDICT_COMPLETED_EXCHANGE', 'model.predict.exchange')
    MODEL_PREDICT_COMPLETED_QUEUE = os.getenv('MODEL_PREDICT_COMPLETED_QUEUE', 'model.predict.completed')
    MODEL_PREDICT_COMPLETED_ROUTING_KEY = os.getenv('MODEL_PREDICT_COMPLETED_ROUTING_KEY', 'model.predict.completed')
    
    # Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', 'model/final_lgbm_model.joblib')
    OHE_ENCODER_PATH = os.getenv('OHE_ENCODER_PATH', 'model/ohe_encoder.joblib')
    SCALER_PATH = os.getenv('SCALER_PATH', 'model/scaler_normal.joblib')
    MERGE_OHE_COLUMNS_PATH = os.getenv('MERGE_OHE_COLUMNS_PATH', 'model/merge_ohe_col.joblib')
    TRAINING_COLUMNS_PATH = os.getenv('TRAINING_COLUMNS_PATH', 'model/training_columns.joblib')
    
    # Model Metadata
    MODEL_VERSION = os.getenv('MODEL_VERSION', '1.0.0')
