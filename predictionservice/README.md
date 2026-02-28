## PredictionService – Dịch vụ dự đoán rủi ro khoản vay

PredictionService chịu trách nhiệm **dự đoán khả năng vỡ nợ (loan default risk)** cho các khoản vay trong hệ thống SmartLend.  
Service này:
- Nhận yêu cầu dự đoán trực tiếp từ nhân viên (standalone prediction).
- Nhận đăng ký prediction từ luồng xử lý loan (LoanManagementService).
- Lưu kết quả prediction (PENDING/COMPLETED/FAILED), xác suất (`confidence`) và cho phép tra cứu theo nhiều tiêu chí.

### Base URL

- **Local trực tiếp service:** `http://localhost:8007`
- **Qua API Gateway:** `http://localhost:8080/api/predictions`

Prefix API chính: `/api/predictions`.

---

## 1. Ghi chú chung

- **Header định danh nhân viên:**
  - `X-User-Id: <UUID>` – dùng để xác định nhân viên (employee/staff) đang tạo/tra cứu prediction.
- **Xác thực khi đi qua Gateway:**
  - Thêm header `Authorization: Bearer <accessToken>` (token từ IdentityService).
- **Kiểu dữ liệu & enum quan trọng:**
  - `PredictionStatus`: `PENDING`, `COMPLETED`, `FAILED`.
  - `LoanIntent`: `PERSONAL`, `EDUCATION`, `MEDICAL`, `VENTURE`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION`, `OTHER`.
  - `LoanGrade`: `A`, `B`, `C`, `D`, `E`, `F`, `G`.
  - `LoanStatus`: `APPROVED`, `REJECTED`, `PENDING`.

---

## 2. DTO chính

### 2.1. `PredictionRequestDto` – tạo prediction trực tiếp

```json
{
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerName": "Nguyen Van A",
  "employeeId": "11111111-2222-3333-4444-555555555555",
  "employeeName": "Tran Van Staff",
  "loanIntent": "PERSONAL",
  "loanAmnt": 5000.0,
  "loanIntRate": 10.5,
  "loanStatus": "PENDING",
  "loanPercentIncome": 0.12
}
```

> Trong practice, `employeeId`/`employeeName` có thể được backend override từ `X-User-Id` và thông tin nhân viên, `customerName` có thể lấy từ CustomerService – tuỳ cách tích hợp.

### 2.2. `RegisterPredictionFromLoanRequestDto` – đăng ký từ luồng loan

```json
{
  "predictionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerName": "Nguyen Van A",
  "customerInfo": {
    "personAge": 28,
    "personIncome": 85000.0,
    "personHomeOwnership": "RENT",
    "personEmpLength": 3.5,
    "loanIntent": "PERSONAL",
    "loanGrade": "B",
    "loanAmnt": 5000.0,
    "loanIntRate": 10.5,
    "loanPercentIncome": 0.12,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 5
  },
  "staffId": "11111111-2222-3333-4444-555555555555"
}
```

Các field có ràng buộc `@NotNull`: `predictionId`, `customerId`, `customerInfo`, `staffId`.

### 2.3. `PredictionResponseDto` – trả về cho mọi API đọc/ghi prediction

```json
{
  "predictionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeId": "11111111-2222-3333-4444-555555555555",
  "customerName": "Nguyen Van A",
  "employeeName": "Tran Van Staff",
  "status": "PENDING",
  "predictionResult": null,
  "confidence": null,
  "createdAt": "2024-01-01T10:00:00",
  "completedAt": null
}
```

Khi status chuyển sang `COMPLETED`, hai field kết quả sẽ được set:

```json
{
  "status": "COMPLETED",
  "predictionResult": true,
  "confidence": 0.87
}
```

### 2.4. `PageResponse<PredictionResponseDto>` – kết quả phân trang

```json
{
  "content": [
    {
      "predictionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "employeeId": "11111111-2222-3333-4444-555555555555",
      "customerName": "Nguyen Van A",
      "employeeName": "Tran Van Staff",
      "status": "PENDING",
      "predictionResult": null,
      "confidence": null,
      "createdAt": "2024-01-01T10:00:00",
      "completedAt": null
    }
  ],
  "number": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

---

## 3. Nhóm API Prediction (`/api/predictions`)

### 3.1. Tạo prediction trực tiếp – Create prediction

- **Method:** `POST`
- **URL (local):** `http://localhost:8007/api/predictions`
- **URL (gateway):** `http://localhost:8080/api/predictions`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>`
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Request body** – `PredictionRequestDto`:

```json
{
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerName": "Nguyen Van A",
  "loanIntent": "PERSONAL",
  "loanAmnt": 5000.0,
  "loanIntRate": 10.5,
  "loanStatus": "PENDING",
  "loanPercentIncome": 0.12
}
```

- **Response body** – `PredictionResponseDto` (200 OK, thường ở trạng thái `PENDING` ban đầu).

---

### 3.2. Đăng ký prediction từ luồng loan – Register prediction from loan

- **Method:** `POST`
- **URL:** `/api/predictions/register-from-loan`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>` (LoanManagementService truyền ID nhân viên đang xử lý)
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Request body** – `RegisterPredictionFromLoanRequestDto`:

```json
{
  "predictionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerName": "Nguyen Van A",
  "customerInfo": {
    "personAge": 28,
    "personIncome": 85000.0,
    "personHomeOwnership": "RENT",
    "personEmpLength": 3.5,
    "loanIntent": "PERSONAL",
    "loanGrade": "B",
    "loanAmnt": 5000.0,
    "loanIntRate": 10.5,
    "loanPercentIncome": 0.12,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 5
  },
  "staffId": "11111111-2222-3333-4444-555555555555"
}
```

- **Response body** – `PredictionResponseDto` với status `PENDING`.

---

### 3.3. Lấy prediction theo ID – Get prediction by id

- **Method:** `GET`
- **URL:** `/api/predictions/id/{predictionId}`
- **Path variable:** `predictionId` – UUID prediction.
- **Headers:**
  - `X-User-Id: <UUID nhân viên>`
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Response body:** `PredictionResponseDto`.

Ví dụ:

```json
{
  "predictionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employeeId": "11111111-2222-3333-4444-555555555555",
  "customerName": "Nguyen Van A",
  "employeeName": "Tran Van Staff",
  "status": "COMPLETED",
  "predictionResult": true,
  "confidence": 0.87,
  "createdAt": "2024-01-01T10:00:00",
  "completedAt": "2024-01-01T10:05:00"
}
```

---

### 3.4. Lấy danh sách prediction theo customer – Get by customerId

- **Method:** `GET`
- **URL:** `/api/predictions/customer/id/{customerId}`
- **Path variable:** `customerId` – UUID khách hàng.
- **Headers:**
  - `X-User-Id: <UUID nhân viên>`
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Response body:** mảng `PredictionResponseDto`:

```json
[
  {
    "predictionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "employeeId": "11111111-2222-3333-4444-555555555555",
    "customerName": "Nguyen Van A",
    "employeeName": "Tran Van Staff",
    "status": "PENDING",
    "predictionResult": null,
    "confidence": null,
    "createdAt": "2024-01-01T10:00:00",
    "completedAt": null
  }
]
```

---

### 3.5. Lấy danh sách prediction theo employee – Get by employeeId

- **Method:** `GET`
- **URL:** `/api/predictions/employee/id/{employeeId}`
- **Path variable:** `employeeId` – UUID nhân viên muốn xem.
- **Headers:**
  - `X-User-Id: <UUID nhân viên gọi API>`
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Response body:** mảng `PredictionResponseDto`.

---

### 3.6. Lấy prediction của chính nhân viên hiện tại – Get current employee predictions (`/me`)

- **Method:** `GET`
- **URL:** `/api/predictions/employee/id/me`
- **Headers:**
  - `X-User-Id: <UUID nhân viên hiện tại>` – backend dùng giá trị này làm `employeeId`.
  - *(qua Gateway)* `Authorization: Bearer <accessToken>`
- **Response body:** mảng `PredictionResponseDto` của nhân viên hiện tại.

---

### 3.7. Lấy tất cả prediction (phân trang) – Get all predictions

- **Method:** `GET`
- **URL:** `/api/predictions`
- **Query params:**
  - `page` – số trang, mặc định `0`.
  - `size` – số bản ghi mỗi trang, mặc định `10`.
- **Headers (qua Gateway):**
  - `Authorization: Bearer <accessToken>`
- **Response body:** `PageResponse<PredictionResponseDto>` (xem ví dụ ở phần 2.4).

---

## 4. Error response mẫu

PredictionService có thể sử dụng global exception handler tương tự các service khác (tuỳ implement), một số lỗi thường gặp:

- **400 Bad Request**
  - Thiếu field bắt buộc (`predictionId`, `customerId`, `customerInfo`, …) trong `RegisterPredictionFromLoanRequestDto`.
  - `predictionId` hoặc `customerId` không phải UUID hợp lệ.
- **404 Not Found**
  - Không tìm thấy prediction theo `predictionId`.
- **401 / 403 (qua Gateway)**
  - Thiếu hoặc sai JWT token ở header `Authorization`.

Ví dụ error body (tham khảo kiểu chung):

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Prediction not found for id: 00000000-0000-0000-0000-000000000000"
}
```

---

## 5. Tóm tắt endpoint

| Method | Endpoint                                      | Mô tả                                                   |
|--------|-----------------------------------------------|--------------------------------------------------------|
| POST   | `/api/predictions`                           | Tạo prediction trực tiếp từ thông tin khoản vay        |
| POST   | `/api/predictions/register-from-loan`        | Đăng ký prediction PENDING từ luồng loan               |
| GET    | `/api/predictions/id/{predictionId}`         | Lấy một prediction theo `predictionId`                 |
| GET    | `/api/predictions/customer/id/{customerId}`  | Lấy danh sách prediction theo `customerId`             |
| GET    | `/api/predictions/employee/id/{employeeId}`  | Lấy danh sách prediction theo `employeeId`             |
| GET    | `/api/predictions/employee/id/me`            | Lấy prediction của nhân viên đang đăng nhập (`X-User-Id`) |
| GET    | `/api/predictions`                           | Lấy tất cả prediction (có phân trang `page`, `size`)   |
