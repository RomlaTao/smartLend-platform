# Bộ dữ liệu demo dự đoán — ML Model v5

> **13 profile** trải đều xác suất vỡ nợ `P(default)` từ **~0.20 → ~0.80**, lấy từ `credit_risk_dataset.csv` và **verify** qua `ModelService` (LightGBM v5).

| Thông số model | Giá trị |
|---|---|
| Model version | 5.0.0 |
| Threshold phân loại | **0.256** |
| `label = true` | Default (rủi ro cao) |
| `label = false` | Non-Default |
| Risk UI | Low `< 0.30` · Medium `0.30–0.70` · High `≥ 0.70` |

**Lưu ý:** Các giá trị `personIncome`, `loanAmnt` là **USD** (khớp dataset training). Khi demo qua SmartLend UI, backend sẽ convert VND → USD trước khi gửi ML.

**Nguồn:** Quét toàn bộ dataset, chọn 1 hồ sơ gần nhất cho mỗi mốc xác suất mục tiêu (bước 0.05), không trùng lặp.

---

## Bảng tổng quan

| # | Mục tiêu | P(default) | Label | Risk UI | Grade | Default history |
|---:|---:|---:|---|---|---|---|
| 1 | 0.20 | 0.2000 | Non-Default | Low-Risk | D | Y |
| 2 | 0.25 | 0.2500 | Non-Default | Low-Risk | C | N |
| 3 | 0.30 | 0.3000 | Default | Medium-Risk | B | N |
| 4 | 0.35 | 0.3499 | Default | Medium-Risk | B | N |
| 5 | 0.40 | 0.3999 | Default | Medium-Risk | C | N |
| 6 | 0.45 | 0.4500 | Default | Medium-Risk | B | N |
| 7 | 0.50 | 0.4997 | Default | Medium-Risk | A | N |
| 8 | 0.55 | 0.5499 | Default | Medium-Risk | C | Y |
| 9 | 0.60 | 0.5999 | Default | Medium-Risk | A | N |
| 10 | 0.65 | 0.6495 | Default | Medium-Risk | B | N |
| 11 | 0.70 | 0.6999 | Default | Medium-Risk | C | N |
| 12 | 0.75 | 0.7499 | Default | High-Risk | E | Y |
| 13 | 0.80 | 0.7998 | Default | High-Risk | C | N |

---

## Chi tiết từng bộ (camelCase — copy vào form / API)

### 1 — P ≈ 0.20 · Non-Default · Low-Risk

```json
{
  "personAge": 23,
  "personIncome": 30000,
  "personHomeOwnership": "RENT",
  "personEmpLength": 3.0,
  "loanIntent": "PERSONAL",
  "loanGrade": "D",
  "loanAmnt": 3000,
  "loanIntRate": 15.2,
  "loanPercentIncome": 0.1,
  "cbPersonDefaultOnFile": "Y",
  "cbPersonCredHistLength": 4
}
```

---

### 2 — P ≈ 0.25 · Non-Default · Low-Risk *(sát ngưỡng 0.256)*

```json
{
  "personAge": 25,
  "personIncome": 36000,
  "personHomeOwnership": "MORTGAGE",
  "personEmpLength": 3.0,
  "loanIntent": "HOMEIMPROVEMENT",
  "loanGrade": "C",
  "loanAmnt": 7000,
  "loanIntRate": 12.73,
  "loanPercentIncome": 0.19,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 4
}
```

---

### 3 — P ≈ 0.30 · Default · Medium-Risk *(vừa vượt threshold)*

```json
{
  "personAge": 23,
  "personIncome": 56000,
  "personHomeOwnership": "RENT",
  "personEmpLength": 4.0,
  "loanIntent": "DEBTCONSOLIDATION",
  "loanGrade": "B",
  "loanAmnt": 15000,
  "loanIntRate": 12.69,
  "loanPercentIncome": 0.27,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 4
}
```

---

### 4 — P ≈ 0.35 · Default · Medium-Risk

```json
{
  "personAge": 28,
  "personIncome": 39500,
  "personHomeOwnership": "RENT",
  "personEmpLength": 4.0,
  "loanIntent": "MEDICAL",
  "loanGrade": "B",
  "loanAmnt": 3600,
  "loanIntRate": 11.99,
  "loanPercentIncome": 0.09,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 9
}
```

---

### 5 — P ≈ 0.40 · Default · Medium-Risk

```json
{
  "personAge": 24,
  "personIncome": 64000,
  "personHomeOwnership": "MORTGAGE",
  "personEmpLength": 7.0,
  "loanIntent": "HOMEIMPROVEMENT",
  "loanGrade": "C",
  "loanAmnt": 16000,
  "loanIntRate": 14.65,
  "loanPercentIncome": 0.25,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 2
}
```

---

### 6 — P ≈ 0.45 · Default · Medium-Risk

```json
{
  "personAge": 26,
  "personIncome": 108000,
  "personHomeOwnership": "MORTGAGE",
  "personEmpLength": 8.0,
  "loanIntent": "HOMEIMPROVEMENT",
  "loanGrade": "B",
  "loanAmnt": 15000,
  "loanIntRate": 11.49,
  "loanPercentIncome": 0.14,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 3
}
```

---

### 7 — P ≈ 0.50 · Default · Medium-Risk

```json
{
  "personAge": 26,
  "personIncome": 51600,
  "personHomeOwnership": "RENT",
  "personEmpLength": 1.0,
  "loanIntent": "HOMEIMPROVEMENT",
  "loanGrade": "A",
  "loanAmnt": 5000,
  "loanIntRate": 8.94,
  "loanPercentIncome": 0.1,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 2
}
```

> **Gợi ý demo:** Grade A nhưng thời gian làm việc chỉ 1 năm → xác suất ~50% — minh họa model không chỉ nhìn grade.

---

### 8 — P ≈ 0.55 · Default · Medium-Risk

```json
{
  "personAge": 24,
  "personIncome": 117300,
  "personHomeOwnership": "RENT",
  "personEmpLength": 4.0,
  "loanIntent": "MEDICAL",
  "loanGrade": "C",
  "loanAmnt": 5000,
  "loanIntRate": 13.23,
  "loanPercentIncome": 0.04,
  "cbPersonDefaultOnFile": "Y",
  "cbPersonCredHistLength": 3
}
```

---

### 9 — P ≈ 0.60 · Default · Medium-Risk

```json
{
  "personAge": 36,
  "personIncome": 46800,
  "personHomeOwnership": "MORTGAGE",
  "personEmpLength": 20.0,
  "loanIntent": "MEDICAL",
  "loanGrade": "A",
  "loanAmnt": 2800,
  "loanIntRate": 7.51,
  "loanPercentIncome": 0.06,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 12
}
```

---

### 10 — P ≈ 0.65 · Default · Medium-Risk

```json
{
  "personAge": 22,
  "personIncome": 33000,
  "personHomeOwnership": "RENT",
  "personEmpLength": 6.0,
  "loanIntent": "PERSONAL",
  "loanGrade": "B",
  "loanAmnt": 10000,
  "loanIntRate": 12.42,
  "loanPercentIncome": 0.3,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 3
}
```

---

### 11 — P ≈ 0.70 · Default · Medium-Risk *(ranh giới High-Risk)*

```json
{
  "personAge": 36,
  "personIncome": 74000,
  "personHomeOwnership": "MORTGAGE",
  "personEmpLength": 4.0,
  "loanIntent": "PERSONAL",
  "loanGrade": "C",
  "loanAmnt": 10000,
  "loanIntRate": 11.03,
  "loanPercentIncome": 0.14,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 15
}
```

---

### 12 — P ≈ 0.75 · Default · High-Risk

```json
{
  "personAge": 22,
  "personIncome": 54000,
  "personHomeOwnership": "RENT",
  "personEmpLength": 4.0,
  "loanIntent": "EDUCATION",
  "loanGrade": "E",
  "loanAmnt": 5000,
  "loanIntRate": 16.35,
  "loanPercentIncome": 0.09,
  "cbPersonDefaultOnFile": "Y",
  "cbPersonCredHistLength": 3
}
```

---

### 13 — P ≈ 0.80 · Default · High-Risk

```json
{
  "personAge": 24,
  "personIncome": 44000,
  "personHomeOwnership": "RENT",
  "personEmpLength": 2.0,
  "loanIntent": "EDUCATION",
  "loanGrade": "C",
  "loanAmnt": 5000,
  "loanIntRate": 15.23,
  "loanPercentIncome": 0.11,
  "cbPersonDefaultOnFile": "N",
  "cbPersonCredHistLength": 2
}
```

---

## Gợi ý kịch bản demo

| Mục đích | Bộ # |
|---|---|
| Trade-off sát ngưỡng model (0.256) | **#2** vs **#3** |
| Vùng “khó quyết” medium (~40%) | **#5** |
| Grade A nhưng vẫn rủi ro cao | **#7**, **#9** |
| Có lịch sử default (Y) | **#1**, **#8**, **#12** |
| High-Risk rõ ràng | **#12**, **#13** |
| So sánh đầu–cuối dải | **#1** vs **#13** |

---

## Test nhanh qua REST

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"personAge":24,"personIncome":64000,"personHomeOwnership":"MORTGAGE","personEmpLength":7.0,"loanIntent":"HOMEIMPROVEMENT","loanGrade":"C","loanAmnt":16000,"loanIntRate":14.65,"loanPercentIncome":0.25,"cbPersonDefaultOnFile":"N","cbPersonCredHistLength":2}'
```

---

*Tạo tự động từ `credit_risk_dataset.csv` + `ModelService` v5 — `ml-model/`.*
