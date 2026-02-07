# IdentityService – Test mẫu Postman

Service xác thực (login, signup, refresh, logout) và quản lý user profile. Base URL mặc định: `http://localhost:8005`.

---

## 1. Environment Postman

Tạo Environment (ví dụ: `SmartLend - Identity`) với các biến:

| Biến | Ví dụ | Ghi chú |
|------|--------|---------|
| `base_url_identity` | `http://localhost:8005` | Base URL IdentityService |
| `access_token` | (để trống) | Gán sau **Login**; dùng cho header `Authorization: Bearer {{access_token}}` |
| `refresh_token` | (để trống) | Gán sau **Login**; dùng cho Refresh / Logout |
| `user_id` | (để trống) | UUID user (lấy từ response Login); dùng cho header `X-User-Id` khi gọi `/me` |
| `user_slug` | (để trống) | Slug profile (lấy từ response Get profile); dùng cho GET by slug |

**Role (signup):** `ADMIN`, `ANALYSTIC`, `STAFF`.

---

## 2. Collection – Authentication (`/api/auth`)

### 2.1. Login (public – không cần token)

- **Method:** `POST`
- **URL:** `{{base_url_identity}}/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON)** – `LoginRequestDto`:

```json
{
  "email": "admin@example.com",
  "password": "admin"
}
```

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has accessToken, refreshToken, userId", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("accessToken");
    pm.expect(json).to.have.property("refreshToken");
    pm.expect(json).to.have.property("userId");
});

pm.test("Save tokens and user_id", function () {
    const json = pm.response.json();
    pm.environment.set("access_token", json.accessToken);
    pm.environment.set("refresh_token", json.refreshToken);
    pm.environment.set("user_id", json.userId);
});
```

---

### 2.2. Refresh Token (public)

- **Method:** `POST`
- **URL:** `{{base_url_identity}}/api/auth/refresh`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON)** – `RefreshTokenRequestDto`:

```json
{
  "refreshToken": "{{refresh_token}}"
}
```

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has newAccessToken, newRefreshToken", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("newAccessToken");
    pm.expect(json).to.have.property("newRefreshToken");
});

pm.test("Save new tokens", function () {
    const json = pm.response.json();
    pm.environment.set("access_token", json.newAccessToken);
    pm.environment.set("refresh_token", json.newRefreshToken);
});
```

---

### 2.3. Signup (chỉ ADMIN – cần Bearer token)

- **Method:** `POST`
- **URL:** `{{base_url_identity}}/api/auth/signup`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{access_token}}`
- **Body (raw JSON)** – `SignupRequestDto`:

```json
{
  "email": "staff1@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "role": "STAFF"
}
```

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response body indicates success", function () {
    const text = pm.response.text();
    pm.expect(text.toLowerCase()).to.include("success");
});
```

---

### 2.4. Logout (cần Bearer token)

- **Method:** `POST`
- **URL:** `{{base_url_identity}}/api/auth/logout`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{access_token}}`
- **Body (raw JSON)** – `LogoutRequestDto`:

```json
{
  "refreshToken": "{{refresh_token}}"
}
```

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

---

## 3. Collection – User profiles (`/api/users-profiles`)

Các request `/me` bắt buộc header `X-User-Id: {{user_id}}` (UUID của user đang đăng nhập). Có thể kèm `Authorization: Bearer {{access_token}}` nếu backend yêu cầu JWT.

### 3.1. Create profile (POST /me)

- **Method:** `POST`
- **URL:** `{{base_url_identity}}/api/users-profiles/me`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: {{user_id}}`
- **Body (raw JSON)** – `UserProfileRequestDto` (các field optional tùy validation backend):

```json
{
  "userSlug": "john-doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "department": "Sales",
  "position": "Staff",
  "hireDate": "2024-01-15",
  "phoneNumber": "0901234567",
  "address": "123 Main St",
  "isActive": true
}
```

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userId, userSlug, fullName", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userId");
    pm.expect(json).to.have.property("userSlug");
    pm.expect(json).to.have.property("fullName");
});

pm.test("Save user_slug", function () {
    const json = pm.response.json();
    if (json.userSlug) pm.environment.set("user_slug", json.userSlug);
});
```

---

### 3.2. Get current profile (GET /me)

- **Method:** `GET`
- **URL:** `{{base_url_identity}}/api/users-profiles/me`
- **Headers:** `X-User-Id: {{user_id}}`

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userId, userSlug, fullName, email", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userId");
    pm.expect(json).to.have.property("fullName");
});
```

---

### 3.3. Get profile by user ID (GET /id/{userId})

- **Method:** `GET`
- **URL:** `{{base_url_identity}}/api/users-profiles/id/{{user_id}}`
- **Headers:** `Authorization: Bearer {{access_token}}` (nếu backend yêu cầu)

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userId, fullName", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userId");
    pm.expect(json).to.have.property("fullName");
});
```

---

### 3.4. Get profile by slug (GET /slug/{userSlug})

- **Method:** `GET`
- **URL:** `{{base_url_identity}}/api/users-profiles/slug/{{user_slug}}`

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userSlug, fullName", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userSlug");
    pm.expect(json).to.have.property("fullName");
});
```

---

### 3.5. Update current profile (PUT /me)

- **Method:** `PUT`
- **URL:** `{{base_url_identity}}/api/users-profiles/me`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: {{user_id}}`
- **Body (raw JSON)** – `UserProfileRequestDto` (chỉ gửi field cần cập nhật hoặc đủ object):

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

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userId, fullName", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userId");
    pm.expect(json).to.have.property("fullName");
});
```

---

### 3.6. Update profile by ID (PUT /id/{userId}) – ADMIN only

- **Method:** `PUT`
- **URL:** `{{base_url_identity}}/api/users-profiles/id/{{user_id}}`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{access_token}}`
- **Body (raw JSON)** – `UserProfileRequestDto`:

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

- **Tests:**

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has userId, fullName", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("userId");
    pm.expect(json).to.have.property("fullName");
});
```

---

## 4. Thứ tự chạy gợi ý

1. **Login** → lưu `access_token`, `refresh_token`, `user_id`.
2. **Create profile (POST /me)** hoặc **Get current profile (GET /me)** → có thể lưu `user_slug`.
3. **Get by id**, **Get by slug**, **Update (PUT /me)** tùy nhu cầu.
4. **Refresh** khi access token hết hạn (dùng `refresh_token`).
5. **Signup** chỉ khi đã login bằng tài khoản ADMIN.
6. **Logout** khi cần invalidation refresh token.

**Lưu ý:** User mặc định (admin): `admin@example.com` / `admin` (xem `application.properties`). Dùng để login lấy token trước khi gọi Signup hoặc các API cần ADMIN.
