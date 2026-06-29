// Loan management service: loan applications, disbursements, financial snapshots (khớp LoanManagementService backend)

import { API_BASE_URLS } from '../utils/constants.js';

const BASE = API_BASE_URLS.loanManagement;
const ACCESS_TOKEN_KEY = 'smartlend_access_token';

// Get access token from storage
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const token = getAccessToken();
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let err;
    try {
      err = new Error(JSON.parse(text).message || text || res.statusText);
    } catch {
      err = new Error(text || res.statusText);
    }
    err.status = res.status;
    err.response = res;
    throw err;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}

// --- Loan applications (/api/loan-applications) ---

/**
 * Tạo đơn xin vay. Backend gọi CustomerService lấy profile theo customerId.
 * NOTE: Sau khi tạo loan, phải gọi triggerPrediction() để bắt đầu dự đoán từ ML model.
 * @param {string} staffId - UUID staff (header X-User-Id)
 * @param {{ customerId: string, loanIntent: string, requestedAmount: number, requestedTermMonths?: number, requestedInterestRate?: number }} body
 *   loanIntent: PERSONAL | EDUCATION | MEDICAL | VENTURE | HOMEIMPROVEMENT | DEBTCONSOLIDATION | OTHER
 * @returns {Promise<LoanApplicationResponseDto>}
 */
export async function createLoanApplication(staffId, body) {
  return request('/api/loan-applications', {
    method: 'POST',
    headers: {
      'X-User-Id': staffId,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Trigger prediction cho một loan application. 
 * Gọi sau khi tạo loan để bắt đầu dự đoán từ ML model.
 * @param {string} loanApplicationId - UUID loan application
 * @param {string} staffId - UUID staff (header X-User-Id)
 * @returns {Promise<LoanApplicationResponseDto>}
 */
export async function triggerLoanPrediction(loanApplicationId, staffId) {
  return request(`/api/loan-applications/id/${loanApplicationId}/trigger-prediction`, {
    method: 'POST',
    headers: {
      'X-User-Id': staffId,
    },
  });
}

/**
 * Lấy đơn xin vay theo id.
 * @param {string} id - UUID loan application
 */
export async function getLoanApplicationById(id) {
  return request(`/api/loan-applications/id/${id}`);
}

/**
 * Lấy danh sách đơn xin vay theo customerId.
 * @param {string} customerId - UUID customer
 */
export async function getLoanApplicationsByCustomerId(customerId) {
  return request(`/api/loan-applications/customer/id/${customerId}`);
}

/**
 * Lấy danh sách đơn xin vay theo staffId.
 * @param {string} staffId - UUID staff
 */
export async function getLoanApplicationsByStaffId(staffId) {
  return request(`/api/loan-applications/staff/id/${staffId}`);
}

/**
 * Lấy danh sách đơn xin vay có phân trang.
 * @param {number} [page=0]
 * @param {number} [size=10]
 * @returns {Promise<{ content: LoanApplicationResponseDto[], totalElements: number, totalPages: number, size: number, number: number }>}
 */
export async function getAllLoanApplications(page = 0, size = 10) {
  return request(`/api/loan-applications?page=${page}&size=${size}`);
}

/**
 * Staff cập nhật quyết định APPROVED / REJECTED cho một loan application.
 * Model chỉ gợi ý, quyết định cuối cùng được gửi qua endpoint này.
 *
 * @param {string} loanApplicationId - UUID loan application
 * @param {string} staffId - UUID staff (header X-User-Id)
 * @param {{ decision: 'APPROVED' | 'REJECTED' }} body
 * @returns {Promise<LoanApplicationResponseDto>}
 */
export async function updateLoanApplicationDecision(loanApplicationId, staffId, body) {
  return request(`/api/loan-applications/id/${loanApplicationId}/decision`, {
    method: 'POST',
    headers: {
      'X-User-Id': staffId,
    },
    body: JSON.stringify(body),
  });
}

// --- Disbursements (/api/disbursements) ---

/**
 * Tạo giải ngân cho một đơn vay.
 * @param {{ loanApplicationId: string, disbursedAmount: number, snapshotData?: string }} body
 */
export async function createDisbursement(body) {
  return request('/api/disbursements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Lấy giải ngân theo id.
 * @param {string} id - UUID disbursement
 */
export async function getDisbursementById(id) {
  return request(`/api/disbursements/id/${id}`);
}

/**
 * Lấy danh sách giải ngân theo loanApplicationId.
 * @param {string} loanApplicationId - UUID loan application
 */
export async function getDisbursementsByLoanApplicationId(loanApplicationId) {
  return request(`/api/disbursements/loan-application/id/${loanApplicationId}`);
}

// --- Financial snapshots (/api/financial-snapshots) ---

/**
 * Lấy financial snapshot theo id.
 * @param {string} id - UUID financial snapshot
 */
export async function getFinancialSnapshotById(id) {
  return request(`/api/financial-snapshots/id/${id}`);
}

/**
 * Lấy danh sách financial snapshot theo customerId.
 * @param {string} customerId - UUID customer
 */
export async function getFinancialSnapshotsByCustomerId(customerId) {
  return request(`/api/financial-snapshots/customer/id/${customerId}`);
}
