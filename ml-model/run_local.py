"""
Local development runner for ML Model Service
This script helps run the service locally for testing
"""

import os
import sys

def setup_environment():
    """Setup environment variables for local development"""
    env_vars = {
        'HOST': '0.0.0.0',
        'PORT': '5000',
        'DEBUG': 'true',
        'RABBITMQ_HOST': 'localhost',
        'RABBITMQ_PORT': '5672',
        'RABBITMQ_USERNAME': 'guest',
        'RABBITMQ_PASSWORD': 'guest',
        'RABBITMQ_VIRTUAL_HOST': '/',
        'MODEL_PREDICT_REQUESTED_EXCHANGE': 'model.predict.exchange',
        'MODEL_PREDICT_REQUESTED_QUEUE': 'model.predict.requested',
        'MODEL_PREDICT_REQUESTED_ROUTING_KEY': 'model.predict.requested',
        'MODEL_PREDICT_COMPLETED_EXCHANGE': 'model.predict.exchange',
        'MODEL_PREDICT_COMPLETED_QUEUE': 'model.predict.completed',
        'MODEL_PREDICT_COMPLETED_ROUTING_KEY': 'model.predict.completed',
        'LOAN_PREDICTION_COMPLETED_ROUTING_KEY': 'loan.prediction.completed',
        'LGBM_BUNDLE_PATH': 'model/selected_model_bundle.pkl',
        'PREPROCESSING_META_PATH': 'model/preprocessing_meta.json',
        'SHAP_EXPLAINER_PATH': 'model/shap_explainer.pkl',
        'LIME_TRAIN_DATA_PATH': 'model/lime_train_data.npy',
        'MODEL_VERSION': '5.0.0',
    }

    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value

    print("Environment variables configured for local development")
    print(f"   Service will run on: http://{env_vars['HOST']}:{env_vars['PORT']}")
    print(f"   RabbitMQ connection: {env_vars['RABBITMQ_HOST']}:{env_vars['RABBITMQ_PORT']}")
    print()

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'flask',
        'pika',
        'pandas',
        'numpy',
        'joblib',
        'sklearn',
        'lightgbm',
        'shap',
        'lime',
    ]

    print("Checking dependencies...")
    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print(f"  OK {package}")
        except ImportError:
            print(f"  MISSING {package}")
            missing_packages.append(package)

    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False

    print("\nAll dependencies are installed\n")
    return True

def check_model_files():
    """Check if model runtime files exist"""
    print("Checking model files...")
    model_files = [
        'model/selected_model_bundle.pkl',
        'model/preprocessing_meta.json',
        'model/shap_explainer.pkl',
        'model/lime_train_data.npy',
    ]

    missing_files = []
    for file_path in model_files:
        if os.path.exists(file_path):
            print(f"  OK {file_path}")
        else:
            print(f"  MISSING {file_path}")
            missing_files.append(file_path)

    if missing_files:
        print(f"\nMissing model files: {', '.join(missing_files)}")
        print("Run export_backend_artifacts.py or copy artifacts into model/")
        return False

    print("\nAll model files are present\n")
    return True

def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("  ML Model Service - Local Development Runner")
    print("="*60 + "\n")

    if not check_dependencies():
        sys.exit(1)

    if not check_model_files():
        sys.exit(1)

    setup_environment()

    print("="*60)
    print("  Starting ML Model Service...")
    print("="*60 + "\n")

    try:
        from app import app, config
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nService stopped by user")
    except Exception as e:
        print(f"\nError running service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
