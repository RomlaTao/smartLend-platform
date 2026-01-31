"""
Test script for ML Model Service API
Run this script to test the REST API endpoints
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"

def print_section(title):
    """Print a section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_health_check():
    """Test health check endpoint"""
    print_section("Testing Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_service_info():
    """Test service info endpoint"""
    print_section("Testing Service Info")
    try:
        response = requests.get(f"{BASE_URL}/info")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_prediction():
    """Test prediction endpoint"""
    print_section("Testing Prediction")
    
    # Sample test data - Low risk customer
    test_data_low_risk = {
        "personAge": 30,
        "personIncome": 60000.0,
        "personHomeOwnership": "RENT",
        "personEmpLength": 5.0,
        "loanIntent": "EDUCATION",
        "loanGrade": "B",
        "loanAmnt": 8000.0,
        "loanIntRate": 7.5,
        "loanPercentIncome": 0.13,
        "cbPersonDefaultOnFile": "N",
        "cbPersonCredHistLength": 5
    }
    
    # Sample test data - High risk customer
    test_data_high_risk = {
        "personAge": 22,
        "personIncome": 25000.0,
        "personHomeOwnership": "RENT",
        "personEmpLength": 1.0,
        "loanIntent": "PERSONAL",
        "loanGrade": "G",
        "loanAmnt": 15000.0,
        "loanIntRate": 23.5,
        "loanPercentIncome": 0.6,
        "cbPersonDefaultOnFile": "Y",
        "cbPersonCredHistLength": 2
    }
    
    test_cases = [
        ("Low Risk Customer", test_data_low_risk),
        ("High Risk Customer", test_data_high_risk)
    ]
    
    for case_name, test_data in test_cases:
        print(f"\n--- Test Case: {case_name} ---")
        print(f"Input: {json.dumps(test_data, indent=2)}")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{BASE_URL}/predict",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            elapsed_time = (time.time() - start_time) * 1000
            
            print(f"\nStatus Code: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                print(f"\nPrediction: {'LOAN DEFAULT' if result['label'] else 'NO DEFAULT'}")
                print(f"Confidence: {result['probability']:.2%}")
                print(f"Inference Time (Client): {elapsed_time:.2f}ms")
                print(f"Inference Time (Server): {result['inferenceTimeMs']}ms")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
        
        print()

def main():
    """Run all tests"""
    print("="*60)
    print("  ML Model Service API Test")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    # Test health check
    if not test_health_check():
        print("\n Service is not healthy. Skipping other tests.")
        return
    
    # Test service info
    test_service_info()
    
    # Test prediction
    test_prediction()
    
    print_section("Test Completed")

if __name__ == "__main__":
    main()
