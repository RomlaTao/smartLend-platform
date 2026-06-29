// Customer service: Interact with CustomerService backend

import { API_BASE_URLS } from '../utils/constants.js';

const BASE = API_BASE_URLS.customer;
const ACCESS_TOKEN_KEY = 'smartlend_access_token';

// Get access token from storage
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const token = getAccessToken();
  
  console.log('[CustomerService] Request:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
  });
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  console.log('[CustomerService] Response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('[CustomerService] Error response:', text);
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

/**
 * Get customer by ID
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<Object>} Customer data
 */
export async function getCustomerById(customerId) {
  return request(`/api/customers/id/${customerId}`);
}

/**
 * Get all customers with pagination
 * @param {number} [page=0]
 * @param {number} [size=10]
 * @returns {Promise<Object>} Paginated customer list
 */
export async function getAllCustomers(page = 0, size = 10) {
  return request(`/api/customers?page=${page}&size=${size}`);
}

/**
 * Create a new customer
 * @param {Object} customerData - Customer data
 * @returns {Promise<Object>} Created customer
 */
export async function createCustomer(customerData) {
  return request('/api/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
}

/**
 * Update customer
 * @param {string} customerId - UUID of the customer
 * @param {Object} customerData - Updated customer data
 * @returns {Promise<Object>} Updated customer
 */
export async function updateCustomer(customerId, customerData) {
  return request(`/api/customers/id/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(customerData),
  });
}
