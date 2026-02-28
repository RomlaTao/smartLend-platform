## SmartLend Platform – Hệ thống cho vay thông minh (Backend)

SmartLend Platform là một hệ thống **quản lý cho vay** theo kiến trúc microservices, hỗ trợ:
- Xác thực & phân quyền người dùng (staff, admin, analyst).
- Quản lý hồ sơ khách hàng & dữ liệu tài chính.
- Dự đoán rủi ro vỡ nợ khoản vay bằng mô hình ML.
- Quản lý đơn xin vay, quyết định phê duyệt và giải ngân.

Backend được tách thành nhiều service độc lập, giao tiếp với nhau qua HTTP/RabbitMQ và được thiết kế để dễ mở rộng, giám sát và tích hợp với các hệ thống khác.

---

## Sơ đồ kiến trúc hệ thống

![Sơ đồ kiến trúc SmartLend](@img/image-5815a611-7caf-4a91-8f88-a0d808344502.png)

---

## Các service trong hệ thống

### 1. IdentityService – Dịch vụ định danh & xác thực

- **Chức năng chính:**
  - Đăng nhập/đăng ký/refresh/logout với JWT.
  - Quản lý user profile và phân quyền theo `Role` (`ADMIN`, `ANALYSTIC`, `STAFF`).
  - Cung cấp thông tin user/profile cho các dịch vụ khác (CustomerService, LoanManagementService, …).
- **Tài liệu chi tiết & ví dụ API:** xem `identityservice/README.md`  
  → [IdentityService README](identityservice/README.md)

---

### 2. CustomerService – Dịch vụ quản lý hồ sơ khách hàng

- **Chức năng chính:**
  - Lưu trữ và quản lý hồ sơ khách hàng (họ tên, thu nhập, tình trạng sở hữu nhà, lịch sử tín dụng, …).
  - Cung cấp thông tin khách hàng cho các service khác (PredictionService, LoanManagementService).
  - Hỗ trợ tạo nhiều khách hàng cùng lúc và tra cứu theo `customerId` / `customerSlug`.
- **Tài liệu chi tiết & ví dụ API:** xem `customerservice/README.md`  
  → [CustomerService README](customerservice/README.md)

---

### 3. PredictionService – Dịch vụ dự đoán rủi ro khoản vay

- **Chức năng chính:**
  - Nhận yêu cầu dự đoán rủi ro default của khoản vay từ nhân viên hoặc từ luồng loan.
  - Lưu lại kết quả prediction (`predictionResult`, `confidence`, `PredictionStatus`) để phục vụ tra cứu và báo cáo.
  - Giao tiếp với service ML (ml-model) và với LoanManagementService qua message/event.
- **Tài liệu chi tiết & ví dụ API:** xem `predictionservice/README.md`  
  → [PredictionService README](predictionservice/README.md)

---

### 4. LoanManagementService – Dịch vụ quản lý khoản vay

- **Chức năng chính:**
  - Tạo đơn xin vay dựa trên hồ sơ khách hàng và snapshot tài chính.
  - Gửi yêu cầu prediction sang PredictionService và nhận lại `predictionConfidence`, `loanGrade`.
  - Quản lý vòng đời đơn vay: `UNDER_REVIEW` → `APPROVED/REJECTED` → `DISBURSED`.
  - Quản lý giải ngân (`Disbursement`) và financial snapshots cho từng đơn.
- **Tài liệu chi tiết & ví dụ API:** xem `loanmanagementservice/README.md`  
  → [LoanManagementService README](loanmanagementservice/README.md)

---

### 5. ML Model Service (`ml-model`) – Dịch vụ mô hình máy học

- **Chức năng chính:**
  - Chứa và phục vụ mô hình ML dùng để dự đoán rủi ro vỡ nợ.
  - Nhận request từ PredictionService, trả về kết quả dự đoán (probability/label).
- **Tài liệu chi tiết:** xem `ml-model/README.md`  
  → [ml-model README](ml-model/README.md)

---

## Luồng tổng quan của hệ thống

1. **Nhân viên đăng nhập** qua IdentityService để lấy `accessToken` và `X-User-Id`.
2. **Tạo khách hàng** trong CustomerService (hoặc import hàng loạt).
3. **Tạo đơn xin vay** trong LoanManagementService, service sẽ:
   - Lấy dữ liệu profile từ CustomerService.
   - Lưu `FinancialSnapshot`.
   - Gửi yêu cầu prediction sang PredictionService.
4. **PredictionService** gọi mô hình ML (ml-model), lưu lại kết quả, trả về LoanManagementService.
5. **Nhân viên ra quyết định** (approve/reject) dựa trên thông tin hồ sơ + prediction.
6. Nếu **phê duyệt**, thực hiện **giải ngân** qua API Disbursement trong LoanManagementService.

Chi tiết payload, enum và ví dụ JSON cho từng bước có trong README của từng service con (link ở trên).

