/**
 * Phân luồng theo role sau đăng nhập (ADMIN, ANALYSTIC, STAFF).
 * Backend: IdentityService enum Role.
 * 
 * Note: ADMIN quản lý users/employees, không quản lý customers.
 * STAFF và ANALYSTIC quản lý customers và predictions.
 * WARNING: Backend dùng "ANALYSTIC" (có lỗi chính tả), không phải "ANALYTICS"
 */
export const ROLE_ROUTES = {
  ADMIN: '/src/pages/users/list/ListUser.html',
  ANALYSTIC: '/src/pages/analytics/predictions/list/ListPrediction.html',
  STAFF: '/src/pages/customers/list/ListCustomer.html',
};

const DEFAULT_ROUTE = '/';

/**
 * Trả về URL redirect theo role (ADMIN | ANALYSTIC | STAFF).
 * @param {string} role - role từ login response
 * @returns {string}
 */
export function getRedirectUrlByRole(role) {
  if (!role || typeof role !== 'string') return DEFAULT_ROUTE;
  const normalized = role.toUpperCase();
  return ROLE_ROUTES[normalized] ?? DEFAULT_ROUTE;
}

/**
 * Kiểm tra user có được phép vào route của role này không.
 * @param {string} role - role trong storage
 * @param {string} requiredRole - role yêu cầu (vd 'ADMIN')
 */
export function canAccessRole(role, requiredRole) {
  if (!role) return false;
  return role.toUpperCase() === requiredRole.toUpperCase();
}
