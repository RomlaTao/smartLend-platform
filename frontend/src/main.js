// Entry point for SmartLend frontend (Vite + Tailwind + vanilla JS)
// Phân luồng: chưa đăng nhập → login; đã đăng nhập → redirect theo role
// - ADMIN → ListUser (quản lý users/employees)
// - STAFF/ANALYSTIC → ListCustomer (quản lý customers)
import { getRedirectUrlByRole } from './utils/roleRoutes.js';

const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const ROLE_KEY = 'smartlend_role';
const TOKEN_KEYS = ['smartlend_access_token', 'smartlend_refresh_token', 'smartlend_user_id', 'smartlend_email', 'smartlend_role'];

function hasAuth() {
  return !!(localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY));
}

function getStoredRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || '';
}

function clearAuth() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

if (!hasAuth()) {
  window.location.replace('/src/pages/share/login/login.html');
} else {
  const role = getStoredRole();
  const redirectUrl = getRedirectUrlByRole(role);
  // Nếu role có trang riêng (vd ADMIN → ListCustomer) thì chuyển hướng, không render welcome
  if (redirectUrl !== '/') {
    window.location.replace(redirectUrl);
  } else {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div class="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 font-display">
          <div class="max-w-md w-full text-center">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">SmartLend</h1>
            <p class="text-slate-600 mb-6">CreditFlow – Intelligent Credit Decision Platform</p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/src/pages/share/login/login.html" id="logout-link" class="inline-flex items-center justify-center rounded-lg h-12 px-6 border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">Đăng xuất</a>
            </div>
            <p class="mt-8 text-xs text-slate-400">Chạy local: npm run dev → http://localhost:5173</p>
          </div>
        </div>
      `;
      document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = '/src/pages/share/login/login.html';
      });
    }
  }
}
