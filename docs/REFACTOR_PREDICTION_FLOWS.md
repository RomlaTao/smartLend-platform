# Kế hoạch Refactor — Hai luồng Prediction (Standalone & Loan)

> Tài liệu mô tả kế hoạch refactor cho hai luồng dự đoán rủi ro trong SmartLend Platform: **Standalone** (`POST /api/predictions`) và **Loan** (`trigger-prediction`).  
> Phạm vi: backend (`smartLend-platform`) + frontend (`frontend/`).  
> **Ngoài phạm vi tạm thời:** vấn đề #4 — `loanGrade` nhập tay từ CustomerService (chưa tích hợp CIC).

---

## 1. Bối cảnh

Hệ thống hiện có hai đường vào ML model (LightGBM v5), dùng chung queue `model.predict.requested`:

| Luồng | Entry point | Ai publish RabbitMQ | Mục đích |
|-------|-------------|---------------------|----------|
| **Standalone** | `POST /api/predictions` | PredictionService | Analyst chạy thử / phân tích độc lập |
| **Loan** | `POST .../trigger-prediction` | LoanManagementService | Gắn prediction với đơn vay, hỗ trợ phê duyệt |

Phân tích code hiện tại phát hiện **13 vấn đề nghiệp vụ/logic**; tài liệu này map từng vấn đề sang task refactor cụ thể.

---

## 2. Danh sách vấn đề cần xử lý

| ID | Mức độ | Vấn đề | Luồng | Task |
|----|--------|--------|-------|------|
| #1 | 🟠 Data | `loanPercentIncome` standalone do analyst nhập tay, không nhất quán với loan flow | Standalone | 2.1, 3.5 |
| #2 | 🟠 Data | `loanStatus` trong DTO/form nhưng ML không dùng | Standalone | 2.1, 3.5 |
| #3 | 🟡 UX | RabbitMQ fail → prediction PENDING vĩnh viễn, client vẫn nhận 200 OK | Standalone | 1.4 |
| #5 | 🔵 Thiếu | Standalone không nối với quy trình approve loan | Standalone | *(ngoài scope phase này)* |
| #6 | 🔴 Nghiệp vụ | Trigger prediction fail nhưng UI báo "đã kích hoạt dự đoán" | Loan | 3.1 |
| #7 | 🟡 UX | `LoanPredictionCompletedListener` no-op → `predictionConfidence` trên loan luôn null | Loan | 1.1 |
| #8 | 🔵 Thiếu | Không retry/re-trigger khi ML fail giữa chừng | Loan | 1.3 |
| #9 | 🔴 Nghiệp vụ | Staff approve được trước khi ML hoàn thành | Loan | 1.2 |
| #10 | 🟡 UX | Modal loan hiển thị customer live, khác FinancialSnapshot ML đã dùng | Loan | 2.2, 3.4 |
| #11 | 🟠 Data | Cùng KH + cùng khoản vay → kết quả ML khác nhau giữa 2 luồng | Cả hai | 2.1 |
| #12 | 🟡 UX | Không auto-poll sau trigger/create prediction | Cả hai | 3.2 |
| #13 | 🔴 Nghiệp vụ | Label "Độ tin cậy" hiển thị `p_default` (xác suất vỡ nợ) — dễ hiểu ngược | Cả hai | 3.3 |
| #4 | — | `loanGrade` nhập tay, không từ CIC | Customer | **Bỏ qua tạm thời** |

---

## 3. Tổng quan phases

```
Phase 1 — Backend: Sửa lỗi nghiệp vụ sai        (~3–4 ngày)
Phase 2 — Backend: Sửa data integrity             (~2 ngày)
Phase 3 — Frontend: UX + hiển thị đúng data       (~2 ngày)
```

**Thứ tự phụ thuộc:**

- Phase 3 Task 3.2 (auto-poll) phụ thuộc Task 1.1 (listener + field mới trên loan response).
- Phase 3 Task 3.4 (snapshot UI) phụ thuộc Task 2.2 (enrich loan response).
- Phase 3 Task 3.5 (form standalone) phụ thuộc Task 2.1 (DTO backend).

```
Phase 1
├── 1.1 Listener + migration          ──┐
├── 1.2 Validate APPROVE                │
├── 1.3 Reset/re-trigger endpoint       ├──► Phase 2 ──► Phase 3
└── 1.4 Fail fast publish               │
                                        │
Phase 2                                 │
├── 2.1 Refactor PredictionRequestDto   │
└── 2.2 Enrich LoanApplicationResponse ─┘
```

---

## Phase 1 — Backend: Sửa lỗi nghiệp vụ sai

### Task 1.1 — Implement `LoanPredictionCompletedListener` *(#7)*

**Mục tiêu:** Đồng bộ kết quả ML ngược vào `LoanApplication` khi ml-model publish `loan.prediction.completed`.

**File cần sửa:**

| File | Thay đổi |
|------|----------|
| `loanmanagementservice/.../entities/LoanApplication.java` | Thêm `predictionConfidence`, `predictionLabel` |
| `loanmanagementservice/.../services/LoanApplicationService.java` | Thêm `applyPredictionResult(...)` |
| `loanmanagementservice/.../services/impl/LoanApplicationServiceImpl.java` | Implement + cập nhật `mapToResponse()` |
| `loanmanagementservice/.../listeners/impl/LoanPredictionCompletedListenerImpl.java` | Gọi service thay vì no-op |
| `loanmanagementservice/.../dtos/LoanApplicationResponseDto.java` | Thêm field tương ứng (nếu chưa map) |
| Migration SQL | `ALTER TABLE loan_applications ADD COLUMN ...` |

**Migration:**

```sql
ALTER TABLE loan_applications
  ADD COLUMN prediction_confidence DOUBLE,
  ADD COLUMN prediction_label      BOOLEAN;
```

**Entity — thêm field:**

```java
@Column(name = "prediction_confidence")
private Double predictionConfidence;   // p_default từ ML

@Column(name = "prediction_label")
private Boolean predictionLabel;       // true = Non-Default (an toàn)
```

**Service interface:**

```java
void applyPredictionResult(UUID loanApplicationId, Boolean label, Double probability);
```

**Service implementation:**

```java
@Transactional
public void applyPredictionResult(UUID loanApplicationId, Boolean label, Double probability) {
    LoanApplication app = loanApplicationRepository.findById(loanApplicationId)
        .orElseThrow(() -> new RuntimeException("Loan application not found: " + loanApplicationId));
    app.setPredictionLabel(label);
    app.setPredictionConfidence(probability);
    loanApplicationRepository.save(app);
    log.info("[LOAN] Applied prediction result - loanId: {}, label: {}, confidence: {}",
        loanApplicationId, label, probability);
}
```

**Listener:**

```java
@RabbitListener(queues = "${rabbitmq.queue.loan-prediction-completed}")
@Transactional
public void handleLoanPredictionCompleted(ModelPredictCompletedMessage message) {
    if (message == null || message.getLoanApplicationId() == null || message.getResult() == null) {
        log.warn("[LOAN] Received invalid prediction completed message, skipping");
        return;
    }
    loanApplicationService.applyPredictionResult(
        message.getLoanApplicationId(),
        message.getResult().getLabel(),
        message.getResult().getProbability()
    );
}
```

**Acceptance criteria:**

- [ ] Sau khi ML xử lý loan flow, `GET /api/loan-applications/id/{id}` trả `predictionConfidence` và `predictionLabel` khác null.
- [ ] Block "Quyết định" trên frontend có thể đọc từ loan response (không còn luôn `N/A`).

---

### Task 1.2 — Validate prediction COMPLETED trước khi APPROVE *(#9)*

**Mục tiêu:** Không cho phép `APPROVED` khi chưa có kết quả ML; vẫn cho phép `REJECTED` bất kỳ lúc nào.

**File:** `loanmanagementservice/.../services/impl/LoanApplicationServiceImpl.java` — method `updateDecision()`.

**Logic thêm:**

```java
if (request.getDecision() == LoanDecision.APPROVED) {
    if (application.getPredictionId() == null) {
        throw new IllegalStateException("Cannot approve: prediction has not been triggered yet.");
    }
    if (application.getPredictionConfidence() == null) {
        throw new IllegalStateException(
            "Cannot approve: ML prediction result is still PENDING. Please wait and try again.");
    }
}
// REJECTED: không thêm ràng buộc
```

**Frontend (Phase 3 nhưng spec sẵn):** `ListLoan.js` — tách `canApprove` / `canReject`:

```javascript
const canApprove =
    canWrite() &&
    loan.status === 'UNDER_REVIEW' &&
    (!loan.decision || loan.decision === 'PENDING') &&
    loan.predictionLabel != null;

const canReject =
    canWrite() &&
    (loan.status === 'UNDER_REVIEW' || loan.status === 'PENDING') &&
    (!loan.decision || loan.decision === 'PENDING');
```

**Acceptance criteria:**

- [ ] `POST .../decision` với `APPROVED` khi `predictionConfidence == null` → 409/422 với message rõ ràng.
- [ ] `POST .../decision` với `REJECTED` khi prediction PENDING → vẫn thành công.
- [ ] Nút Approve trên UI disabled + tooltip khi prediction chưa xong.

---

### Task 1.3 — Endpoint reset prediction + re-trigger *(#8)*

**Mục tiêu:** Xử lý trường hợp ML fail / message mất — staff có thể reset và chạy lại.

**API mới:**

```
POST /api/loan-applications/id/{id}/reset-prediction
Header: X-User-Id
```

**File:**

| File | Thay đổi |
|------|----------|
| `LoanApplicationController.java` | Endpoint `reset-prediction` |
| `LoanApplicationService.java` | `resetPrediction(UUID, UUID)` |
| `LoanApplicationServiceImpl.java` | Implementation |
| `frontend/.../loanmanagement.service.js` | `resetLoanPrediction(loanId, staffId)` |
| `frontend/.../ListLoan.js` | Nút "Chạy lại dự đoán" |

**Logic reset:**

```java
@Transactional
public LoanApplicationResponseDto resetPrediction(UUID loanApplicationId, UUID staffId) {
    LoanApplication application = loanApplicationRepository.findById(loanApplicationId)
        .orElseThrow(...);

    if (!application.getStaffId().equals(staffId)) {
        throw new RuntimeException("Not authorized");
    }
    // Chỉ reset nếu prediction chưa COMPLETED
    if (application.getPredictionConfidence() != null) {
        throw new IllegalStateException("Prediction already completed. Cannot reset.");
    }

    application.setPredictionId(null);
    application.setPredictionLabel(null);
    application.setPredictionConfidence(null);
    loanApplicationRepository.save(application);
    return mapToResponse(application);
}
```

**Luồng UI:** Reset → `trigger-prediction` → mở modal kết quả.

**Acceptance criteria:**

- [ ] Loan có `predictionId` nhưng `predictionConfidence == null` quá lâu → staff reset và trigger lại được.
- [ ] Loan đã có kết quả COMPLETED → reset bị từ chối.

**Ghi chú:** Prediction record PENDING cũ trên PredictionService có thể orphan — cân nhắc đánh dấu `FAILED` qua API nội bộ hoặc để phase sau.

---

### Task 1.4 — Fail fast khi RabbitMQ publish thất bại *(#3)*

**Mục tiêu:** Standalone không trả 200 OK khi message không tới ML.

**File:** `predictionservice/.../services/impl/PredictionServiceImpl.java` — `createPrediction()`.

**Thay đổi:**

```java
try {
    predictionEventPublisher.publishModelPredictRequestedEvent(event);
} catch (Exception publishEx) {
    log.error("[PREDICTION] Failed to publish to ML model. predictionId={}", predictionId, publishEx);
    prediction.setStatus(PredictionStatus.FAILED);
    predictionRepository.save(prediction);
    throw new RuntimeException("Failed to send prediction request to ML model. Please try again later.", publishEx);
}
```

**Acceptance criteria:**

- [ ] RabbitMQ down → `POST /api/predictions` trả lỗi 5xx, bản ghi `FAILED` (không PENDING mãi).
- [ ] Frontend hiển thị lỗi rõ ràng, không báo "thành công".

---

## Phase 2 — Backend: Sửa data integrity

### Task 2.1 — Auto-calculate `loanPercentIncome`, bỏ `loanStatus` *(#1, #2, #11)*

**Mục tiêu:** Standalone dùng cùng logic tính input ML với luồng loan.

**File:**

| File | Thay đổi |
|------|----------|
| `predictionservice/.../dtos/PredictionRequestDto.java` | Bỏ `loanStatus`, `loanPercentIncome`, metadata thừa |
| `predictionservice/.../services/impl/PredictionServiceImpl.java` | Tự tính `loanPercentIncome`, đơn giản hóa `ModelInputDto` |
| `predictionservice/README.md` | Cập nhật ví dụ API |

**DTO mới (tối thiểu):**

```java
public class PredictionRequestDto {
    private UUID customerId;        // bắt buộc
    private LoanIntent loanIntent;  // bắt buộc
    private Double loanAmnt;        // VND
    private Double loanIntRate;
}
```

**Tính toán (nhất quán với LoanManagementService):**

```java
Double loanPercentIncome = (profile.getPersonIncome() != null && profile.getPersonIncome() > 0)
    ? request.getLoanAmnt() / profile.getPersonIncome()
    : null;

// Model input: chỉ 11 field ML cần, không gửi loanStatus / email / slug
```

**Acceptance criteria:**

- [ ] Cùng `customerId`, `loanAmnt`, `loanIntRate`, `loanIntent` → standalone và loan (cùng snapshot timing) cho input ML tương đương.
- [ ] API docs và Postman collection cập nhật.

---

### Task 2.2 — Enrich `LoanApplicationResponse` với snapshot summary *(#10)*

**Mục tiêu:** Frontend biết dữ liệu ML đã dùng mà không cần đoán từ customer live.

**File:**

| File | Thay đổi |
|------|----------|
| `LoanApplicationResponseDto.java` | Thêm field snapshot (hoặc nested DTO) |
| `LoanApplicationServiceImpl.mapToResponse()` | Populate từ `FinancialSnapshot` |

**Field đề xuất trên response:**

```java
private Double snapshotPersonIncome;      // USD (đã convert lúc tạo đơn)
private Double snapshotLoanAmnt;            // USD
private Double snapshotLoanPercentIncome; // tỷ lệ VND/VND
private Integer snapshotPersonAge;
private String snapshotPersonHomeOwnership;
```

**Acceptance criteria:**

- [ ] `GET /api/loan-applications/id/{id}` trả đủ snapshot fields.
- [ ] Frontend có thể hiển thị "dữ liệu tại thời điểm nộp đơn" mà không gọi thêm API snapshot riêng (tùy chọn vẫn giữ `GET /api/financial-snapshots/id/{id}`).

---

## Phase 3 — Frontend: UX + hiển thị đúng

### Task 3.1 — Fix silent failure khi trigger prediction *(#6)*

**File:**

| File | Thay đổi |
|------|----------|
| `frontend/src/pages/loan/create/create-loan-renderer.js` | Trả `{ predictionTriggered, predictionError }` |
| `frontend/src/pages/customers/list/ListCustomer.js` | Message success/warning theo kết quả trigger |

**Logic:**

```javascript
const result = await createLoanApplication(staffId, { ... });
try {
    await triggerLoanPrediction(result.id, staffId);
    return { ...result, predictionTriggered: true };
} catch (predErr) {
    return { ...result, predictionTriggered: false, predictionError: predErr.message };
}
```

**Acceptance criteria:**

- [ ] Trigger fail → UI cảnh báo, hướng dẫn vào List Loan để chạy lại.
- [ ] Trigger ok → message "Dự đoán AI đang chạy...".

---

### Task 3.2 — Auto-poll kết quả prediction *(#12)*

**File:**

| File | Thay đổi |
|------|----------|
| `frontend/src/pages/loan/predict/prediction-result-renderer.js` | `startPredictionPolling` / `stopPredictionPolling` |
| `frontend/src/pages/loan/list/ListLoan.js` | Dừng poll khi đóng modal |
| `frontend/src/pages/analytics/predictions/list/ListPrediction.js` | Poll sau create (tùy chọn mở modal) |

**Hành vi:**

- Interval mặc định: **4 giây**.
- Dừng khi `predictionResult != null` hoặc đóng modal.
- Tối đa poll: **30 lần (~2 phút)** — sau đó hiện "Hết thời gian chờ, thử Làm mới hoặc Chạy lại".

**Acceptance criteria:**

- [ ] Sau trigger/create, modal tự cập nhật khi ML xong (không bắt buộc bấm Làm mới).
- [ ] Không leak interval khi đóng modal.

---

### Task 3.3 — Sửa label `confidence` *(#13)*

**File:** `ListLoan.js`, `prediction-result-renderer.js`

| Trước | Sau |
|-------|-----|
| "Độ tin cậy" + `confidence * 100%` | **"Xác suất vỡ nợ"** + `confidence * 100%` |
| Gauge label "rủi ro" (mơ hồ) | **"Xác suất vỡ nợ"** hoặc "Mức rủi ro" kèm chú thích |

**Semantics (giữ nguyên backend):**

- `predictionResult == true` → Non-Default → gợi ý phê duyệt.
- `confidence` = `p_default` → càng cao càng nguy hiểm.

**Acceptance criteria:**

- [ ] Không còn label "Độ tin cậy" cho field `confidence`.
- [ ] Tooltip/help text giải thích ý nghĩa số.

---

### Task 3.4 — Hiển thị FinancialSnapshot trong loan modal *(#10)*

**File:** `prediction-result-renderer.js` — `renderLoanDetails()`, `renderCustomerProfile()`.

**Ưu tiên:** Dùng `loan.snapshot*` từ Task 2.2; fallback customer live nếu snapshot thiếu.

**UI:** Ghi chú *(tại thời điểm nộp đơn)* bên cạnh thu nhập / tỷ lệ vay-thu nhập.

**Acceptance criteria:**

- [ ] Sau khi update profile KH, mở loan cũ vẫn thấy đúng data ML đã dùng.

---

### Task 3.5 — Cập nhật form standalone prediction *(#1, #2)*

**File:**

| File | Thay đổi |
|------|----------|
| `ListPrediction.html` | Xóa `cp-loan-status`, `cp-loan-percent-income` |
| `ListPrediction.js` | Payload chỉ còn 4 field |
| `prediction.service.js` | Bỏ query `staffName` |

**Form fields còn lại:**

- Mã khách hàng (UUID)
- Số tiền vay (VND)
- Lãi suất (%)
- Mục đích vay

**Acceptance criteria:**

- [ ] Form và API khớp DTO mới (Task 2.1).
- [ ] Note: "Tỷ lệ vay/thu nhập được tính tự động từ hồ sơ KH."

---

## 4. Ma trận task

| Task | Vấn đề | Phase | File chính | Effort |
|------|--------|-------|------------|--------|
| 1.1 | #7 | BE | `LoanApplication`, `LoanPredictionCompletedListenerImpl`, migration | L |
| 1.2 | #9 | BE | `LoanApplicationServiceImpl.updateDecision` | S |
| 1.3 | #8 | BE + FE | Controller, Service, `ListLoan.js`, `loanmanagement.service.js` | M |
| 1.4 | #3 | BE | `PredictionServiceImpl.createPrediction` | S |
| 2.1 | #1, #2, #11 | BE | `PredictionRequestDto`, `PredictionServiceImpl` | M |
| 2.2 | #10 | BE | `LoanApplicationResponseDto`, `mapToResponse` | S |
| 3.1 | #6 | FE | `create-loan-renderer.js`, `ListCustomer.js` | S |
| 3.2 | #12 | FE | `prediction-result-renderer.js`, modals | M |
| 3.3 | #13 | FE | `ListLoan.js`, `prediction-result-renderer.js` | XS |
| 3.4 | #10 | FE | `prediction-result-renderer.js` | S |
| 3.5 | #1, #2 | FE | `ListPrediction.html/js`, `prediction.service.js` | S |

**Effort:** XS &lt; 2h · S = 2–4h · M = 4–8h · L &gt; 1 ngày

---

## 5. Thứ tự triển khai đề xuất

### Sprint 1 — Backend core (Phase 1)

1. **1.1** Migration + listener + `mapToResponse`
2. **1.2** Validate APPROVE
3. **1.4** Fail fast publish (độc lập, có thể song song với 1.2)
4. **1.3** Reset endpoint

**Kiểm thử:** Postman/collection loan flow; RabbitMQ management UI; verify `predictionConfidence` trên loan GET.

### Sprint 2 — Data + API contract (Phase 2)

1. **2.1** Refactor standalone DTO + tính `loanPercentIncome`
2. **2.2** Enrich loan response

**Kiểm thử:** So sánh input JSON gửi ML giữa 2 luồng (log hoặc RabbitMQ message).

### Sprint 3 — Frontend (Phase 3)

1. **3.3** Label (nhanh, low risk)
2. **3.1** Silent failure
3. **3.5** Form standalone (sau 2.1 deploy)
4. **3.2** Auto-poll (sau 1.1 deploy)
5. **3.4** Snapshot display (sau 2.2 deploy)

---

## 6. Kiểm thử tích hợp (Test plan)

### Luồng Loan

- [ ] Tạo đơn → trigger → poll → thấy COMPLETED trên prediction + `predictionLabel`/`predictionConfidence` trên loan.
- [ ] Approve khi PENDING → bị từ chối (API + UI).
- [ ] Reject khi PENDING → thành công.
- [ ] Approve sau COMPLETED → thành công → disburse.
- [ ] Simulate ML fail → reset → re-trigger → COMPLETED.
- [ ] Trigger fail lúc create → UI warning, trigger lại từ List Loan.

### Luồng Standalone

- [ ] Tạo prediction với 4 field → `loanPercentIncome` đúng trên inputData JSON.
- [ ] RabbitMQ stop → API lỗi, status FAILED.
- [ ] Poll modal → COMPLETED + SHAP/LIME.

### Regression

- [ ] Gateway JWT + `X-User-Id` vẫn hoạt động.
- [ ] `register-from-loan` (LMS nội bộ) không đổi contract.
- [ ] ml-model vẫn nhận 11 field camelCase.

---

## 7. Rủi ro & mitigations

| Rủi ro | Mitigation |
|--------|------------|
| Migration DB trên môi trường đã có data | Script ALTER nullable; backfill không bắt buộc |
| Breaking change `PredictionRequestDto` | Cập nhật FE + README cùng PR; version API nếu cần |
| Orphan prediction PENDING sau reset | Phase sau: API mark FAILED hoặc cleanup job |
| Poll quá tải server | Max 30 lần, interval 4s, dừng khi đóng modal |
| #5 Standalone không gắn loan | Ghi nhận backlog; không block phase này |

---

## 8. Backlog (ngoài phase hiện tại)

- **#4** Tích hợp nguồn `loanGrade` từ CIC / scoring service.
- **#5** Liên kết `predictionId` standalone ↔ `loanApplicationId` (optional link field).
- Tự động trigger prediction ngay sau `create loan` (backend, một transaction orchestration).
- WebSocket/SSE thay polling.
- Compensation saga: rollback loan nếu `register-from-loan` ok nhưng RabbitMQ fail.
- Role-based authorization trên Customer/Loan/Prediction APIs (hiện `permitAll` ở service layer).

---

## 9. Tài liệu liên quan

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Kiến trúc tổng thể, RabbitMQ routing
- [predictionservice/README.md](../predictionservice/README.md) — API standalone
- [loanmanagementservice/README.md](../loanmanagementservice/README.md) — API loan + trigger
- [README.md](../README.md) — Luồng tổng quan hệ thống

---

*Cập nhật lần cuối: 2026-06-29*
