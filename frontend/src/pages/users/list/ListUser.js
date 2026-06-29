/**
 * Trang danh sách users/employees (ADMIN only).
 * Guard: chỉ cho phép user có role ADMIN; nếu chưa đăng nhập hoặc không phải ADMIN → redirect về login.
 * Note: ADMIN quản lý users/employees, KHÔNG quản lý customers.
 */

import { getAllUsers, signup } from '/src/services/identity.service.js';
import { loadAndRenderEditForm, submitEditForm, showEditFormError } from '/src/pages/users/edit/edit-profile-renderer.js';
import { loadAndRenderProfileById } from '/src/pages/share/my-profile/my-profile-renderer.js';
import { showConfirm } from '/src/utils/notify.js';
import {
  EMPTY_LABEL,
  formatDateVi,
  formatUserRole,
  orEmpty,
} from '/src/utils/formatter.js';

const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const ROLE_KEY = 'smartlend_role';
const USER_ID_KEY = 'smartlend_user_id';
const TOKEN_KEYS = ['smartlend_access_token', 'smartlend_refresh_token', 'smartlend_user_id', 'smartlend_email', 'smartlend_role'];
const LOGIN_URL = '/src/pages/share/login/login.html';

let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
let pageSize = 10;

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
}

function getAccessToken() {
  return getStoredValue(ACCESS_TOKEN_KEY);
}

function getStoredRole() {
  return getStoredValue(ROLE_KEY);
}

function hasAuth() {
  return !!getAccessToken();
}

function clearAuth() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function requireAdmin() {
  if (!hasAuth()) {
    window.location.replace(LOGIN_URL);
    return false;
  }
  const role = getStoredRole();
  if (role.toUpperCase() !== 'ADMIN') {
    window.location.replace(LOGIN_URL);
    return false;
  }
  return true;
}

function formatDate(dateString) {
  return formatDateVi(dateString);
}

function getRoleBadge(role) {
  const key = (role || '').toUpperCase();
  const label = formatUserRole(key);
  switch (key) {
    case 'ADMIN':
      return `<span class="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-tighter">${label}</span>`;
    case 'ANALYSTIC':
      return `<span class="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-tighter">${label}</span>`;
    case 'STAFF':
      return `<span class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-tighter">${label}</span>`;
    default:
      return `<span class="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-tighter">${label}</span>`;
  }
}

function renderUserRow(user) {
  const statusBadge = user.isActive 
    ? '<span class="flex items-center gap-1.5 text-green-700 font-bold text-xs"><span class="w-2 h-2 rounded-full bg-green-500"></span>Đang hoạt động</span>'
    : '<span class="flex items-center gap-1.5 text-red-700 font-bold text-xs"><span class="w-2 h-2 rounded-full bg-red-500"></span>Vô hiệu hóa</span>';

  return `
    <tr class="hover:bg-gray-50/80 transition-colors">
      <td class="px-6 py-4 font-bold text-gray-900">${orEmpty(user.fullName)}</td>
      <td class="px-6 py-4 text-gray-500 font-medium">${orEmpty(user.email)}</td>
      <td class="px-6 py-4">${getRoleBadge(user.role)}</td>
      <td class="px-6 py-4 text-gray-500 font-medium">${orEmpty(user.department)}</td>
      <td class="px-6 py-4">${statusBadge}</td>
      <td class="px-6 py-4 text-gray-500 font-medium">${formatDate(user.createdAt)}</td>
      <td class="px-6 py-4">
        <div class="flex justify-center gap-1">
          <button onclick="openViewProfileModal('${user.userId}')" class="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-primary rounded-lg transition-colors" title="Xem hồ sơ"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
          <button onclick="openEditProfileModal('${user.userId}')" class="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-primary rounded-lg transition-colors" title="Chỉnh sửa hồ sơ"><span class="material-symbols-outlined text-[20px]">edit</span></button>
          <button class="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors" title="${user.isActive ? 'Khóa người dùng' : 'Mở khóa người dùng'}"><span class="material-symbols-outlined text-[20px]">${user.isActive ? 'lock' : 'lock_open'}</span></button>
        </div>
      </td>
    </tr>
  `;
}

function renderUsers(users) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          Không có người dùng nào
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => renderUserRow(user)).join('');
}

async function loadUsers(page = 0) {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error('No access token found');
      window.location.replace(LOGIN_URL);
      return;
    }

    const response = await getAllUsers(accessToken, page, pageSize);
    console.log('Users loaded:', response);

    // Response structure: { content: [...], totalElements, totalPages, number, size }
    if (response && response.content) {
      renderUsers(response.content);
      currentPage = response.number || 0;
      totalPages = response.totalPages || 0;
      totalElements = response.totalElements || 0;
      updatePagination();
    }
  } catch (error) {
    console.error('Error loading users:', error);
    alert('Không thể tải danh sách người dùng: ' + (error.message || 'Lỗi không xác định'));
  }
}

function updatePagination() {
  const paginationInfo = document.getElementById('user-pagination-info');
  if (paginationInfo) {
    if (totalElements === 0) {
      paginationInfo.innerHTML = 'Không có bản ghi';
    } else {
      const start = currentPage * pageSize + 1;
      const end = Math.min((currentPage + 1) * pageSize, totalElements);
      paginationInfo.innerHTML = `Hiển thị <span class="text-gray-900">${start} - ${end}</span> trong <span class="text-gray-900">${totalElements}</span> bản ghi`;
    }
  }
  renderPaginationControls();
}

function generatePageButtons() {
  if (totalPages <= 0) return '';

  let buttons = '';
  const maxButtons = 3;
  let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(0, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    buttons += `
      <button
        onclick="window.goToUserPage(${i})"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${i === currentPage ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'border border-transparent text-gray-600 hover:bg-white hover:border-gray-200'}">
        ${i + 1}
      </button>`;
  }
  return buttons;
}

function renderPaginationControls() {
  const container = document.getElementById('user-pagination-controls');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button
      onclick="window.goToUserPage(${currentPage - 1})"
      class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-white hover:text-primary transition-all disabled:opacity-30"
      ${currentPage === 0 ? 'disabled' : ''}>
      <span class="material-symbols-outlined text-xl">chevron_left</span>
    </button>
    ${generatePageButtons()}
    <button
      onclick="window.goToUserPage(${currentPage + 1})"
      class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-white hover:text-primary transition-all disabled:opacity-30"
      ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
      <span class="material-symbols-outlined text-xl">chevron_right</span>
    </button>`;
}

window.goToUserPage = function(page) {
  if (page < 0 || page >= totalPages) return;
  currentPage = page;
  loadUsers(page);
};

async function handleCreateUser(e) {
  e.preventDefault();

  const formError = document.getElementById('form-error');
  formError.classList.add('hidden');

  const fullName = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  // Validation
  if (!fullName || !email || !role || !password || !passwordConfirm) {
    formError.textContent = 'Vui lòng điền đầy đủ tất cả các trường';
    formError.classList.remove('hidden');
    return;
  }

  if (password !== passwordConfirm) {
    formError.textContent = 'Mật khẩu xác nhận không khớp';
    formError.classList.remove('hidden');
    return;
  }

  if (password.length < 6) {
    formError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
    formError.classList.remove('hidden');
    return;
  }

  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      formError.textContent = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      formError.classList.remove('hidden');
      setTimeout(() => window.location.replace(LOGIN_URL), 1500);
      return;
    }

    const requestBody = {
      fullName,
      email,
      password,
      passwordConfirm,
      role
    };

    await signup(accessToken, requestBody);
    alert('Tạo người dùng thành công!');
    
    // Close modal and reload users
    document.getElementById('create-user-modal').classList.add('hidden');
    document.getElementById('create-user-modal').classList.remove('flex');
    document.body.style.overflow = 'auto';
    document.getElementById('create-user-form').reset();
    
    // Reload users list
    loadUsers(currentPage);
  } catch (error) {
    console.error('Error creating user:', error);
    formError.textContent = error.message || 'Không thể tạo người dùng';
    formError.classList.remove('hidden');
  }
}

// ─── View Profile Modal ───────────────────────────────────────────────────────

let _viewModalUserId = null;

window.openViewProfileModal = async function(userId) {
    _viewModalUserId = userId;

    const modal  = document.getElementById('view-profile-modal');
    const body   = document.getElementById('view-profile-modal-body');
    const editBtn = document.getElementById('vp-edit-btn');
    if (!modal || !body) return;

    // Reset
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (editBtn) editBtn.classList.add('hidden');
    body.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 gap-3">
            <span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">person</span>
            <p class="text-sm text-gray-400">Đang tải hồ sơ...</p>
        </div>`;

    try {
        const accessToken = getAccessToken();
        if (!accessToken) throw new Error('Chưa đăng nhập');
        await loadAndRenderProfileById(userId, accessToken, body);

        // Show Edit button after successful load
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.onclick = () => {
                closeViewProfileModal();
                openEditProfileModal(userId);
            };
        }
    } catch (err) {
        console.error('Error loading view profile:', err);
        body.innerHTML = `
            <div class="flex flex-col items-center gap-2 py-12">
                <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                <p class="text-sm text-red-500 font-semibold">${err.message || 'Không thể tải hồ sơ'}</p>
            </div>`;
    }
};

window.closeViewProfileModal = function() {
    const modal = document.getElementById('view-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    _viewModalUserId = null;
};

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

let _editModalUserId = null;

window.openEditProfileModal = async function(userId) {
    _editModalUserId = userId;

    const modal       = document.getElementById('edit-profile-modal');
    const loadingEl   = document.getElementById('ep-loading');
    const errorEl     = document.getElementById('ep-error');
    const containerEl = document.getElementById('ep-form-container');
    const footerEl    = document.getElementById('ep-footer');
    if (!modal) return;

    // Show modal in loading state
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    loadingEl?.classList.remove('hidden');
    errorEl?.classList.add('hidden');
    containerEl?.classList.add('hidden');
    footerEl?.classList.add('hidden');

    try {
        const accessToken = getAccessToken();
        if (!accessToken) throw new Error('Chưa đăng nhập');
        await loadAndRenderEditForm(userId, accessToken, containerEl);
        loadingEl?.classList.add('hidden');
        containerEl?.classList.remove('hidden');
        footerEl?.classList.remove('hidden');
    } catch (err) {
        console.error('Error loading edit form:', err);
        loadingEl?.classList.add('hidden');
        const msgEl = document.getElementById('ep-error-message');
        if (msgEl) msgEl.textContent = err.message || 'Không thể tải hồ sơ';
        errorEl?.classList.remove('hidden');
    }
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    _editModalUserId = null;
};

window.submitEditProfileModal = async function() {
    if (!_editModalUserId) return;

    const confirmed = await showConfirm('Bạn có chắc muốn cập nhật thông tin người dùng này?', {
        confirmText: 'Cập nhật',
        cancelText: 'Hủy',
    });
    if (!confirmed) return;

    const saveBtn = document.querySelector('#edit-profile-modal button[onclick="submitEditProfileModal()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Đang lưu...';
    }

    try {
        const accessToken = getAccessToken();
        if (!accessToken) throw new Error('Chưa đăng nhập');
        await submitEditForm(accessToken, _editModalUserId);
        window.closeEditProfileModal();
        alert('Cập nhật hồ sơ thành công!');
        loadUsers(currentPage);
    } catch (err) {
        if (err.message !== 'Validation failed') {
            showEditFormError(err.message || 'Không thể cập nhật hồ sơ');
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Lưu thay đổi';
        }
    }
};

function init() {
  if (!requireAdmin()) return;

  // Load users on page load
  loadUsers(0);

  // Create user form
  const createUserForm = document.getElementById('create-user-form');
  if (createUserForm) {
    createUserForm.addEventListener('submit', handleCreateUser);
  }

  // Logout functionality
  document.getElementById('admin-logout-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuth();
    window.location.href = LOGIN_URL;
  });
}

document.addEventListener('DOMContentLoaded', init);
