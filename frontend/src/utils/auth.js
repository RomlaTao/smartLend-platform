/**
 * Auth helpers dùng chung (logout, clear session).
 */
export const AUTH_KEYS = [
  'smartlend_access_token',
  'smartlend_refresh_token',
  'smartlend_user_id',
  'smartlend_email',
  'smartlend_role',
];

export const LOGIN_URL = '/src/pages/share/login/login.html';
export const PROFILE_URL = '/src/pages/share/my-profile/MyProfile.html';

export function clearAuth() {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function getStoredEmail() {
  return localStorage.getItem('smartlend_email') || sessionStorage.getItem('smartlend_email') || '';
}

export function getStoredUserId() {
  return localStorage.getItem('smartlend_user_id') || sessionStorage.getItem('smartlend_user_id') || '';
}
