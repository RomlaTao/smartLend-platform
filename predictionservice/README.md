# PredictionService - Loan Default Prediction Service

## Base URL

- **Local:** `http://localhost:8007`
- **Via API Gateway:** `http://localhost:8080/api/predictions`

---

## DTO và Enum (tham chiếu cho Postman)

### PredictionRequestDto (POST `/api/predictions`)

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| `customerId` | UUID | Có | ID khách hàng (profile lấy từ CustomerService) |
| `loanIntent` | enum | Không | LoanIntent |
| `loanGrade` | enum | Không | LoanGrade |
| `loanAmnt` | Double | Không | Số tiền vay |
| `loanIntRate` | Double | Không | Lãi suất |
| `loanStatus` | enum | Không | LoanStatus |
| `loanPercentIncome` | Double | Không | % thu nhập dùng trả nợ |

### RegisterPredictionFromLoanRequestDto (POST `/api/predictions/register-from-loan`)

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| `predictionId` | UUID | Có | ID prediction (do LoanManagementService tạo) |
| `customerId` | UUID | Có | ID khách hàng |
| `customerInfo` | object | Có | Snapshot thông tin cho model (xem bảng dưới) |
| `staffId` | UUID | Có | ID nhân viên |

**customerInfo** (nested):

| Field | Type | Mô tả |
|-------|------|--------|
| `personAge` | Integer | Tuổi |
| `personIncome` | Double | Thu nhập |
| `personHomeOwnership` | String | RENT, OWN, MORTGAGE, OTHER |
| `personEmpLength` | Double | Thâm niên (năm) |
| `loanIntent` | String | PERSONAL, EDUCATION, ... |
| `loanGrade` | String | A, B, C, D, E, F, G |
| `loanAmnt` | Double | Số tiền vay |
| `loanIntRate` | Double | Lãi suất |
| `loanPercentIncome` | Double | % thu nhập |
| `cbPersonDefaultOnFile` | String | Nợ quá hạn (credit bureau) |
| `cbPersonCredHistLength` | Integer | Độ dài lịch sử tín dụng |

### PredictionResponseDto (response chung)

`predictionId`, `customerId`, `employeeId`, `status`, `predictionResult` (Boolean, null khi PENDING), `confidence` (Double, null khi PENDING), `createdAt`, `completedAt` (null nếu chưa có trong entity).

### Enum

- **PredictionStatus:** `PENDING`, `COMPLETED`, `FAILED`
- **LoanIntent:** `PERSONAL`, `EDUCATION`, `MEDICAL`, `VENTURE`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION`, `OTHER`
- **LoanGrade:** `A`, `B`, `C`, `D`, `E`, `F`, `G`
- **LoanStatus:** `APPROVED`, `REJECTED`, `PENDING`

---

## Postman Test Cases

### Environment Variables

Trong Postman, tạo các variables sau:

- `baseUrl`:
  - `http://localhost:8007` (gọi trực tiếp: `{{baseUrl}}/api/predictions`)
  - hoặc `http://localhost:8080/api/predictions` (gọi qua API Gateway)
- `accessToken`: Access token từ IdentityService (bắt buộc khi gọi qua Gateway)
- `predictionId`: UUID prediction (sẽ được lưu sau khi tạo)
- `customerId`: UUID khách hàng có profile trong CustomerService
- `employeeId`: UUID nhân viên (staff) – dùng cho header `X-User-Id`

---

### 1. Create Prediction – Tạo yêu cầu dự đoán (standalone)

**Request:**

- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/predictions` (nếu baseUrl = `http://localhost:8007`) hoặc `{{baseUrl}}` (nếu baseUrl = `http://localhost:8080/api/predictions`)
- **Headers:**
  ```text
  Content-Type: application/json
  X-User-Id: {{employeeId}}
  ```
  *Qua Gateway thêm:* `Authorization: Bearer {{accessToken}}`
- **Body (raw JSON – PredictionRequestDto):**
  ```json
  {
    "customerId": "{{customerId}}",
    "loanIntent": "PERSONAL",
    "loanGrade": "B",
    "loanAmnt": 5000.0,
    "loanIntRate": 10.5,
    "loanStatus": "PENDING",
    "loanPercentIncome": 0.12
  }
  ```
  *Tối thiểu:* chỉ cần `customerId` (các field khác optional; profile lấy từ CustomerService).

**Expected Response:**

- **Status:** `200 OK`
- **Body (PredictionResponseDto):**
  ```json
  {
    "predictionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "customerId": "{{customerId}}",
    "employeeId": "{{employeeId}}",
    "status": "PENDING",
    "predictionResult": null,
    "confidence": null,
    "createdAt": "2024-01-01T10:00:00",
    "completedAt": null
  }
  ```

**Postman Script:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains prediction data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('predictionId');
    pm.expect(jsonData).to.have.property('customerId');
    pm.expect(jsonData).to.have.property('employeeId');
    pm.expect(jsonData.status).to.eql('PENDING');
    pm.collectionVariables.set("predictionId", jsonData.predictionId);
});
```

---

### 2. Register Prediction From Loan – Đăng ký prediction từ luồng loan

**Request:**

- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/predictions/register-from-loan`
- **Headers:**
  ```text
  Content-Type: application/json
  X-User-Id: {{employeeId}}
  ```
  *Qua Gateway thêm:* `Authorization: Bearer {{accessToken}}`
- **Body (raw JSON – RegisterPredictionFromLoanRequestDto):**
  ```json
  {
    "predictionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "customerId": "{{customerId}}",
    "staffId": "{{employeeId}}",
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
    }
  }
  ```
  *Lưu ý:* `predictionId` thường do LoanManagementService tạo trước khi gọi API này.

**Expected Response:**

- **Status:** `200 OK`
- **Body:** PredictionResponseDto (giống test case 1, status PENDING).

**Postman Script:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
pm.test("Response is register-from-loan prediction", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('predictionId');
    pm.expect(jsonData.status).to.eql('PENDING');
});
```

---

### 3. Get Prediction by ID

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/id/{{predictionId}}`
- **Headers:** `X-User-Id: {{employeeId}}` (qua Gateway: `Authorization: Bearer {{accessToken}}`)

**Expected Response:** `200 OK`, body là PredictionResponseDto.

**Postman Script:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
pm.test("Prediction ID matches", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.predictionId).to.equal(pm.collectionVariables.get("predictionId"));
});
```

---

### 4. Get Predictions by Customer ID

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/customer/id/{{customerId}}`
- **Headers:** `X-User-Id: {{employeeId}}` (qua Gateway: `Authorization: Bearer {{accessToken}}`)

**Expected Response:** `200 OK`, body là mảng PredictionResponseDto.

**Postman Script:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
pm.test("Response is an array", function () {
    pm.expect(pm.response.json()).to.be.an('array');
});
```

---

### 5. Get Predictions by Employee ID

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/employee/id/{{employeeId}}`
- **Headers:** `X-User-Id: {{employeeId}}` (qua Gateway: `Authorization: Bearer {{accessToken}}`)

**Expected Response:** `200 OK`, body là mảng PredictionResponseDto.

---

### 6. Get Current Employee Predictions (me)

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/employee/id/me`
- **Headers:** `X-User-Id: {{employeeId}}` (service dùng giá trị này làm employeeId)

**Expected Response:** `200 OK`, body là mảng PredictionResponseDto của nhân viên hiện tại.

---

### 7. Get All Predictions (phân trang)

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions?page=0&size=10`
- **Headers:** Qua Gateway: `Authorization: Bearer {{accessToken}}` (X-User-Id không bắt buộc cho endpoint này)

**Expected Response:** `200 OK`, body dạng Spring Page:

```json
{
  "content": [ { "predictionId": "...", "customerId": "...", "employeeId": "...", "status": "PENDING", ... } ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

**Postman Script:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
pm.test("Response is a paged list", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('content');
    pm.expect(jsonData.content).to.be.an('array');
});
```

---

## Negative Test Cases

### 8. Create Prediction – Thiếu customerId

**Request:**

- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/predictions`
- **Headers:** `Content-Type: application/json`, `X-User-Id: {{employeeId}}`
- **Body:**
  ```json
  {
    "loanIntent": "PERSONAL",
    "loanGrade": "B"
  }
  ```

**Expected Response:** `400` hoặc `500` (service validate: "Customer ID is required").

---

### 9. Register From Loan – Thiếu customerInfo

**Request:**

- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/predictions/register-from-loan`
- **Body:**
  ```json
  {
    "predictionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "customerId": "{{customerId}}",
    "staffId": "{{employeeId}}"
  }
  ```

**Expected Response:** `400` (validation: customerInfo is required).

---

### 10. Get Prediction by ID – Không tồn tại

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/id/00000000-0000-0000-0000-000000000000`

**Expected Response:** `404` hoặc `500` (message kiểu "Prediction not found" / "Error getting prediction by id").

---

### 11. Get Prediction by ID – ID không hợp lệ

**Request:**

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/id/invalid-uuid`

**Expected Response:** `400 Bad Request` (convert String to UUID failed).

---

### 12. Access via Gateway – Thiếu Authorization

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:8080/api/predictions`
- **Headers:** không gửi `Authorization`

**Expected Response:** `401 Unauthorized` (Gateway JWT filter).

---

## Postman Collection Setup

### Collection variables

- `baseUrl`: `http://localhost:8007` hoặc `http://localhost:8080/api/predictions`
- `accessToken`: (từ IdentityService login)
- `predictionId`: (để trống, set sau khi tạo prediction)
- `customerId`: UUID khách hàng có trong CustomerService
- `employeeId`: UUID nhân viên (dùng cho `X-User-Id`)

### Test flow gợi ý

1. **Login** (IdentityService) → lấy `accessToken`
2. **Create Prediction** (body có `customerId`, có thể thêm loanIntent, loanGrade, ...) → lưu `predictionId`
3. **Get Prediction by ID** → ` /api/predictions/id/{{predictionId}}`
4. **Get by Customer** → `/api/predictions/customer/id/{{customerId}}`
5. **Get by Employee** → `/api/predictions/employee/id/{{employeeId}}` và `/api/predictions/employee/id/me`
6. **Get All** → `/api/predictions?page=0&size=10`
7. **Register From Loan** (optional) → POST `/api/predictions/register-from-loan` với body đầy đủ (dùng khi test tích hợp với LoanManagementService)

### Tips

- `X-User-Id` bắt buộc cho: POST create, POST register-from-loan, GET by id, GET by customer, GET by employee, GET me.
- Qua Gateway: thêm `Authorization: Bearer {{accessToken}}` cho mọi request.
- Có thể dùng `?sort=createdAt,desc` cho API list.

---

## API Endpoints Summary

| Method | Endpoint | Mô tả | Headers |
|--------|----------|--------|---------|
| POST | `/api/predictions` | Tạo prediction (standalone, dùng profile từ CustomerService) | Content-Type, X-User-Id, Authorization (Gateway) |
| POST | `/api/predictions/register-from-loan` | Đăng ký prediction từ luồng loan (LoanManagementService) | Content-Type, X-User-Id, Authorization (Gateway) |
| GET | `/api/predictions/id/{predictionId}` | Lấy prediction theo ID | X-User-Id, Authorization (Gateway) |
| GET | `/api/predictions/customer/id/{customerId}` | Lấy danh sách theo customerId | X-User-Id, Authorization (Gateway) |
| GET | `/api/predictions/employee/id/{employeeId}` | Lấy danh sách theo employeeId | X-User-Id, Authorization (Gateway) |
| GET | `/api/predictions/employee/id/me` | Lấy danh sách của nhân viên hiện tại | X-User-Id, Authorization (Gateway) |
| GET | `/api/predictions` | Lấy tất cả (phân trang: page, size, sort) | Authorization (Gateway) |
