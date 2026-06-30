// Formatter utilities — hiển thị tiếng Việt (ngày, tiền tệ, enum, trạng thái)

export const EMPTY_LABEL = 'Không có';

export const HOME_OWNERSHIP_LABELS = {
  OWN: 'Sở hữu',
  RENT: 'Thuê nhà',
  MORTGAGE: 'Đang thế chấp',
  OTHER: 'Khác',
};

export const LOAN_STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  UNDER_REVIEW: 'Đang thẩm định',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',
  DISBURSED: 'Đã giải ngân',
};

export const LOAN_DECISION_LABELS = {
  PENDING: 'Chờ quyết định',
  APPROVED: 'Phê duyệt',
  REJECTED: 'Từ chối',
};

export const LOAN_GRADE_LABELS = {
  A: 'Xuất sắc',
  B: 'Rất tốt',
  C: 'Tốt',
  D: 'Trung bình',
  E: 'Kém',
  F: 'Rất kém',
  G: 'Xấu',
};

export const USER_ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  ANALYSTIC: 'Phân tích viên',
  STAFF: 'Nhân viên',
};

/**
 * @param {*} value
 * @param {string} [fallback=EMPTY_LABEL]
 */
export function orEmpty(value, fallback = EMPTY_LABEL) {
  if (value == null || value === '') return fallback;
  return value;
}

/**
 * @param {string|Date|null|undefined} dateInput
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDateVi(dateInput, options) {
  if (!dateInput) return EMPTY_LABEL;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return EMPTY_LABEL;
  return date.toLocaleDateString('vi-VN', options ?? {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * @param {string|Date|null|undefined} dateInput
 */
export function formatDateTimeVi(dateInput) {
  if (!dateInput) return EMPTY_LABEL;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return EMPTY_LABEL;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {number|null|undefined} amount
 */
export function formatCurrencyVnd(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return EMPTY_LABEL;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * @param {string|{ name?: string, value?: string }|null|undefined} raw
 */
export function normalizeEnumKey(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim().toUpperCase() || null;
  if (typeof raw === 'object') {
    const v = raw.name || raw.value;
    return v ? String(v).trim().toUpperCase() : null;
  }
  const s = String(raw).trim();
  return s && s !== '[object Object]' ? s.toUpperCase() : null;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 */
export function formatHomeOwnership(raw) {
  const key = normalizeEnumKey(raw);
  if (!key) return EMPTY_LABEL;
  return HOME_OWNERSHIP_LABELS[key] || key;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 */
export function formatLoanStatus(raw) {
  const key = normalizeEnumKey(raw);
  if (!key) return EMPTY_LABEL;
  return LOAN_STATUS_LABELS[key] || key;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 */
export function formatLoanDecision(raw) {
  const key = normalizeEnumKey(raw);
  if (!key) return EMPTY_LABEL;
  return LOAN_DECISION_LABELS[key] || key;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 */
export function formatLoanGradeLabel(raw) {
  const key = normalizeEnumKey(raw);
  if (!key) return EMPTY_LABEL;
  return LOAN_GRADE_LABELS[key] || `Hạng ${key}`;
}

/**
 * @param {string|{ name?: string }|null|undefined} raw
 */
export function formatUserRole(raw) {
  const key = normalizeEnumKey(raw);
  if (!key) return EMPTY_LABEL;
  return USER_ROLE_LABELS[key] || key;
}

/**
 * Số ngày tính từ ngày cho trước đến hiện tại (hiển thị tiếng Việt).
 * @param {string|Date|null|undefined} dateInput
 */
export function formatRelativeDaysVi(dateInput) {
  if (!dateInput) return EMPTY_LABEL;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return EMPTY_LABEL;
  const diffDays = Math.ceil(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return `${diffDays} ngày trước`;
}
