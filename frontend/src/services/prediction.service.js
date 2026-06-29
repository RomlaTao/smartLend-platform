// Prediction service: Interact with PredictionService backend

import { API_BASE_URLS } from '../utils/constants.js';

const BASE = API_BASE_URLS.prediction;
const ACCESS_TOKEN_KEY = 'smartlend_access_token';

// Get access token from storage
function getAccessToken() {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    ''
  );
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

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null;
  }

  return res.json();
}

/**
 * Create a new prediction
 * Maps to POST /api/predictions
 *
 * @param {Object} payload - Body for PredictionRequestDto
 * @param {string} staffId - UUID to send as X-User-Id header
 * @param {string} [staffName] - Staff name to send as query param
 * @returns {Promise<Object>} PredictionResponseDto
 */
export async function createPrediction(payload, staffId, staffName) {
  const query = staffName ? `?staffName=${encodeURIComponent(staffName)}` : '';
  return request(`/api/predictions${query}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Register prediction from loan
 * Maps to POST /api/predictions/register-from-loan
 *
 * @param {Object} payload - Body for RegisterPredictionFromLoanRequestDto
 * @param {string} staffId - UUID to send as X-User-Id header
 * @returns {Promise<Object>} PredictionResponseDto
 */
export async function registerPredictionFromLoan(payload, staffId) {
  return request('/api/predictions/register-from-loan', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Get prediction by ID
 * Maps to GET /api/predictions/id/{predictionId}
 *
 * @param {string} predictionId - UUID of the prediction
 * @param {string} staffId - UUID to send as X-User-Id header
 * @returns {Promise<{
 *   predictionId: string,
 *   customerId: string,
 *   employeeId: string,
 *   customerName: string,
 *   status: 'PENDING'|'COMPLETED'|'FAILED',
 *   predictionResult: boolean|null,
 *   confidence: number|null,
 *   riskLevel: string|null,
 *   explanation: {
 *     riskLevel: string,
 *     shapBaseValue: number,
 *     shapValues: Record<string, number>,
 *     limeFeatures: Array<{ rule: string, weight: number }>
 *   }|null,
 *   createdAt: string,
 *   completedAt: string|null
 * }>}
 */
export async function getPredictionById(predictionId, staffId) {
  return request(`/api/predictions/id/${predictionId}`, {
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Get predictions by customer ID
 * Maps to GET /api/predictions/customer/id/{customerId}
 *
 * @param {string} customerId - UUID of the customer
 * @param {string} staffId - UUID to send as X-User-Id header
 * @returns {Promise<Array<Object>>} List of PredictionResponseDto
 */
export async function getPredictionsByCustomerId(customerId, staffId) {
  return request(`/api/predictions/customer/id/${customerId}`, {
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Get predictions by employee ID
 * Maps to GET /api/predictions/employee/id/{employeeId}
 *
 * @param {string} employeeId - UUID of the employee
 * @param {string} staffId - UUID to send as X-User-Id header
 * @returns {Promise<Array<Object>>} List of PredictionResponseDto
 */
export async function getPredictionsByEmployeeId(employeeId, staffId) {
  return request(`/api/predictions/employee/id/${employeeId}`, {
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Get current employee predictions
 * Maps to GET /api/predictions/employee/id/me
 *
 * @param {string} staffId - UUID to send as X-User-Id header
 * @returns {Promise<Array<Object>>} List of PredictionResponseDto
 */
export async function getCurrentEmployeePredictions(staffId) {
  return request('/api/predictions/employee/id/me', {
    headers: staffId ? { 'X-User-Id': staffId } : {},
  });
}

/**
 * Get all predictions with pagination
 * Maps to GET /api/predictions
 *
 * @param {Object} params
 * @param {number} [params.page] - zero-based page index
 * @param {number} [params.size] - page size
 * @param {string|string[]} [params.sort] - sort parameter(s), e.g. "createdAt,desc"
 * @returns {Promise<PageResponse<PredictionResponseDto>>}
 */
export async function getAllPredictions(params = {}) {
  const searchParams = new URLSearchParams();

  if (typeof params.page === 'number') {
    searchParams.append('page', String(params.page));
  }
  if (typeof params.size === 'number') {
    searchParams.append('size', String(params.size));
  }
  if (params.sort) {
    const sorts = Array.isArray(params.sort) ? params.sort : [params.sort];
    sorts.forEach((s) => searchParams.append('sort', s));
  }

  const query = searchParams.toString();
  const path = query ? `/api/predictions?${query}` : '/api/predictions';

  return request(path);
}

