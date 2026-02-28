# IdentityService

Service chịu trách nhiệm **xác thực người dùng (authentication)**, **cấp/refresh/thu hồi JWT** và **quản lý hồ sơ người dùng (user profile)** cho hệ thống SmartLend.

- **Base URL mặc định (dev):** `http://localhost:8005`
- **Prefix API chính:**
  - ` /api/auth` – các API đăng nhập, đăng ký, refresh, logout
  - ` /api/users-profiles` – các API đọc/cập nhật hồ sơ người dùng

---

## 1. Chức năng chính

- **Xác thực & cấp token**
  - Đăng nhập với email/password và nhận `accessToken` + `refreshToken`
  - Làm mới access token dựa trên refresh token (token rotation + blacklist)
  - Đăng xuất, blacklist cả access token và refresh token

- **Quản lý tài khoản & phân quyền**
  - ADMIN tạo user mới với role: `ADMIN`, `ANALYSTIC`, `STAFF`
  - Lưu thông tin login lần đầu (`firstLogin`)

- **Quản lý hồ sơ người dùng (User Profile)**
  - Lấy/cập nhật profile hiện tại theo `X-User-Id`
  - Lấy/cập nhật profile theo `userId` (ADMIN)
  - Lấy profile theo `userSlug`
  - Lấy danh sách user profile phân trang (ADMIN)

---

## 2. Ghi chú chung khi gọi API

- **Header Authorization (JWT):**
  - `Authorization: Bearer <accessToken>` – bắt buộc với các API yêu cầu xác thực/role.
- **Header nhận diện user hiện tại:**
  - `X-User-Id: <UUID>` – dùng cho các API `/me` trong `UserProfileController`.
- **Định dạng ngày:**
  - `hireDate`: chuỗi `YYYY-MM-DD`, ví dụ: `"2024-01-15"`.

---

## 3. Nhóm API Authentication (`/api/auth`)

### 3.1. Đăng nhập – Login

- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth:** Public (không cần token)
- **Headers:**
  - `Content-Type: application/json`
- **Request body** – `LoginRequestDto`:

```json
{
  "email": "admin@example.com",
  "password": "admin"
}
```

- **Response body** – `LoginResponseDto` (200 OK):

```json
{
  "userId": "7b7a3b7c-0d6b-4e1f-9d1b-9a1c2b3d4e5f",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "email": "admin@example.com",
  "role": "ADMIN",
  "firstLogin": true
}
```

### 3.2. Làm mới token – Refresh token

- **Method:** `POST`
- **URL:** `/api/auth/refresh`
- **Auth:** Public (chỉ cần refresh token hợp lệ)
- **Headers:**
  - `Content-Type: application/json`
- **Request body** – `RefreshTokenRequestDto`:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **Response body** – `RefreshTokenResponseDto` (200 OK):

```json
{
  "newAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newRefreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3.3. Đăng ký tài khoản – Signup (ADMIN)

- **Method:** `POST`
- **URL:** `/api/auth/signup`
- **Auth:** Chỉ `ADMIN`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Request body** – `SignupRequestDto`:

```json
{
  "email": "staff1@example.com",
  "fullName": "Staff One",
  "password": "password123",
  "passwordConfirm": "password123",
  "role": "STAFF"
}
```

- **Response:**
  - `200 OK` – body rỗng (tạo user thành công; profile mặc định được tạo kèm theo)
  - `400/409` – khi email trùng, password không khớp, v.v. (xem `GlobalExceptionHandler`)

### 3.4. Đăng xuất – Logout

- **Method:** `POST`
- **URL:** `/api/auth/logout`
- **Auth:** Bắt buộc access token
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Request body** – `LogoutRequestDto`:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **Response:**
  - `200 OK` – body rỗng; access token và refresh token bị blacklist và xóa khỏi Redis.

---

## 4. Nhóm API User Profile (`/api/users-profiles`)

### 4.1. Lấy profile hiện tại – Get current profile

- **Method:** `GET`
- **URL:** `/api/users-profiles/me`
- **Headers:**
  - `X-User-Id: <UUID>`
- **Response body** – `UserProfileResponseDto` (200 OK):

```json
{
  "userId": "7b7a3b7c-0d6b-4e1f-9d1b-9a1c2b3d4e5f",
  "userSlug": "admin",
  "fullName": "System Admin",
  "email": "admin@example.com",
  "role": "ADMIN",
  "department": "IT",
  "position": "Administrator",
  "hireDate": "2024-01-01",
  "phoneNumber": "0901234567",
  "address": "123 Main St",
  "isActive": true,
  "createdAt": "2024-01-01T09:00:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

### 4.2. Lấy profile theo userId – Get profile by ID

- **Method:** `GET`
- **URL:** `/api/users-profiles/id/{userId}`
- **Path variable:**
  - `userId`: UUID của user
- **Headers:** (tùy config bảo mật có thể yêu cầu `Authorization: Bearer <accessToken>`)
- **Response body:** như `UserProfileResponseDto` ở trên.

### 4.3. Lấy profile theo slug – Get profile by slug

- **Method:** `GET`
- **URL:** `/api/users-profiles/slug/{userSlug}`
- **Path variable:**
  - `userSlug`: slug của user, ví dụ `"john-doe"`
- **Response body:** như `UserProfileResponseDto` ở trên.

### 4.4. Lấy danh sách profile – Get all users (ADMIN, có phân trang)

- **Method:** `GET`
- **URL:** `/api/users-profiles/all`
- **Auth:** Chỉ `ADMIN`
- **Query params:**
  - `page` (optional, default `0`)
  - `size` (optional, default `10`)
- **Response body** – `PageResponse<UserProfileResponseDto>`:

```json
{
  "content": [
    {
      "userId": "7b7a3b7c-0d6b-4e1f-9d1b-9a1c2b3d4e5f",
      "userSlug": "admin",
      "fullName": "System Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "department": "IT",
      "position": "Administrator",
      "hireDate": "2024-01-01",
      "phoneNumber": "0901234567",
      "address": "123 Main St",
      "isActive": true,
      "createdAt": "2024-01-01T09:00:00",
      "updatedAt": "2024-01-15T10:30:00"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

### 4.5. Cập nhật profile hiện tại – Update current profile

- **Method:** `PUT`
- **URL:** `/api/users-profiles/me`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: <UUID>`
- **Request body** – `UserProfileRequestDto` (có thể gửi một phần trường cần cập nhật):

```json
{
  "userSlug": "john-doe",
  "fullName": "John Doe Updated",
  "email": "john.updated@example.com",
  "department": "Sales",
  "position": "Senior Staff",
  "hireDate": "2024-01-15",
  "phoneNumber": "0901234567",
  "address": "456 New St",
  "isActive": true
}
```

- **Response body** – `UserProfileResponseDto` sau khi cập nhật.

### 4.6. Cập nhật profile theo userId – Update profile by ID (ADMIN)

- **Method:** `PUT`
- **URL:** `/api/users-profiles/id/{userId}`
- **Auth:** Chỉ `ADMIN`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Path variable:**
  - `userId`: UUID user cần cập nhật
- **Request body** – `UserProfileRequestDto`:

```json
{
  "userSlug": "staff-one",
  "fullName": "Staff One",
  "email": "staff1@example.com",
  "department": "IT",
  "position": "Analyst",
  "hireDate": "2024-06-01",
  "phoneNumber": "0912345678",
  "address": "789 Office Rd",
  "isActive": true
}
```

- **Response body** – `UserProfileResponseDto` sau khi cập nhật.

---