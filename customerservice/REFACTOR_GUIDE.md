# Refactor Guide: CustomerProfile - Option 1

## Mục tiêu
Tách biệt trách nhiệm giữa CustomerService và LoanManagementService:
- **CustomerProfile**: Giữ thông tin cá nhân + loan info cơ bản (cho prediction)
- **LoanManagement**: Quản lý loan applications, prediction results, và loan status

---

## 1. CustomerProfile - Cần giữ gì?

### ✅ GIỮ LẠI (Personal Information)
```java
- customerProfileId
- customerSlug
- fullName
- email
- personAge
- personIncome
- personHomeOwnership
- personEmpLength
- cbPersonDefaultOnFile
- cbPersonCredHistLength
- staffId
- createdAt, updatedAt
```

### ✅ GIỮ LẠI (Loan Info cơ bản - cho prediction)
```java
- loanIntent        // Mục đích vay
- loanAmnt          // Số tiền vay
- loanIntRate       // Lãi suất
- loanPercentIncome // Tỷ lệ: loanAmnt / personIncome
```

### ❌ XÓA (Chuyển sang LoanManagement)
```java
- loanStatus        // → Chuyển sang Loan entity trong LoanManagement
- loanGrade         // → Có thể tính từ prediction hoặc set bởi staff
```

---

## 2. CustomerProfile Entity - Sau khi refactor

```java
@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID customerProfileId;
    
    // Personal Information
    @Column(name = "customer_slug", nullable = false, unique = true)
    private String customerSlug;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(name = "person_age", nullable = false)
    private Integer personAge;
    
    @Column(name = "person_income", nullable = false)
    private Double personIncome;
    
    @Column(name = "person_home_ownership", nullable = false, length = 50)
    private HomeOwnership personHomeOwnership;
    
    @Column(name = "person_emp_length")
    private Double personEmpLength;
    
    // Credit Bureau Information
    @Column(name = "cb_person_default_on_file", length = 10)
    private String cbPersonDefaultOnFile;
    
    @Column(name = "cb_person_cred_hist_length")
    private Integer cbPersonCredHistLength;
    
    // Current Loan Application Info (for prediction)
    @Column(name = "loan_intent", length = 100)
    private LoanIntent loanIntent;
    
    @Column(name = "loan_amnt")
    private Double loanAmnt;
    
    @Column(name = "loan_int_rate")
    private Double loanIntRate;
    
    @Column(name = "loan_percent_income")
    private Double loanPercentIncome;
    
    // System fields
    @Column(name = "staff_id")
    private UUID staffId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

---

## 3. Loan Entity - Tạo trong LoanManagementService

```java
@Entity
@Table(name = "loans")
public class Loan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID loanId;
    
    // Reference to CustomerProfile
    @Column(name = "customer_profile_id", nullable = false)
    private UUID customerProfileId; // FK
    
    // Loan Information
    @Column(name = "loan_intent", length = 100)
    private LoanIntent loanIntent;
    
    @Column(name = "loan_amnt")
    private Double loanAmnt;
    
    @Column(name = "loan_int_rate")
    private Double loanIntRate;
    
    @Column(name = "loan_percent_income")
    private Double loanPercentIncome;
    
    @Column(name = "loan_grade", length = 10)
    private LoanGrade loanGrade;
    
    // Prediction Result
    @Column(name = "prediction_id")
    private UUID predictionId;
    
    @Column(name = "prediction_result")
    private Boolean predictionResult; // true = predicted approve
    
    @Column(name = "prediction_confidence")
    private Double predictionConfidence;
    
    @Column(name = "predicted_at")
    private LocalDateTime predictedAt;
    
    // Loan Status (Actual decision by staff)
    @Column(name = "loan_status")
    private LoanStatus loanStatus; // APPROVED/REJECTED/PENDING
    
    @Column(name = "approved_by")
    private UUID approvedBy; // Staff ID
    
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
    
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;
    
    // System fields
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

---

## 4. Luồng xử lý sau khi refactor

### Step 1: Customer apply loan
```
CustomerService:
  - Tạo/Update CustomerProfile
  - Lưu personal info + loan info cơ bản (loanIntent, loanAmnt, loanIntRate, loanPercentIncome)
```

### Step 2: Tạo loan application
```
LoanManagementService:
  - Tạo Loan entity
  - Copy loan info từ CustomerProfile
  - Set loanStatus = PENDING
```

### Step 3: Request prediction
```
PredictionService:
  - Gọi CustomerService → Lấy CustomerProfile (đã có đủ info)
  - Dự đoán dựa trên CustomerProfile
  - Trả kết quả về LoanManagementService
```

### Step 4: Nhận prediction result
```
LoanManagementService:
  - Nhận PredictionCompletedEvent
  - Lưu predictionResult vào Loan entity
  - KHÔNG tự động update loanStatus
  - Staff review và approve/reject → Update loanStatus
```

---

## 5. Cập nhật code cần làm

### 5.1. CustomerProfile Entity
- [ ] Xóa field `loanStatus`
- [ ] Xóa field `loanGrade`
- [ ] Giữ lại: `loanIntent`, `loanAmnt`, `loanIntRate`, `loanPercentIncome`

### 5.2. CustomerProfileRequestDto & ResponseDto
- [ ] Xóa field `loanStatus`
- [ ] Xóa field `loanGrade`
- [ ] Giữ lại các loan info cơ bản

### 5.3. CustomerProfileService
- [ ] Xóa method `approveCustomer()` → Chuyển sang LoanManagementService
- [ ] Xóa method `rejectCustomer()` → Chuyển sang LoanManagementService
- [ ] Xóa method `getApprovedCustomers()` → Chuyển sang LoanManagementService
- [ ] Xóa method `getRejectedCustomers()` → Chuyển sang LoanManagementService
- [ ] Xóa method `getPendingCustomers()` → Chuyển sang LoanManagementService

### 5.4. PredictionListenerImpl
- [ ] Trong `handlePredictionCompletedEvent()`:
  - ❌ KHÔNG gọi `approveCustomer()` hoặc `rejectCustomer()`
  - ✅ CHỈ log prediction result
  - ✅ Có thể publish event để LoanManagementService nhận và lưu

### 5.5. CustomerProfileController
- [ ] Xóa endpoint `/approved`
- [ ] Xóa endpoint `/rejected`
- [ ] Xóa endpoint `/pending`
- [ ] Giữ lại các endpoint CRUD cơ bản

---

## 6. Event Flow mới

### Prediction Request Flow
```
PredictionService 
  → Publish PredictionRequestedEvent 
  → CustomerService nhận event
  → Lấy CustomerProfile (có đủ info)
  → Publish CustomerEnrichedEvent
  → PredictionService nhận và dự đoán
```

### Prediction Result Flow
```
PredictionService
  → Publish PredictionCompletedEvent (có loanId thay vì customerId)
  → LoanManagementService nhận event
  → Lưu predictionResult vào Loan entity
  → Staff review và approve/reject
```

---

## 7. Checklist refactor

- [ ] Refactor CustomerProfile entity (xóa loanStatus, loanGrade)
- [ ] Update DTOs (Request/Response)
- [ ] Update Service (xóa approve/reject methods)
- [ ] Update Controller (xóa approved/rejected/pending endpoints)
- [ ] Update PredictionListener (không auto-update loanStatus)
- [ ] Tạo Loan entity trong LoanManagementService
- [ ] Tạo LoanManagementService để quản lý loans
- [ ] Update PredictionCompletedEvent để có loanId
- [ ] Test lại toàn bộ flow

---

## 8. Lưu ý

1. **Migration Database**: 
   - Cần migration script để xóa column `loan_status` và `loan_grade` từ `customer_profiles`
   - Tạo table `loans` mới

2. **Backward Compatibility**:
   - Nếu có API clients đang dùng `/approved`, `/rejected`, `/pending` → Cần thông báo migration

3. **Data Migration**:
   - Nếu có data cũ với `loanStatus` trong CustomerProfile → Cần migrate sang Loan entity

---

## Kết luận

Sau khi refactor:
- **CustomerProfile**: Chỉ quản lý thông tin cá nhân + loan info cơ bản (cho prediction)
- **LoanManagement**: Quản lý loan applications, prediction results, và loan status
- **Prediction**: Chỉ cần gọi CustomerService (đã có đủ info)
- **Loan Status**: Chỉ được set bởi staff, không tự động từ prediction
