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

    # Loan flow: khi request có loanApplicationId, publish thêm tới queue này để LoanManagementService nhận
    LOAN_PREDICTION_COMPLETED_ROUTING_KEY = os.getenv('LOAN_PREDICTION_COMPLETED_ROUTING_KEY', 'loan.prediction.completed')
    
    # Model Configuration (v2 — LightGBM + SHAP + LIME)
    LGBM_BUNDLE_PATH        = os.getenv('LGBM_BUNDLE_PATH',        'model/lgbm_bundle.pkl')
    PREPROCESSING_META_PATH = os.getenv('PREPROCESSING_META_PATH', 'model/preprocessing_meta.json')
    SHAP_EXPLAINER_PATH     = os.getenv('SHAP_EXPLAINER_PATH',     'model/shap_explainer.pkl')
    LIME_TRAIN_DATA_PATH    = os.getenv('LIME_TRAIN_DATA_PATH',    'model/lime_train_data.npy')

    # Model Metadata
    MODEL_VERSION = os.getenv('MODEL_VERSION', '2.0.0')
