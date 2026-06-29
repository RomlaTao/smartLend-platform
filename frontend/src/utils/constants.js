// Shared constants (API base URLs, keys, etc.)
// Gọi qua API Gateway (8080) để có CORS đúng; Gateway route /api/auth, /api/customers, ... tới từng service.
const GATEWAY_URL = import.meta.env?.VITE_API_GATEWAY_URL || 'http://localhost:8080';

export const API_BASE_URLS = {
  identity: import.meta.env?.VITE_IDENTITY_API_URL || GATEWAY_URL,
  customer: import.meta.env?.VITE_CUSTOMER_API_URL || GATEWAY_URL,
  prediction: import.meta.env?.VITE_PREDICTION_API_URL || GATEWAY_URL,
  loanManagement: import.meta.env?.VITE_LOAN_MANAGEMENT_API_URL || GATEWAY_URL,
};
