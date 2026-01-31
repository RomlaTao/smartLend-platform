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
        'MODEL_PATH': 'model/final_lgbm_model.joblib',
        'OHE_ENCODER_PATH': 'model/ohe_encoder.joblib',
        'SCALER_PATH': 'model/scaler_normal.joblib',
        'MERGE_OHE_COLUMNS_PATH': 'model/merge_ohe_col.joblib',
        'TRAINING_COLUMNS_PATH': 'model/training_columns.joblib',
        'MODEL_VERSION': '1.0.0'
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
    
    print("✅ Environment variables configured for local development")
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
        'scikit-learn',
        'lightgbm'
    ]
    
    print("Checking dependencies...")
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - NOT INSTALLED")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All dependencies are installed\n")
    return True

def check_model_files():
    """Check if model files exist"""
    print("Checking model files...")
    model_files = [
        'model/final_lgbm_model.joblib',
        'model/ohe_encoder.joblib',
        'model/scaler_normal.joblib',
        'model/merge_ohe_col.joblib',
        'model/training_columns.joblib'
    ]
    
    missing_files = []
    for file_path in model_files:
        if os.path.exists(file_path):
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - NOT FOUND")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n⚠️  Missing model files: {', '.join(missing_files)}")
        print("Please ensure all model files are in the 'model/' directory")
        return False
    
    print("\n✅ All model files are present\n")
    return True

def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("  ML Model Service - Local Development Runner")
    print("="*60 + "\n")
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        sys.exit(1)
    
    # Check model files
    if not check_model_files():
        print("\n❌ Please add missing model files first")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Import and run the app
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
        print("\n\n✅ Service stopped by user")
    except Exception as e:
        print(f"\n\n❌ Error running service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
