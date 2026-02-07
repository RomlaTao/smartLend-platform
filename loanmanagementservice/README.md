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