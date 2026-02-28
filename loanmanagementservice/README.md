## LoanManagementService – Dịch vụ quản lý khoản vay

LoanManagementService chịu trách nhiệm **quản lý toàn bộ vòng đời khoản vay** trong hệ thống SmartLend:
- Tạo đơn xin vay (`loan applications`) dựa trên hồ sơ khách hàng và snapshot tài chính.
- Gửi yêu cầu dự đoán rủi ro đến `PredictionService` và nhận lại kết quả (độ tin cậy `predictionConfidence`, `loanGrade` gợi ý).
- Ghi nhận/cập nhật quyết định phê duyệt hoặc từ chối đơn vay.
- Quản lý các khoản **giải ngân** (`disbursements`) và truy vết lịch sử giải ngân.
- Lưu trữ **financial snapshots** (ảnh chụp dữ liệu tài chính) tại thời điểm khách hàng nộp đơn.

### Base URL

- **Local trực tiếp service:** `http://localhost:8008` (ví dụ)
- **Qua API Gateway:** tuỳ cấu hình route (ở đây tài liệu tập trung vào base trực tiếp service).

Các prefix API chính:
- `/api/loan-applications`
- `/api/disbursements`
- `/api/financial-snapshots`

---

## 1. DTO & enum chính

### 1.1. `LoanApplicationRequestDto` – tạo đơn xin vay

```json
{
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "loanIntent": "PERSONAL",
  "requestedAmount": 100000000,
  "requestedTermMonths": 12,
  "requestedInterestRate": 12.5
}
```

- `customerId` (UUID, bắt buộc) – ID khách hàng, phải tồn tại trong `CustomerService`.
- `loanIntent` (enum `LoanIntent`, bắt buộc) – các giá trị:  
  `PERSONAL`, `EDUCATION`, `MEDICAL`, `VENTURE`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION`, `OTHER`.
- `requestedAmount` (BigDecimal, > 0) – số tiền khách hàng xin vay.
- `requestedTermMonths` (Integer, > 0) – thời hạn vay (tháng).
- `requestedInterestRate` (BigDecimal, ≥ 0) – lãi suất mong muốn (%/năm).

### 1.2. `LoanApplicationResponseDto` – trả về cho mọi API loan application

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerName": "Nguyen Van A",
  "loanGrade": "B",
  "financialSnapshotId": "aaaaaaa1-2222-3333-4444-555555555555",
  "predictionId": "bbbbbbb1-2222-3333-4444-555555555555",
  "requestedAmount": 100000000,
  "requestedTermMonths": 12,
  "requestedInterestRate": 12.5,
  "decision": "PENDING",
  "decisionAt": null,
  "predictionConfidence": 0.87,
  "status": "UNDER_REVIEW",
  "staffId": "99999999-8888-7777-6666-555555555555",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

- `status`: enum `LoanApplicationStatus` – ví dụ `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `DISBURSED`, ...
- `decision`: enum `LoanDecision` – ví dụ `APPROVE`, `REJECT`, `PENDING`.

### 1.3. `UpdateLoanDecisionRequestDto` – cập nhật quyết định

```json
{
  "decision": "APPROVE"
}
```

### 1.4. `DisbursementRequestDto` / `DisbursementResponseDto`

**Request:**

```json
{
  "loanApplicationId": "11111111-2222-3333-4444-555555555555",
  "disbursedAmount": 100000000,
  "snapshotData": "{\"note\":\"Test disbursement from UI\"}"
}
```

- `loanApplicationId` (UUID, bắt buộc) – đơn vay phải ở trạng thái `APPROVED`.
- `disbursedAmount` (BigDecimal, > 0) – số tiền giải ngân.
- `snapshotData` (String, optional) – JSON tuỳ ý; nếu null, service sẽ tự build JSON từ `LoanApplication`.

**Response:**

```json
{
  "id": "22222222-3333-4444-5555-666666666666",
  "loanApplicationId": "11111111-2222-3333-4444-555555555555",
  "disbursedAmount": 100000000,
  "disbursedAt": "2024-01-02T09:00:00",
  "snapshotData": "{\"loanApplicationId\":\"11111111-2222-3333-4444-555555555555\",...}",
  "status": "COMPLETED",
  "createdAt": "2024-01-02T09:00:00"
}
```

### 1.5. `FinancialSnapshotResponseDto` – ảnh chụp tài chính

```json
{
  "id": "aaaaaaa1-2222-3333-4444-555555555555",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "personAge": 30,
  "personIncome": 50000000.0,
  "personHomeOwnership": "RENT",
  "personEmpLength": 5.5,
  "loanIntent": "PERSONAL",
  "loanGrade": "B",
  "loanAmnt": 100000000.0,
  "loanIntRate": 12.5,
  "loanPercentIncome": 2.0,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5,
  "createdAt": "2024-01-01T10:00:00"
}
```

---

## 2. API `Loan Applications` (`/api/loan-applications`)

### 2.1. Tạo đơn xin vay – Create loan application

- **Method:** `POST`
- **URL:** `/api/loan-applications`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>`
- **Body:** `LoanApplicationRequestDto` (ví dụ 1.1).

**Response – 200 OK (LoanApplicationResponseDto):**

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "financialSnapshotId": "aaaaaaa1-2222-3333-4444-555555555555",
  "predictionId": "bbbbbbb1-2222-3333-4444-555555555555",
  "status": "UNDER_REVIEW",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### 2.2. Trigger lại dự đoán – Trigger prediction

- **Method:** `POST`
- **URL:** `/api/loan-applications/id/{id}/trigger-prediction`
- **Path variable:**
  - `id`: UUID của loan application.
- **Headers:**
  - `X-User-Id: <UUID nhân viên>`

**Response – 200 OK (LoanApplicationResponseDto):**

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "predictionId": "bbbbbbb1-2222-3333-4444-555555555555",
  "predictionConfidence": 0.87,
  "status": "UNDER_REVIEW"
}
```

---

### 2.3. Cập nhật quyết định khoản vay – Update loan decision

- **Method:** `POST`
- **URL:** `/api/loan-applications/id/{id}/decision`
- **Path variable:**
  - `id`: UUID loan application.
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>`
- **Body – `UpdateLoanDecisionRequestDto`:**

```json
{
  "decision": "APPROVE"
}
```

**Response – 200 OK (LoanApplicationResponseDto):**

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "decision": "APPROVE",
  "decisionAt": "2024-01-02T09:00:00",
  "status": "APPROVED",
  "staffId": "99999999-8888-7777-6666-555555555555"
}
```

---

### 2.4. Lấy đơn theo ID – Get loan application by id

- **Method:** `GET`
- **URL:** `/api/loan-applications/id/{id}`
- **Response – 200 OK (LoanApplicationResponseDto)** – giống ví dụ ở 2.1.

---

### 2.5. Lấy danh sách đơn theo khách hàng – Get by customerId

- **Method:** `GET`
- **URL:** `/api/loan-applications/customer/id/{customerId}`
- **Response – 200 OK:**

```json
[
  {
    "id": "11111111-2222-3333-4444-555555555555",
    "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "UNDER_REVIEW"
  }
]
```

---

### 2.6. Lấy danh sách đơn theo nhân viên – Get by staffId

- **Method:** `GET`
- **URL:** `/api/loan-applications/staff/id/{staffId}`
- **Response – 200 OK:** mảng `LoanApplicationResponseDto`.

---

### 2.7. Lấy tất cả đơn (phân trang) – Get all paged

- **Method:** `GET`
- **URL:** `/api/loan-applications?page=0&size=10`
- **Query params:**
  - `page` (mặc định `0`)
  - `size` (mặc định `10`)

**Response – 200 OK (`PageResponse<LoanApplicationResponseDto>`):**

```json
{
  "content": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "UNDER_REVIEW"
    }
  ],
  "number": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

---

## 3. API `Disbursements` (`/api/disbursements`)

### 3.1. Tạo bản ghi giải ngân – Create disbursement

- **Method:** `POST`
- **URL:** `/api/disbursements`
- **Headers:**
  - `Content-Type: application/json`
- **Body – `DisbursementRequestDto`:**

```json
{
  "loanApplicationId": "11111111-2222-3333-4444-555555555555",
  "disbursedAmount": 100000000,
  "snapshotData": "{\"note\":\"Disbursement from web UI\"}"
}
```

**Response – 200 OK (`DisbursementResponseDto`):**

```json
{
  "id": "22222222-3333-4444-5555-666666666666",
  "loanApplicationId": "11111111-2222-3333-4444-555555555555",
  "disbursedAmount": 100000000,
  "disbursedAt": "2024-01-02T09:00:00",
  "snapshotData": "{\"loanApplicationId\":\"11111111-2222-3333-4444-555555555555\",...}",
  "status": "COMPLETED",
  "createdAt": "2024-01-02T09:00:00"
}
```

---

### 3.2. Lấy giải ngân theo ID – Get disbursement by id

- **Method:** `GET`
- **URL:** `/api/disbursements/id/{id}`
- **Response – 200 OK:** `DisbursementResponseDto`.

---

### 3.3. Lấy giải ngân theo loanApplicationId – Get by loanApplicationId

- **Method:** `GET`
- **URL:** `/api/disbursements/loan-application/id/{loanApplicationId}`
- **Response – 200 OK:**

```json
[
  {
    "id": "22222222-3333-4444-5555-666666666666",
    "loanApplicationId": "11111111-2222-3333-4444-555555555555",
    "disbursedAmount": 100000000,
    "status": "COMPLETED"
  }
]
```

---

## 4. API `Financial Snapshots` (`/api/financial-snapshots`)

### 4.1. Lấy snapshot theo ID – Get snapshot by id

- **Method:** `GET`
- **URL:** `/api/financial-snapshots/id/{id}`
- **Response – 200 OK:** `FinancialSnapshotResponseDto` (xem 1.5).

---

### 4.2. Lấy snapshot theo khách hàng – Get snapshots by customerId

- **Method:** `GET`
- **URL:** `/api/financial-snapshots/customer/id/{customerId}`
- **Response – 200 OK:** mảng `FinancialSnapshotResponseDto`.

---

## 5. Lỗi thường gặp & error response

Tuỳ implement `GlobalExceptionHandler`, nhưng các trường hợp phổ biến:

- **400 Bad Request**
  - Thiếu field bắt buộc trong `LoanApplicationRequestDto`, `DisbursementRequestDto`, `UpdateLoanDecisionRequestDto`.
  - `customerId` không tồn tại trong CustomerService khi tạo loan application.
- **404 Not Found**
  - Không tìm thấy `LoanApplication` / `Disbursement` / `FinancialSnapshot` với ID cung cấp.
- **409 / 422** (tuỳ thiết kế)
  - Cố gắng giải ngân khi loan application chưa ở trạng thái `APPROVED`.

Ví dụ error body:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Customer ID is required"
}
```

---

## 6. Tóm tắt endpoint

| Method | Endpoint                                                   | Mô tả                                                 |
|--------|------------------------------------------------------------|------------------------------------------------------|
| POST   | `/api/loan-applications`                                  | Tạo đơn xin vay mới                                  |
| POST   | `/api/loan-applications/id/{id}/trigger-prediction`       | Trigger lại yêu cầu dự đoán cho đơn vay              |
| POST   | `/api/loan-applications/id/{id}/decision`                 | Cập nhật quyết định phê duyệt/từ chối đơn vay        |
| GET    | `/api/loan-applications/id/{id}`                           | Lấy chi tiết đơn vay theo ID                         |
| GET    | `/api/loan-applications/customer/id/{customerId}`         | Lấy danh sách đơn vay theo khách hàng                |
| GET    | `/api/loan-applications/staff/id/{staffId}`               | Lấy danh sách đơn vay theo nhân viên xử lý           |
| GET    | `/api/loan-applications`                                  | Lấy tất cả đơn vay (phân trang)                      |
| POST   | `/api/disbursements`                                      | Tạo bản ghi giải ngân cho đơn vay đã được duyệt      |
| GET    | `/api/disbursements/id/{id}`                              | Lấy chi tiết một bản ghi giải ngân                   |
| GET    | `/api/disbursements/loan-application/id/{loanApplicationId}` | Lấy tất cả giải ngân của một đơn vay             |
| GET    | `/api/financial-snapshots/id/{id}`                        | Lấy snapshot tài chính theo ID                       |
| GET    | `/api/financial-snapshots/customer/id/{customerId}`       | Lấy danh sách snapshot tài chính theo khách hàng     |
## LoanManagementService

Service quản lý khoản vay, financial snapshot và giải ngân.

**Request body tham chiếu (khớp code):**

- **LoanApplicationRequestDto** (POST loan-applications): `customerId`, `loanIntent`, `requestedAmount`, `requestedTermMonths`, `requestedInterestRate`. Thông tin person/credit lấy từ CustomerService; `loanAmnt` / `loanIntRate` / `loanPercentIncome` trong snapshot được tính từ `requestedAmount` và `requestedInterestRate` (loanPercentIncome = requestedAmount / thu nhập profile).
- **DisbursementRequestDto** (POST disbursements): `loanApplicationId`, `disbursedAmount`, `snapshotData` (optional).

**LoanIntent:** `PERSONAL`, `EDUCATION`, `MEDICAL`, `VENTURE`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION`, `OTHER`.

---

### Collection SmartLend – LoanManagementService

**1. Create Loan Application (success)**

- **Method**: `POST`
- **URL**: `{{base_url_loan}}/api/loan-applications`
- **Headers**:
  - `Content-Type: application/json`
  - `X-User-Id: {{staff_id}}`
- **Body (raw JSON)** – khớp `LoanApplicationRequestDto`: `customerId` phải có profile trong CustomerService; thông tin person/credit lấy từ profile, chỉ gửi thông tin đơn vay:

```json
{
  "customerId": "{{customer_id}}",
  "loanIntent": "PERSONAL",
  "requestedAmount": 100000000,
  "requestedTermMonths": 12,
  "requestedInterestRate": 12.5
}
```

- **Tests** (tab Tests):

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has id, customerId, financialSnapshotId, predictionId, status", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("customerId");
    pm.expect(json).to.have.property("financialSnapshotId");
    pm.expect(json).to.have.property("predictionId");
    pm.expect(json).to.have.property("status");
    pm.expect(json.status).to.eql("UNDER_REVIEW");
});

pm.test("Save loan_application_id and financial_snapshot_id", function () {
    const json = pm.response.json();
    pm.environment.set("loan_application_id", json.id);
    pm.environment.set("financial_snapshot_id", json.financialSnapshotId);
});
```

---

**1b. Create Loan Application – Customer not found (400)**

- **Method**: `POST`
- **URL**: `{{base_url_loan}}/api/loan-applications`
- **Headers**:
  - `Content-Type: application/json`
  - `X-User-Id: {{staff_id}}`
- **Body (raw JSON)** – cùng cấu trúc `LoanApplicationRequestDto`, dùng `customerId` **không** tồn tại trong CustomerService:

```json
{
  "customerId": "00000000-0000-0000-0000-000000000001",
  "loanIntent": "PERSONAL",
  "requestedAmount": 100000000,
  "requestedTermMonths": 12,
  "requestedInterestRate": 12.5
}
```

- **Tests** (tab Tests):

```javascript
pm.test("Status code is 400 when customer not found", function () {
    pm.response.to.have.status(400);
});

pm.test("Response mentions customer not found", function () {
    const body = pm.response.text();
    pm.expect(body.toLowerCase()).to.include("customer");
});
```

---

**2. Get Loan Application by Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/loan-applications/id/{{loan_application_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has id, customerId, financialSnapshotId, status", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("customerId");
    pm.expect(json).to.have.property("financialSnapshotId");
    pm.expect(json).to.have.property("status");
});
```

---

**3. Get Loan Applications by Customer Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/loan-applications/customer/id/{{customer_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
```

---

**4. Get Loan Applications by Staff Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/loan-applications/staff/id/{{staff_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
```

---

**5. Get Loan Applications (paginated)**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/loan-applications?page=0&size=10`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has content array and pagination fields", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("content");
    pm.expect(json.content).to.be.an("array");
});
```

---

**6. Create Disbursement**

- **Method**: `POST`
- **URL**: `{{base_url_loan}}/api/disbursements`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)** – khớp `DisbursementRequestDto` (dùng `loan_application_id` đã tạo từ request 1):

```json
{
  "loanApplicationId": "{{loan_application_id}}",
  "disbursedAmount": 100000000,
  "snapshotData": "{\"note\":\"Test disbursement from Postman\"}"
}
```

- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has id, loanApplicationId, disbursedAmount, status", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("loanApplicationId");
    pm.expect(json).to.have.property("disbursedAmount");
    pm.expect(json).to.have.property("status");
});

pm.test("Save disbursement_id", function () {
    const json = pm.response.json();
    pm.environment.set("disbursement_id", json.id);
});
```

---

**7. Get Disbursement by Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/disbursements/id/{{disbursement_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has id, loanApplicationId, disbursedAmount", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("loanApplicationId");
    pm.expect(json).to.have.property("disbursedAmount");
});
```

---

**8. Get Disbursements by Loan Application Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/disbursements/loan-application/id/{{loan_application_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
```

---

**9. Get Financial Snapshot by Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/financial-snapshots/id/{{financial_snapshot_id}}`
- **Ghi chú**: `financial_snapshot_id` được set tự động từ **1. Create Loan Application** (hoặc lấy từ response **2. Get Loan Application by Id** → field `financialSnapshotId`).
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has id, customerId, personAge, personIncome (from CustomerService profile)", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("customerId");
    pm.expect(json).to.have.property("personAge");
    pm.expect(json).to.have.property("personIncome");
});
```

---

**10. Get Financial Snapshots by Customer Id**

- **Method**: `GET`
- **URL**: `{{base_url_loan}}/api/financial-snapshots/customer/id/{{customer_id}}`
- **Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
```