# ML Model Service

Dịch vụ Machine Learning để dự đoán khả năng vỡ nợ khoản vay (Loan Default Prediction) sử dụng LightGBM model.

## Tính năng

- ✅ Tích hợp RabbitMQ để nhận yêu cầu dự đoán từ PredictionService
- ✅ REST API endpoint cho health check và prediction
- ✅ Tiền xử lý dữ liệu tự động (One-Hot Encoding, StandardScaler)
- ✅ Hỗ trợ Docker containerization
- ✅ Logging chi tiết
- ✅ Error handling và retry mechanism

## Kiến trúc

```
┌─────────────────────┐
│ PredictionService   │
│   (Java/Spring)     │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   RabbitMQ   │
    │    Queue     │
    └──────┬───────┘
           │
           ▼
┌─────────────────────┐
│  ML Model Service   │
│   (Python/Flask)    │
│  - Model Inference  │
│  - Preprocessing    │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   RabbitMQ   │
    │   Response   │
    └──────────────┘
```

## Cài đặt

### Local Development

1. Cài đặt dependencies:
```bash
cd ml-model
pip install -r requirements.txt
```

2. Cấu hình environment:
```bash
cp .env.example .env
# Chỉnh sửa .env với cấu hình của bạn
```

3. Chạy service:
```bash
python app.py
```

### Docker

1. Build image:
```bash
docker build -t ml-model-service:latest .
```

2. Run container:
```bash
docker run -p 5000:5000 \
  -e RABBITMQ_HOST=rabbitmq \
  -e RABBITMQ_USERNAME=guest \
  -e RABBITMQ_PASSWORD=guest \
  ml-model-service:latest
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T10:00:00",
  "modelVersion": "1.0.0",
  "rabbitmqConnected": true
}
```

### Direct Prediction (Optional)
```bash
POST /predict
Content-Type: application/json

{
  "personAge": 30,
  "personIncome": 50000.0,
  "personHomeOwnership": "RENT",
  "personEmpLength": 5.0,
  "loanIntent": "EDUCATION",
  "loanGrade": "B",
  "loanAmnt": 10000.0,
  "loanIntRate": 7.5,
  "loanPercentIncome": 0.2,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5
}
```

Response:
```json
{
  "label": false,
  "probability": 0.8523,
  "modelVersion": "1.0.0",
  "inferenceTimeMs": 45,
  "predictedAt": "2026-01-29T10:00:00"
}
```

### Service Info
```bash
GET /info
```

## RabbitMQ Integration

### Input Queue: `model.predict.requested`

Message format (from PredictionService):
```json
{
  "predictionId": "uuid",
  "customerId": "uuid",
  "input": {
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    ...
  }
}
```

### Output Queue: `model.predict.completed`

Message format (to PredictionService):
```json
{
  "predictionId": "uuid",
  "customerId": "uuid",
  "result": {
    "label": true,
    "probability": 0.8523,
    "modelVersion": "1.0.0",
    "inferenceTimeMs": 45
  },
  "predictedAt": "2026-01-29T10:00:00"
}
```

## Model Files

Các file model cần thiết trong thư mục `model/`:
- `final_lgbm_model.joblib` - Trained LightGBM model
- `ohe_encoder.joblib` - OneHotEncoder
- `scaler_normal.joblib` - StandardScaler
- `merge_ohe_col.joblib` - OHE column names
- `training_columns.joblib` - Training column order

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Flask host | `0.0.0.0` |
| `PORT` | Flask port | `5000` |
| `DEBUG` | Debug mode | `false` |
| `RABBITMQ_HOST` | RabbitMQ host | `localhost` |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` |
| `RABBITMQ_USERNAME` | RabbitMQ username | `guest` |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `guest` |
| `MODEL_VERSION` | Model version | `1.0.0` |

## Testing

Test REST API:
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    "personEmpLength": 5.0,
    "loanIntent": "EDUCATION",
    "loanGrade": "B",
    "loanAmnt": 10000.0,
    "loanIntRate": 7.5,
    "loanPercentIncome": 0.2,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 5
  }'
```

## Monitoring

- Health check: `http://localhost:5000/health`
- Logs: Stdout/Stderr với format chi tiết
- Metrics: Inference time, prediction count (có thể mở rộng)

## Troubleshooting

### RabbitMQ Connection Failed
- Kiểm tra RabbitMQ đã chạy: `docker ps | grep rabbitmq`
- Kiểm tra credentials trong .env
- Kiểm tra network connectivity

### Model Loading Failed
- Kiểm tra các file model tồn tại trong thư mục `model/`
- Kiểm tra permissions của thư mục model

### Prediction Error
- Kiểm tra format input data
- Kiểm tra logs để xem lỗi chi tiết
- Kiểm tra các giá trị null/missing trong input

## License

Proprietary - Smart Lend Platform
