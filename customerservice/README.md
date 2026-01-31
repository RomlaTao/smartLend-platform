# CustomerService - Customer Profile Management Service

## Base URL

- **Local:** `http://localhost:8006`
- **Via API Gateway:** `http://localhost:8080/api/customers`

---

## Postman Test Cases

### Environment Variables

Trong Postman, tạo các variables sau:
- `baseUrl`: 
  - `http://localhost:8006` (gọi trực tiếp service, dùng URL dạng `{{baseUrl}}/api/customers`)
  - hoặc `http://localhost:8080/api/customers` (nếu gọi qua API Gateway)
- `accessToken`: Access token từ IdentityService (bắt buộc khi gọi qua Gateway vì có `JwtAuthenticationFilter`)
- `customerId`: UUID của customer (sẽ được lưu sau khi tạo profile)
- `customerSlug`: slug của customer (sẽ được lưu sau khi tạo profile)

---

### 1. Create Customer - Tạo hồ sơ khách hàng

**Request:**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/customers` (nếu `baseUrl = http://localhost:8006`)  
  hoặc chỉ `{{baseUrl}}` nếu `baseUrl = http://localhost:8080/api/customers`
- **Headers:**
  ```text
  Content-Type: application/json
  ```
  *Nếu qua Gateway, thêm:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```
- **Body (raw JSON - `CustomerProfileRequestDto`):**
  ```json
  {
    "fullName": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    "personEmpLength": 3.5,
    "loanIntent": "PERSONAL",
    "loanGrade": "A",
    "loanAmnt": 10000.0,
    "loanIntRate": 12.5,
    "loanPercentIncome": 0.2,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 5
  }
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON - `CustomerProfileResponseDto`):**
  ```json
  {
    "customerProfileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "customerSlug": "nguyen-van-a-3fa85f64",
    "fullName": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    "personEmpLength": 3.5,
    "loanIntent": "PERSONAL",
    "loanGrade": "A",
    "loanAmnt": 10000.0,
    "loanIntRate": 12.5,
    "loanStatus": "PENDING",
    "loanPercentIncome": 0.2,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 5,
    "staffId": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
  ```

**Postman Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains customer profile", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('customerProfileId');
    pm.expect(jsonData).to.have.property('customerSlug');
    pm.expect(jsonData).to.have.property('fullName');
    pm.expect(jsonData).to.have.property('email');

    // Lưu customerId và customerSlug để dùng cho các request sau
    pm.collectionVariables.set("customerId", jsonData.customerProfileId);
    pm.collectionVariables.set("customerSlug", jsonData.customerSlug);
});
```

---

### 2. Create Customers in Bulk - Tạo nhiều hồ sơ cùng lúc

**Request:**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/customers/bulk` (hoặc chỉ `{{baseUrl}}/bulk` nếu `baseUrl = http://localhost:8080/api/customers`)
- **Headers:**
  ```text
  Content-Type: application/json
  ```
  *Nếu qua Gateway, thêm:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```
- **Body (raw JSON - List of `CustomerProfileRequestDto`):**
  ```json
  [
    {
      "fullName": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "personAge": 30,
      "personIncome": 50000.0,
      "personHomeOwnership": "RENT"
    },
    {
      "fullName": "Tran Thi B",
      "email": "tranthib@example.com",
      "personAge": 28,
      "personIncome": 40000.0,
      "personHomeOwnership": "MORTGAGE"
    }
  ]
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON Array):**
  ```json
  [
    {
      "customerProfileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "customerSlug": "nguyen-van-a-3fa85f64",
      "fullName": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "personAge": 30,
      "personIncome": 50000.0,
      "personHomeOwnership": "RENT"
    },
    {
      "customerProfileId": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
      "customerSlug": "tran-thi-b-4fa85f64",
      "fullName": "Tran Thi B",
      "email": "tranthib@example.com",
      "personAge": 28,
      "personIncome": 40000.0,
      "personHomeOwnership": "MORTGAGE"
    }
  ]
  ```

**Postman Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is an array of customer profiles", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
    pm.expect(jsonData[0]).to.have.property('customerProfileId');
    pm.expect(jsonData[0]).to.have.property('customerSlug');
});
```

---

### 3. Get Customer by Slug - Lấy hồ sơ theo Slug

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/customers/slug/{{customerSlug}}`
- **Headers:**
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON):**
  ```json
  {
    "customerProfileId": "{{customerId}}",
    "customerSlug": "{{customerSlug}}",
    "fullName": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    "loanStatus": "PENDING",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
  ```

**Postman Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response matches requested slug", function () {
    var jsonData = pm.response.json();
    var requestedSlug = pm.collectionVariables.get("customerSlug");
    pm.expect(jsonData.customerSlug).to.equal(requestedSlug);
});
```

---

### 4. Get Customer by ID - Lấy hồ sơ theo Customer ID

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/customers/id/{{customerId}}`
- **Headers:**
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON):**
  ```json
  {
    "customerProfileId": "{{customerId}}",
    "customerSlug": "{{customerSlug}}",
    "fullName": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT",
    "loanStatus": "PENDING",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
  ```

**Postman Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response matches requested customerId", function () {
    var jsonData = pm.response.json();
    var requestedId = pm.collectionVariables.get("customerId");
    pm.expect(jsonData.customerProfileId).to.equal(requestedId);
});
```

---

### 5. Get All Customers - Lấy danh sách khách hàng (có phân trang)

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/customers?page=0&size=10`
- **Headers:**
  *Nếu qua Gateway:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON - `Page<CustomerProfileResponseDto>`):**
  ```json
  {
    "content": [
      {
        "customerProfileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "customerSlug": "nguyen-van-a-3fa85f64",
        "fullName": "Nguyen Van A",
        "email": "nguyenvana@example.com",
        "personAge": 30,
        "personIncome": 50000.0,
        "personHomeOwnership": "RENT",
        "loanStatus": "PENDING",
        "createdAt": "2024-01-01T10:00:00",
        "updatedAt": "2024-01-01T10:00:00"
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

### 6. Update Customer - Cập nhật hồ sơ khách hàng

**Request:**
- **Method:** `PUT`
- **URL:** `{{baseUrl}}/api/customers/id/{{customerId}}`
- **Headers:**
  ```text
  Content-Type: application/json
  ```
  *Nếu qua Gateway, thêm:*
  ```text
  Authorization: Bearer {{accessToken}}
  ```
- **Body (raw JSON - `CustomerProfileRequestDto`):**
  ```json
  {
    "fullName": "Nguyen Van A Updated",
    "email": "nguyenvana.updated@example.com",
    "personAge": 31,
    "personIncome": 60000.0,
    "personHomeOwnership": "OWN",
    "personEmpLength": 4.5,
    "loanIntent": "PERSONAL",
    "loanGrade": "A",
    "loanAmnt": 12000.0,
    "loanIntRate": 13.0,
    "loanPercentIncome": 0.25,
    "cbPersonDefaultOnFile": "N",
    "cbPersonCredHistLength": 6
  }
  ```

**Expected Response:**
- **Status:** `200 OK`
- **Body (JSON):**
  ```json
  {
    "customerProfileId": "{{customerId}}",
    "customerSlug": "{{customerSlug}}",
    "fullName": "Nguyen Van A Updated",
    "email": "nguyenvana.updated@example.com",
    "personAge": 31,
    "personIncome": 60000.0,
    "personHomeOwnership": "OWN",
    "loanStatus": "PENDING",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T11:00:00"
  }
  ```

**Postman Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer updated successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.fullName).to.equal("Nguyen Van A Updated");
    pm.expect(jsonData.email).to.equal("nguyenvana.updated@example.com");
    pm.expect(jsonData.updatedAt).to.not.equal(jsonData.createdAt);
});
```

---

## Negative Test Cases

### 7. Create Customer - Thiếu trường bắt buộc

**Request:**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/customers`
- **Headers:**
  ```text
  Content-Type: application/json
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```
- **Body (raw JSON - thiếu `email`, `fullName`):**
  ```json
  {
    "personAge": 30,
    "personIncome": 50000.0,
    "personHomeOwnership": "RENT"
  }
  ```

**Expected Response:**
- **Status:** `400 Bad Request`

---

### 8. Get Customer by ID - Customer ID không tồn tại

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/customers/id/00000000-0000-0000-0000-000000000000`
- **Headers:**
  ```text
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```

**Expected Response:**
- **Status:** `404 Not Found`
- **Body (ví dụ):**
  ```json
  {
    "status": 404,
    "error": "Not Found",
    "message": "Customer profile not found for id: 00000000-0000-0000-0000-000000000000"
  }
  ```

**Postman Script:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});
```

---

### 9. Get Customer by ID - Customer ID không hợp lệ (không phải UUID)

**Request:**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/customers/id/invalid-uuid`
- **Headers:**
  ```text
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

### 10. Update Customer - Customer ID không tồn tại

**Request:**
- **Method:** `PUT`
- **URL:** `{{baseUrl}}/api/customers/id/00000000-0000-0000-0000-000000000000`
- **Headers:**
  ```text
  Content-Type: application/json
  Authorization: Bearer {{accessToken}}   // nếu qua Gateway
  ```
- **Body (raw JSON):**
  ```json
  {
    "fullName": "Updated Name",
    "email": "updated@example.com",
    "personAge": 40,
    "personIncome": 70000.0,
    "personHomeOwnership": "RENT"
  }
  ```

**Expected Response:**
- **Status:** `404 Not Found`

---

### 11. Access via Gateway - Thiếu Authorization token

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/api/customers`
- **Headers:**
  ```text
  // Không gửi Authorization header
  ```

**Expected Response:**
- **Status:** `401 Unauthorized`
- **Body (ví dụ):**
  ```json
  {
    "status": 401,
    "error": "Unauthorized",
    "message": "Full authentication is required to access this resource"
  }
  ```

---

## Postman Collection Setup

### Tạo Collection Variables:

1. Tạo Collection mới: `CustomerService API`
2. Vào **Variables** tab, thêm các biến:
   - `baseUrl`: 
     - `http://localhost:8006`
     - hoặc `http://localhost:8080/api/customers` nếu qua Gateway
   - `accessToken`: (lấy từ IdentityService login response)
   - `customerId`: (để trống, sẽ tự động set sau khi tạo customer)
   - `customerSlug`: (để trống, sẽ tự động set sau khi tạo customer)

### Test Flow:

1. **Login** (từ IdentityService) → Lấy `accessToken`
2. **Create Customer** → Tạo customer mới (tự động lưu `customerId`, `customerSlug`)
3. **Get Customer by Slug** → Test endpoint `/slug/{customerSlug}`
4. **Get Customer by ID** → Test lấy profile theo `customerId`
5. **Get All Customers** → Test lấy danh sách tất cả customers (có paging)
6. **Update Customer** → Test cập nhật hồ sơ khách hàng

### Tips:

- Sau khi **Create Customer**, `customerId` và `customerSlug` sẽ tự động được lưu vào collection variables.
- Khi test qua API Gateway, cần thêm `Authorization: Bearer {{accessToken}}` vào tất cả requests.
- Có thể dùng thêm query param `sort` cho API list, ví dụ: `?page=0&size=10&sort=createdAt,desc`.

---

## API Endpoints Summary

| Method | Endpoint                      | Description                               | Headers Required                          |
|--------|-------------------------------|-------------------------------------------|-------------------------------------------|
| POST   | `/api/customers`             | Tạo hồ sơ khách hàng mới                  | `Content-Type`, `Authorization` (Gateway) |
| POST   | `/api/customers/bulk`        | Tạo nhiều hồ sơ khách hàng cùng lúc       | `Content-Type`, `Authorization` (Gateway) |
| GET    | `/api/customers/slug/{slug}` | Lấy hồ sơ khách hàng theo slug            | `Authorization` (Gateway)                 |
| GET    | `/api/customers/id/{id}`     | Lấy hồ sơ khách hàng theo customer ID     | `Authorization` (Gateway)                 |
| GET    | `/api/customers`             | Lấy danh sách hồ sơ khách hàng (paging)   | `Authorization` (Gateway)                 |
| PUT    | `/api/customers/id/{id}`     | Cập nhật hồ sơ khách hàng theo customer ID| `Content-Type`, `Authorization` (Gateway) |

## Customer Service API Testcases

### 1. Create single customer
- **Method**: POST  
- **URL**: `/api/customers`  
- **Request body** (`CustomerProfileRequestDto` – ví dụ):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "0123456789",
  "annualIncome": 50000,
  "loanAmount": 10000,
  "loanIntent": "PERSONAL",
  "homeOwnership": "RENT",
  "loanGrade": "A"
}
```

- **Testcases (happy path)**:
  - **TC-Create-01**: Body hợp lệ → trả về `200 OK`, response chứa `id`, `customerSlug`, các field giống request.
  - **TC-Create-02**: Trùng email (nếu service có ràng buộc unique) → kỳ vọng lỗi business (ví dụ `400 Bad Request` hoặc `409 Conflict` tùy implement).

- **Testcases (validation/negative)**:
  - **TC-Create-03**: Thiếu trường bắt buộc (vd `email` null) → trả về lỗi validation (4xx).
  - **TC-Create-04**: `annualIncome` âm hoặc `loanAmount` <= 0 → trả về lỗi.

---

### 2. Create customers in bulk
- **Method**: POST  
- **URL**: `/api/customers/bulk`  
- **Request body**: `List<CustomerProfileRequestDto>` – ví dụ 2 phần tử.

- **Testcases (happy path)**:
  - **TC-Bulk-01**: Danh sách 2–3 customer hợp lệ → trả về `200 OK`, response là mảng với cùng số phần tử, mỗi phần tử có `id`, `customerSlug`.

- **Testcases (validation/negative)**:
  - **TC-Bulk-02**: Một phần tử invalid (thiếu email) → xác định behaviour: toàn bộ batch fail hay bỏ qua record lỗi. Kỳ vọng theo thiết kế hiện tại.
  - **TC-Bulk-03**: Danh sách rỗng `[]` → trả về `400 Bad Request` hoặc `200 OK` với mảng rỗng (tùy implement, cần clarify).

---

### 3. Get customer by slug
- **Method**: GET  
- **URL**: `/api/customers/slug/{customerSlug}`

- **Testcases (happy path)**:
  - **TC-GetSlug-01**: `customerSlug` tồn tại → `200 OK`, body là `CustomerProfileResponseDto` đúng với dữ liệu DB.

- **Testcases (negative)**:
  - **TC-GetSlug-02**: `customerSlug` không tồn tại → `404 Not Found` (nếu service ném `ResourceNotFoundException`).

---

### 4. Get customer by id
- **Method**: GET  
- **URL**: `/api/customers/id/{customerId}`  
- **Path variable**: `customerId` kiểu UUID.

- **Testcases (happy path)**:
  - **TC-GetId-01**: `customerId` hợp lệ và tồn tại → `200 OK`, body đúng với DB.

- **Testcases (negative)**:
  - **TC-GetId-02**: `customerId` hợp lệ nhưng không tồn tại → `404 Not Found`.
  - **TC-GetId-03**: `customerId` không phải UUID hợp lệ → `400 Bad Request` (Spring không parse được path variable).

---

### 5. Get all customers (paging)
- **Method**: GET  
- **URL**: `/api/customers`  
- **Query params** (Spring `Pageable`): `page`, `size`, `sort` (vd `sort=createdAt,desc` nếu entity có field này).

- **Testcases (happy path)**:
  - **TC-List-01**: Gọi không query param → dùng default pageable, trả về `200 OK`, `content` là mảng `CustomerProfileResponseDto`, có `totalElements`, `totalPages`.
  - **TC-List-02**: `page=0&size=10` → trả về tối đa 10 record, `size` trong response bằng 10.

- **Testcases (negative/boundary)**:
  - **TC-List-03**: `size` quá lớn (vd 1000) → system có giới hạn hay không, kỳ vọng theo cấu hình (có thể bị override thành max size).
  - **TC-List-04**: `page` âm (`page=-1`) → `400 Bad Request`.

---

### 6. Update customer by id
- **Method**: PUT  
- **URL**: `/api/customers/id/{customerId}`  
- **Path variable**: `customerId` UUID  
- **Request body**: `CustomerProfileRequestDto` (các field cần update).

- **Testcases (happy path)**:
  - **TC-Update-01**: `customerId` tồn tại + body hợp lệ → `200 OK`, response có field đã được cập nhật.

- **Testcases (negative)**:
  - **TC-Update-02**: `customerId` không tồn tại → `404 Not Found`.
  - **TC-Update-03**: Body invalid (vd `loanAmount` < 0) → 4xx error (validation/business).
  - **TC-Update-04**: `customerId` không phải UUID hợp lệ → `400 Bad Request`.

---

### Gợi ý cách implement test (Spring Boot)
- **Integration test**: sử dụng `@SpringBootTest` + `TestRestTemplate` hoặc `MockMvc` để verify status code, body, và tương tác DB thật (hoặc H2 in-memory).
- **Unit test service layer**: mock `CustomerProfileRepository` và các publisher để kiểm tra logic trong `CustomerProfileServiceImpl`.

---

### Chi tiết field dùng trong test

- **Request DTO** `CustomerProfileRequestDto` (dùng cho `POST /api/customers`, `POST /api/customers/bulk`, `PUT /api/customers/id/{customerId}`):
  - `customerProfileId` (UUID, optional – khi create thường để null, khi update có thể bỏ qua hoặc trùng với path id)
  - `customerSlug` (String, optional – slug, thường được generate từ `fullName`)
  - `fullName` (String, required – họ tên đầy đủ khách hàng)
  - `email` (String, required, unique – dùng để kiểm tra constraint trùng email)
  - `personAge` (Integer, required – tuổi, testcase boundary: <18, 18, 60, >60, âm)
  - `personIncome` (Double, required – thu nhập, testcase boundary: 0, >0, <0)
  - `personHomeOwnership` (Enum `HomeOwnership`, required – ví dụ: `RENT`, `MORTGAGE`, `OWN`)
  - `personEmpLength` (Double, optional – số năm đi làm, testcase: null, 0, >0, giá trị rất lớn)
  - `loanIntent` (Enum `LoanIntent`, optional – ví dụ: `PERSONAL`, `EDUCATION`, `MEDICAL`, ...)
  - `loanGrade` (Enum `LoanGrade`, optional – ví dụ: `A`, `B`, `C`, ...)
  - `loanAmnt` (Double, optional – số tiền vay, testcase: null, 0, >0, <0)
  - `loanIntRate` (Double, optional – lãi suất % năm, testcase: null, 0, >0, rất lớn)
  - `loanPercentIncome` (Double, optional – tỉ lệ khoản vay so với thu nhập, testcase: null, 0–1, >1)
  - `cbPersonDefaultOnFile` (String, optional – flag từ credit bureau, ví dụ `Y`/`N`)
  - `cbPersonCredHistLength` (Integer, optional – số năm lịch sử tín dụng, testcase: null, 0, >0)

- **Response DTO** `CustomerProfileResponseDto` (trả về ở tất cả API `GET`, `POST`, `PUT`):
  - `customerProfileId` (UUID – luôn có sau khi create)
  - `customerSlug` (String – slug duy nhất, dùng cho API `/slug/{customerSlug}`)
  - `fullName` (String)
  - `email` (String)
  - `personAge` (Integer)
  - `personIncome` (Double)
  - `personHomeOwnership` (Enum `HomeOwnership`)
  - `personEmpLength` (Double hoặc null)
  - `loanIntent` (Enum `LoanIntent` hoặc null)
  - `loanGrade` (Enum `LoanGrade` hoặc null)
  - `loanAmnt` (Double hoặc null)
  - `loanIntRate` (Double hoặc null)
  - `loanStatus` (Enum `LoanStatus` – dùng cho testcase kiểm tra trạng thái khoản vay)
  - `loanPercentIncome` (Double hoặc null)
  - `cbPersonDefaultOnFile` (String hoặc null)
  - `cbPersonCredHistLength` (Integer hoặc null)
  - `staffId` (UUID hoặc null – người phụ trách hồ sơ)
  - `createdAt` (LocalDateTime – dùng assert không null, sort theo thời gian)
  - `updatedAt` (LocalDateTime – dùng assert sau khi update phải khác/ lớn hơn `createdAt`)

- **Gợi ý mapping field vào testcase**:
  - **Test create/update**: assert từng field request vs response (`fullName`, `email`, `personAge`, ...),
    thêm assert `customerProfileId`/`customerSlug`/`createdAt`/`updatedAt` không null.
  - **Test get by id/slug**: chuẩn bị dữ liệu trước (qua create hoặc seed DB), sau đó so sánh toàn bộ field trong response với dữ liệu gốc.
  - **Test list (paging)**: lấy 1 phần tử trong `content` và verify đủ tất cả field `CustomerProfileResponseDto` như trên.
