# PredictionService - Loan Default Prediction Service

## Base URL

- **Local:** `http://localhost:8007`
- **Via API Gateway:** `http://localhost:8080/api/predictions`

---

## Postman Test Cases

### Environment Variables

Trong Postman, tạo các variables sau:
- `baseUrl`:
  - `http://localhost:8007` (gọi trực tiếp service, dùng URL dạng `{{baseUrl}}/api/predictions`)
  - hoặc `http://localhost:8080/api/predictions` (nếu gọi qua API Gateway)
- `accessToken`: Access token từ IdentityService (bắt buộc khi gọi qua Gateway vì có `JwtAuthenticationFilter`)
- `predictionId`: UUID của bản ghi prediction (sẽ được lưu sau khi tạo)
- `customerId`: UUID của khách hàng dùng cho test
- `employeeId`: UUID của nhân viên (staff) dùng cho test

---

### 1. Create Prediction - Tạo yêu cầu dự đoán

**Request:**
- **Method:** `POST`
- **URL:** 
  - `{{baseUrl}}/api/predictions` nếu `baseUrl = http://localhost:8007`
  - hoặc `{{baseUrl}}` nếu `baseUrl = http://localhost:8080/api/predictions`
- **Headers:**
  ```text
  Content-Type: application/json
  X-User-Id: {{employeeId}}
  ```
  *Nếu qua Gateway, thêm:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```
- **Body (raw JSON - `PredictionRequestDto`):**
  ```json
  {
    "customerId": "{{customerId}}"
  }
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON - `PredictionResponseDto`):**
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

    // Lưu predictionId để dùng cho các request sau
    pm.collectionVariables.set("predictionId", jsonData.predictionId);
});
```

---

### 2. Get Prediction by ID - Lấy prediction theo ID

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/{{predictionId}}`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  ```
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON):**
  ```json
  {
    "predictionId": "{{predictionId}}",
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

pm.test("Prediction ID matches", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.predictionId).to.equal(pm.collectionVariables.get("predictionId"));
});
```

---

### 3. Get Predictions by Customer ID - Lấy danh sách prediction theo khách hàng

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/customer/{{customerId}}`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  ```
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON Array):**
  ```json
  [
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
  ]
  ```

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

### 4. Get Predictions by Employee ID - Lấy danh sách prediction theo nhân viên

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/employee/{{employeeId}}`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  ```
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON Array):**
  ```json
  [
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
  ]
  ```

---

### 5. Get Current Employee Predictions - Lấy danh sách prediction của nhân viên hiện tại

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/employee/me`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  ```
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON Array):** giống như API 4 nhưng tự động dùng `employeeId` hiện tại.

---

### 6. Get All Predictions - Lấy danh sách prediction (có phân trang)

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions?page=0&size=10`
- **Headers:** *(nếu qua Gateway)*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON - `Page<PredictionResponseDto>`):**
  ```json
  {
    "content": [
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
    ],
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

### 7. Create Prediction - Thiếu customerId hoặc employeeId

**Request:**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/predictions`
- **Headers:**
  ```text
  Content-Type: application/json
  X-User-Id: {{employeeId}}
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```
- **Body (raw JSON - thiếu `customerId`):**
  ```json
  {
    "employeeId": "{{employeeId}}"
  }
  ```

**Expected Response:**
- **Status:** `400 Bad Request` (validation lỗi vì `@Valid` + DTO yêu cầu 2 field)

---

### 8. Get Prediction by ID - Prediction ID không tồn tại

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/00000000-0000-0000-0000-000000000000`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```

**Expected Response:**
- **Status:** `404 Not Found`
- **Body:** message "Prediction not found" (tuỳ implement service)

---

### 9. Get Prediction by ID - ID không hợp lệ (không phải UUID)

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/predictions/invalid-uuid`
- **Headers:**
  ```text
  X-User-Id: {{employeeId}}
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```

**Expected Response:**
- **Status:** `400 Bad Request`
- **Body (ví dụ Spring):**
  ```json
  {
    "status": 400,
    "error": "Bad Request",
    "message": "Failed to convert value of type 'java.lang.String' to required type 'java.util.UUID'"
  }
  ```

---

### 10. Access via Gateway - Thiếu Authorization token

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/api/predictions`
- **Headers:**
  ```text
  // Không gửi Authorization header
  ```

**Expected Response:**
- **Status:** `401 Unauthorized` (bị chặn bởi `JwtAuthenticationFilter` ở Gateway)

---

## Postman Collection Setup

### Tạo Collection Variables:

1. Tạo Collection mới: `PredictionService API`
2. Vào **Variables** tab, thêm các biến:
   - `baseUrl`:
     - `http://localhost:8007`
     - hoặc `http://localhost:8080/api/predictions` nếu qua Gateway
   - `accessToken`: (lấy từ IdentityService login response)
   - `predictionId`: (để trống, sẽ tự động set sau khi tạo prediction)
   - `customerId`: (gán sẵn 1 UUID có thật trong hệ thống)
   - `employeeId`: (gán sẵn 1 UUID user/staff)

### Test Flow:

1. **Login** (từ IdentityService) → Lấy `accessToken`
2. **Create Prediction** → Tạo bản ghi mới (tự động lưu `predictionId`)
3. **Get Prediction by ID** → Test endpoint `/{predictionId}`
4. **Get Predictions by Customer ID** → Test `/customer/{customerId}`
5. **Get Predictions by Employee ID** → Test `/employee/{employeeId}` và `/employee/me`
6. **Get All Predictions** → Test phân trang `/api/predictions?page=0&size=10`

### Tips:

- Header `X-User-Id` là bắt buộc cho các endpoint yêu cầu trong controller (dù hiện tại service chưa dùng giá trị này nhiều).
- Khi test qua API Gateway, cần thêm `Authorization: Bearer {{accessToken}}` vào tất cả requests.
- Có thể dùng thêm query param `sort` cho API list, ví dụ: `?page=0&size=10&sort=createdAt,desc`.

---

## API Endpoints Summary

| Method | Endpoint                              | Description                                          | Headers Required                                      |
|--------|---------------------------------------|------------------------------------------------------|-------------------------------------------------------|
| POST   | `/api/predictions`                   | Tạo yêu cầu prediction mới                           | `Content-Type`, `X-User-Id`, `Authorization` (Gateway)|
| GET    | `/api/predictions/{predictionId}`    | Lấy prediction theo ID                               | `X-User-Id`, `Authorization` (Gateway)               |
| GET    | `/api/predictions/customer/{id}`     | Lấy danh sách prediction theo customerId            | `X-User-Id`, `Authorization` (Gateway)               |
| GET    | `/api/predictions/employee/{id}`     | Lấy danh sách prediction theo employeeId            | `X-User-Id`, `Authorization` (Gateway)               |
| GET    | `/api/predictions/employee/me`       | Lấy danh sách prediction của nhân viên hiện tại     | `X-User-Id`, `Authorization` (Gateway)               |
| GET    | `/api/predictions`                   | Lấy danh sách prediction (paging)                    | `Authorization` (Gateway)                            |

