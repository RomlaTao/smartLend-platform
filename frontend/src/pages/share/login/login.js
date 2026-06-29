// login.js - Login page logic

import { login } from '/src/services/identity.service.js';
import { getRedirectUrlByRole } from '/src/utils/roleRoutes.js';

const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const REFRESH_TOKEN_KEY = 'smartlend_refresh_token';
const USER_ID_KEY = 'smartlend_user_id';
const EMAIL_KEY = 'smartlend_email';
const ROLE_KEY = 'smartlend_role';

function saveToStorage(key, value, remember) {
  if (remember) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
}

function getLoginElements() {
  // Dựa đúng structure trong login.html:
  // - 1 form duy nhất
  // - input text: email/username
  // - input password
  // - checkbox id="remember"
  // - button[type="submit"] có span label + div spinner
  const form = document.querySelector('form');
  if (!form) {
    console.error('[Login] Form not found');
    return null;
  }

  const emailInput = form.querySelector('input[type="text"]');
  const passwordInput = form.querySelector('input[type="password"]');
  const rememberCheckbox = document.getElementById('remember');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!emailInput || !passwordInput || !submitBtn) {
    console.error('[Login] Required form controls not found');
    return null;
  }

  const labelSpan = submitBtn.querySelector('span');
  const spinner = submitBtn.querySelector('div');

  return {
    form,
    emailInput,
    passwordInput,
    rememberCheckbox,
    submitBtn,
    labelSpan,
    spinner,
  };
}

function setLoadingState(submitBtn, labelSpan, spinner, isLoading) {
  if (!submitBtn) return;

  submitBtn.disabled = isLoading;

  if (labelSpan && spinner) {
    if (isLoading) {
      labelSpan.classList.add('hidden');
      spinner.classList.remove('hidden');
    } else {
      labelSpan.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  } else {
    submitBtn.textContent = isLoading ? 'Đang đăng nhập...' : 'Đăng nhập';
  }
}

function showError(message) {
  // UI hiện tại không có error box riêng → dùng alert đơn giản
  alert(message);
}

async function handleLogin(e) {
  e.preventDefault();

  const els = getLoginElements();
  if (!els) return;

  const { emailInput, passwordInput, rememberCheckbox, submitBtn, labelSpan, spinner } = els;

  const email = (emailInput.value || '').trim();
  const password = passwordInput.value || '';
  const rememberMe = !!(rememberCheckbox && rememberCheckbox.checked);

  if (!email || !password) {
    showError('Vui lòng nhập email/tên đăng nhập và mật khẩu.');
    return;
  }

  setLoadingState(submitBtn, labelSpan, spinner, true);

  try {
    const response = await login(email, password);

    console.log('[Login] Success:', response);

    // Save tokens and user info
    saveToStorage(ACCESS_TOKEN_KEY, response.accessToken, rememberMe);
    saveToStorage(REFRESH_TOKEN_KEY, response.refreshToken, rememberMe);
    saveToStorage(USER_ID_KEY, response.userId, rememberMe);
    saveToStorage(EMAIL_KEY, response.email, rememberMe);
    saveToStorage(ROLE_KEY, response.role, rememberMe);

    // Redirect based on role
    const redirectUrl = getRedirectUrlByRole(response.role);
    console.log('[Login] Redirecting to:', redirectUrl);

    window.location.href = redirectUrl;
  } catch (error) {
    console.error('[Login] Error:', error);
    showError(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.');
  } finally {
    setLoadingState(submitBtn, labelSpan, spinner, false);
  }
}

function init() {
  // Check if already logged in
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    const role = localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY);
    const redirectUrl = getRedirectUrlByRole(role);
    console.log('[Login] Already logged in, redirecting to:', redirectUrl);
    window.location.replace(redirectUrl);
    return;
  }

  const els = getLoginElements();
  if (!els) return;

  const { form, passwordInput } = els;

  form.addEventListener('submit', handleLogin);

  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin(e);
      }
    });
  }
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
