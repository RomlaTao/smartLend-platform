/** Nhãn hiển thị cho enum LoanIntent (khớp backend). */
export const LOAN_INTENT_LABELS = {
  PERSONAL: 'Cá nhân',
  EDUCATION: 'Giáo dục',
  MEDICAL: 'Y tế',
  VENTURE: 'Kinh doanh',
  HOMEIMPROVEMENT: 'Sửa nhà',
  DEBTCONSOLIDATION: 'Trả nợ',
  OTHER: 'Khác',
};

/**
 * Chuẩn hóa giá trị loanIntent từ API (string hoặc object enum).
 * @param {string|{ name?: string }|null|undefined} raw
 * @returns {string|null}
 */
export function normalizeLoanIntent(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed || null;
  }
  if (typeof raw === 'object') {
    if (raw.name) return String(raw.name);
    if (raw.value) return String(raw.value);
  }
  const asString = String(raw).trim();
  return asString && asString !== '[object Object]' ? asString : null;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 * @returns {string}
 */
export function formatLoanIntentLabel(raw) {
  const key = normalizeLoanIntent(raw);
  if (!key) return 'Không có';
  return LOAN_INTENT_LABELS[key] || LOAN_INTENT_LABELS[key.toUpperCase()] || key;
}

/**
 * Gắn loanIntent vào object loan từ API response hoặc financial snapshot.
 * @param {Object|null} loan
 * @param {{ getFinancialSnapshotById: Function, getFinancialSnapshotsByCustomerId?: Function }} api
 * @returns {Promise<Object|null>}
 */
export async function attachLoanIntent(loan, api) {
  if (!loan) return loan;
  if (normalizeLoanIntent(loan.loanIntent)) return loan;

  if (loan.financialSnapshotId && api?.getFinancialSnapshotById) {
    try {
      const snapshot = await api.getFinancialSnapshotById(loan.financialSnapshotId);
      const intent = normalizeLoanIntent(snapshot?.loanIntent);
      if (intent) {
        loan.loanIntent = intent;
        return loan;
      }
    } catch (e) {
      console.warn('[loanIntent] Could not load snapshot by id:', e.message);
    }
  }

  if (loan.customerId && api?.getFinancialSnapshotsByCustomerId) {
    try {
      const snapshots = await api.getFinancialSnapshotsByCustomerId(loan.customerId);
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        const snap = snapshots.find((s) => String(s.id) === String(loan.financialSnapshotId))
          || snapshots[snapshots.length - 1];
        const intent = normalizeLoanIntent(snap?.loanIntent);
        if (intent) loan.loanIntent = intent;
      }
    } catch (e) {
      console.warn('[loanIntent] Could not load snapshots by customer:', e.message);
    }
  }

  return loan;
}
