// Identity service: login, logout, refresh, signup, user profiles (khớp IdentityService backend)

import { API_BASE_URLS } from '../utils/constants.js';

const BASE = API_BASE_URLS.identity;

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  console.log('[identity.service] Request:', options.method || 'GET', url);
  console.log('[identity.service] Headers:', options.headers);
  console.log('[identity.service] Body:', options.body);
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('[identity.service] Response status:', res.status);
  
  if (!res.ok) {
    const text = await res.text();
    console.error('[identity.service] Error response:', text);
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

  // No content
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;

  // Tùy theo Content-Type mà parse JSON hay text
  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    const data = await res.json();
    console.log('[identity.service] Response data:', data);
    return data;
  }

  // Ví dụ: /api/auth/signup trả về "User registered successfully"
  const text = await res.text();
  console.log('[identity.service] Response text:', text);
  return text;
  } catch (error) {
    console.error('[identity.service] Fetch error:', error);
    console.error('[identity.service] Error name:', error.name);
    console.error('[identity.service] Error message:', error.message);
    throw error;
  }
}

// --- Auth (/api/auth) ---

/**
 * Đăng nhập. Trả về { userId, accessToken, refreshToken, tokenType, email, role, firstLogin }.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Làm mới access token bằng refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ newAccessToken: string, newRefreshToken: string }>}
 */
export async function refreshToken(refreshToken) {
  return request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Đăng xuất (blacklist refresh token). Cần gửi Bearer token trong header.
 * @param {string} accessToken - Bearer token hiện tại
 * @param {string} refreshToken - Refresh token cần invalidate
 */
export async function logout(accessToken, refreshToken) {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Đăng ký user mới (chỉ ADMIN). Cần Bearer token của admin.
 * @param {string} accessToken - Bearer token (ADMIN)
 * @param {{ email: string, password: string, passwordConfirm: string, role: string }} body - role: ADMIN | ANALYSTIC | STAFF
 */
export async function signup(accessToken, body) {
  return request('/api/auth/signup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

// --- User profiles (/api/users-profiles) ---

/**
 * Lấy profile của user hiện tại (theo X-User-Id).
 * @param {string} userId - UUID user (thường từ login response)
 * @param {string} [accessToken] - Bearer token (nếu backend yêu cầu)
 */
export async function getCurrentProfile(userId, accessToken) {
  return request('/api/users-profiles/me', {
    method: 'GET',
    headers: {
      'X-User-Id': userId,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
}

/**
 * Lấy profile theo userId.
 * @param {string} userId - UUID user
 * @param {string} [accessToken]
 */
export async function getProfileById(userId, accessToken) {
  return request(`/api/users-profiles/id/${userId}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

/**
 * Lấy profile theo user slug.
 * @param {string} userSlug
 * @param {string} [accessToken]
 */
export async function getProfileBySlug(userSlug, accessToken) {
  const encoded = encodeURIComponent(userSlug);
  return request(`/api/users-profiles/slug/${encoded}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

/**
 * Cập nhật profile của user hiện tại (PUT /me).
 * @param {string} userId - X-User-Id
 * @param {Object} body - UserProfileRequestDto (các field cần cập nhật)
 * @param {string} [accessToken]
 */
export async function updateCurrentProfile(userId, body, accessToken) {
  return request('/api/users-profiles/me', {
    method: 'PUT',
    headers: {
      'X-User-Id': userId,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify(body),
  });
}

/**
 * Cập nhật profile theo userId (PUT /id/{userId}) – chỉ ADMIN.
 * @param {string} accessToken - Bearer token (ADMIN)
 * @param {string} userId - UUID user cần cập nhật
 * @param {Object} body - UserProfileRequestDto
 */
export async function updateProfileById(accessToken, userId, body) {
  return request(`/api/users-profiles/id/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Tìm kiếm users theo query (userId, userSlug, hoặc email).
 * @param {string} query - Chuỗi tìm kiếm
 * @param {string} [accessToken] - Bearer token (nếu cần)
 */
export async function searchUsers(query, accessToken) {
  // Thử tìm theo từng loại
  const results = [];
  
  // Thử tìm theo userId
  try {
    const profile = await getProfileById(query, accessToken);
    if (profile) results.push(profile);
  } catch (err) {
    // Không tìm thấy hoặc lỗi, bỏ qua
  }
  
  // Thử tìm theo userSlug
  try {
    const profile = await getProfileBySlug(query, accessToken);
    if (profile && !results.find(r => r.userId === profile.userId)) {
      results.push(profile);
    }
  } catch (err) {
    // Không tìm thấy hoặc lỗi, bỏ qua
  }
  
  // Nếu query là email, có thể cần thêm API endpoint từ backend
  // Tạm thời return results đã tìm được
  return results;
}

/**
 * Lấy danh sách tất cả users (chỉ ADMIN).
 * @param {string} accessToken - Bearer token (ADMIN)
 * @param {number} [page=0] - Số trang
 * @param {number} [size=10] - Kích thước trang
 */
export async function getAllUsers(accessToken, page = 0, size = 10) {
  return request(`/api/users-profiles/all?page=${page}&size=${size}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
