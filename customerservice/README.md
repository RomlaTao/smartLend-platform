## CustomerService – Dịch vụ quản lý hồ sơ khách hàng

CustomerService chịu trách nhiệm **lưu trữ và quản lý hồ sơ khách hàng** cho hệ thống SmartLend, bao gồm:
- Tạo/cập nhật hồ sơ khách hàng.
- Lấy hồ sơ theo `customerId` hoặc `customerSlug`.
- Lấy danh sách khách hàng có phân trang.
- Ghi nhận thông tin nhân viên (`staffId`) đang xử lý hồ sơ.

### Base URL

- **Local trực tiếp service:** `http://localhost:8006`
- **Qua API Gateway:** `http://localhost:8080/api/customers`

Khi gọi trực tiếp service, prefix chuẩn là: `/api/customers`.  
Khi gọi qua Gateway, bạn có thể dùng luôn `http://localhost:8080/api/customers` làm base URL.

---

## 1. Ghi chú chung

- **Header định danh nhân viên xử lý hồ sơ**
  - `X-User-Id: <UUID>` – bắt buộc cho các API tạo/cập nhật (create, bulk create, update) để gán `staffId`.
- **Xác thực qua Gateway**
  - Khi đi qua API Gateway có filter JWT, cần thêm:
    - `Authorization: Bearer <accessToken>` – token lấy từ IdentityService.
- **Kiểu dữ liệu enum**
  - `personHomeOwnership`: dùng enum `HomeOwnership` (ví dụ: `"RENT"`, `"MORTGAGE"`, `"OWN"`).
  - `loanGrade`: dùng enum `LoanGrade` (ví dụ: `"A"`, `"B"`, `"C"`, ...).

---

## 2. DTO chính

### 2.1. `CustomerProfileRequestDto` (request body)

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
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5,
  "staffId": "11111111-2222-3333-4444-555555555555"
}
```

> Trong thực tế **khi tạo mới**, thường chỉ cần gửi các field nghiệp vụ chính (`fullName`, `email`, `personAge`, `personIncome`, `personHomeOwnership`, …).  
> `customerProfileId`, `customerSlug`, `staffId` sẽ được set hoặc override bởi backend.

### 2.2. `CustomerProfileResponseDto` (response body)

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
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5,
  "staffId": "11111111-2222-3333-4444-555555555555",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

### 2.3. `PageResponse<CustomerProfileResponseDto>` (kết quả phân trang)

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
      "personEmpLength": 3.5,
      "loanGrade": "A",
      "cbPersonDefaultOnFile": "N",
      "cbPersonCredHistLength": 5,
      "staffId": "11111111-2222-3333-4444-555555555555",
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "number": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

---

## 3. Nhóm API Customer Profile (`/api/customers`)

### 3.1. Tạo hồ sơ khách hàng – Create customer

- **Method:** `POST`
- **URL (trực tiếp service):** `http://localhost:8006/api/customers`
- **URL (qua Gateway):** `http://localhost:8080/api/customers`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>` (bắt buộc)
  - *(Nếu qua Gateway)* `Authorization: Bearer <accessToken>`
- **Request body** – `CustomerProfileRequestDto` (ví dụ tối thiểu):

```json
{
  "fullName": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "personAge": 30,
  "personIncome": 50000.0,
  "personHomeOwnership": "RENT",
  "personEmpLength": 3.5,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5
}
```

- **Response body** – `CustomerProfileResponseDto` (200 OK):

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
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5,
  "staffId": "11111111-2222-3333-4444-555555555555",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### 3.2. Tạo nhiều hồ sơ khách hàng – Bulk create customers

- **Method:** `POST`
- **URL:** `/api/customers/bulk`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>` (bắt buộc)
  - *(Nếu qua Gateway)* `Authorization: Bearer <accessToken>`
- **Request body** – danh sách `CustomerProfileRequestDto`:

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

- **Response body** – `List<CustomerProfileResponseDto>`:

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

---

### 3.3. Lấy hồ sơ theo slug – Get customer by slug

- **Method:** `GET`
- **URL:** `/api/customers/slug/{customerSlug}`
- **Path variable:**
  - `customerSlug`: slug duy nhất của khách hàng, ví dụ: `"nguyen-van-a-3fa85f64"`
- **Headers (nếu qua Gateway):**
  - `Authorization: Bearer <accessToken>`
- **Response body** – `CustomerProfileResponseDto`:

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
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 5,
  "staffId": "11111111-2222-3333-4444-555555555555",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### 3.4. Lấy hồ sơ theo ID – Get customer by id

- **Method:** `GET`
- **URL:** `/api/customers/id/{customerId}`
- **Path variable:**
  - `customerId`: UUID của hồ sơ khách hàng, ví dụ: `3fa85f64-5717-4562-b3fc-2c963f66afa6`
- **Headers (nếu qua Gateway):**
  - `Authorization: Bearer <accessToken>`
- **Response body:** `CustomerProfileResponseDto` như trên.

---

### 3.5. Lấy danh sách khách hàng (có phân trang) – Get all customers

- **Method:** `GET`
- **URL:** `/api/customers`
- **Query params (Spring `Pageable`):**
  - `page` – số trang (bắt đầu từ 0), ví dụ: `0`
  - `size` – số bản ghi mỗi trang, ví dụ: `10`
- **Headers (nếu qua Gateway):**
  - `Authorization: Bearer <accessToken>`
- **Response body** – `PageResponse<CustomerProfileResponseDto>`:

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
      "personEmpLength": 3.5,
      "loanGrade": "A",
      "cbPersonDefaultOnFile": "N",
      "cbPersonCredHistLength": 5,
      "staffId": "11111111-2222-3333-4444-555555555555",
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "number": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

---

### 3.6. Cập nhật hồ sơ khách hàng – Update customer by id

- **Method:** `PUT`
- **URL:** `/api/customers/id/{customerId}`
- **Path variable:**
  - `customerId`: UUID hồ sơ cần cập nhật.
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID nhân viên>` (bắt buộc, dùng để log/ghi nhận `staffId`)
  - *(Nếu qua Gateway)* `Authorization: Bearer <accessToken>`
- **Request body** – `CustomerProfileRequestDto` (các field muốn cập nhật):

```json
{
  "fullName": "Nguyen Van A Updated",
  "email": "nguyenvana.updated@example.com",
  "personAge": 31,
  "personIncome": 60000.0,
  "personHomeOwnership": "OWN",
  "personEmpLength": 4.5,
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 6
}
```

- **Response body** – `CustomerProfileResponseDto` sau cập nhật:

```json
{
  "customerProfileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerSlug": "nguyen-van-a-3fa85f64",
  "fullName": "Nguyen Van A Updated",
  "email": "nguyenvana.updated@example.com",
  "personAge": 31,
  "personIncome": 60000.0,
  "personHomeOwnership": "OWN",
  "personEmpLength": 4.5,
  "loanGrade": "A",
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 6,
  "staffId": "11111111-2222-3333-4444-555555555555",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T11:00:00"
}
```

---

## 4. Error response mẫu

Các lỗi chung được chuẩn hóa qua `ErrorResponse`:

```json
{
  "timestamp": "2024-01-01T10:05:00",
  "status": 404,
  "error": "Not Found",
  "message": "Customer profile not found for id: 00000000-0000-0000-0000-000000000000",
  "path": "/api/customers/id/00000000-0000-0000-0000-000000000000"
}
```

Một số tình huống thường gặp:
- **400 Bad Request**: dữ liệu không đúng định dạng (UUID sai, field bắt buộc missing, …).
- **404 Not Found**: không tìm thấy hồ sơ khách hàng theo `id` hoặc `slug`.
- **401 / 403** (khi gọi qua Gateway): không có token hoặc không đủ quyền truy cập.

---

## 5. Tóm tắt endpoint

| Method | Endpoint                      | Mô tả                                          |
|--------|-------------------------------|-----------------------------------------------|
| POST   | `/api/customers`             | Tạo mới hồ sơ khách hàng                      |
| POST   | `/api/customers/bulk`        | Tạo nhiều hồ sơ khách hàng cùng lúc           |
| GET    | `/api/customers/slug/{slug}` | Lấy hồ sơ khách hàng theo `customerSlug`      |
| GET    | `/api/customers/id/{id}`     | Lấy hồ sơ khách hàng theo `customerId`        |
| GET    | `/api/customers`             | Lấy danh sách hồ sơ khách hàng (có phân trang)|
| PUT    | `/api/customers/id/{id}`     | Cập nhật hồ sơ khách hàng theo `customerId`   |
