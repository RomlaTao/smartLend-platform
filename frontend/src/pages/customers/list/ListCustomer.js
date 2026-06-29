// ListCustomer.js - Logic for customer list page with staff actions

import { getAllCustomers } from '../../../services/customer.service.js';
import { getCurrentProfile } from '../../../services/identity.service.js';
import { loadAndRenderMyProfile } from '/src/pages/share/my-profile/my-profile-renderer.js';
import { loadAndRenderEditMyProfileForm, submitEditMyProfileForm, showEditMyProfileError } from '/src/pages/share/edit-my-profile/edit-my-profile-renderer.js';
import { loadAndRenderCustomerView, loadAndRenderCustomerEditForm, submitCustomerEditForm, showCustomerFormError } from '/src/pages/customers/edit/edit-customer-renderer.js';
import { renderCreateCustomerFormHtml, submitCreateCustomerForm, showCreateCustomerError, resetCreateCustomerForm } from '/src/pages/customers/create/create-customer-renderer.js';
import { renderCreateLoanFormHtml, initCreateLoanFormListeners, loadCustomerInfoForLoan, submitCreateLoanForm, showCreateLoanError, resetCreateLoanForm } from '/src/pages/loan/create/create-loan-renderer.js';

const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const ROLE_KEY = 'smartlend_role';
const USER_ID_KEY = 'smartlend_user_id';
const EMAIL_KEY = 'smartlend_email';
const TOKEN_KEYS = ['smartlend_access_token', 'smartlend_refresh_token', 'smartlend_user_id', 'smartlend_email', 'smartlend_role'];
const LOGIN_URL = '/src/pages/share/login/login.html';

// Get stored value from localStorage or sessionStorage
function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
}

// Get access token
function getAccessToken() {
  return getStoredValue(ACCESS_TOKEN_KEY);
}

// Get stored role
function getStoredRole() {
  return getStoredValue(ROLE_KEY);
}

// Check if user is authenticated
function hasAuth() {
  return !!getAccessToken();
}

// Check if user is authenticated and redirect if not
function checkAuth() {
  if (!hasAuth()) {
    window.location.replace(LOGIN_URL);
    return false;
  }
  return true;
}

// Get current user info
function getCurrentUser() {
  return {
    accessToken: getAccessToken(),
    role: getStoredRole(),
    userId: getStoredValue(USER_ID_KEY),
    email: getStoredValue(EMAIL_KEY)
  };
}

// State
let currentPage = 0;
const pageSize = 10;
let totalPages = 0;
let totalElements = 0;
let allCustomers = [];

const ROLE_LABELS = {
  'STAFF': 'Nhân viên',
  'ADMIN': 'Quản trị viên',
  'ANALYSTIC': 'Phân tích viên',
};

async function initSidebarUserName() {
  const nameEl = document.getElementById('customer-sidebar-fullname');
  const roleEl = document.getElementById('customer-sidebar-role');

  if (roleEl) {
    const role = getStoredRole().toUpperCase();
    roleEl.textContent = ROLE_LABELS[role] || role;
  }

  if (!nameEl) return;
  try {
    const { accessToken, userId } = getCurrentUser();
    if (!accessToken || !userId) return;

    const profile = await getCurrentProfile(userId, accessToken);
    if (profile && profile.fullName) {
      nameEl.textContent = profile.fullName;
    }
  } catch (err) {
    console.error('[ListCustomer] Error loading sidebar user name:', err);
  }
}

// Render customer table
function renderCustomers(customers) {
  const tbody = document.getElementById('customer-table-body');
  if (!tbody) {
    console.error('[renderCustomers] tbody element not found!');
    return;
  }
  
  console.log('[renderCustomers] Rendering customers:', customers?.length || 0);
  
  const role = getStoredRole() || '';
  const canWrite = ['STAFF', 'ADMIN'].includes(role.toUpperCase());

  if (!customers || customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center gap-3">
            <span class="material-symbols-outlined text-slate-300 text-5xl">inbox</span>
            <p class="text-slate-500">Không có khách hàng nào</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = customers.map(customer => {
    // Debug log to check customer data
    console.log('[Customer Data]', {
      name: customer.fullName,
      loanGrade: customer.loanGrade,
      cbPersonDefaultOnFile: customer.cbPersonDefaultOnFile,
      cbPersonCredHistLength: customer.cbPersonCredHistLength
    });
    
    // Generate initials
    const initials = customer.fullName
      ? customer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'NA';
    
    // Determine loan grade info
    let gradeColor = 'gray';
    let gradeLabel = 'Không xác định';
    let gradeValue = 'N/A';
    
    // Handle loanGrade - could be string or object
    const loanGrade = typeof customer.loanGrade === 'object' 
      ? customer.loanGrade?.name || customer.loanGrade?.value 
      : customer.loanGrade;
    
    if (loanGrade) {
      gradeValue = loanGrade;
      switch (loanGrade) {
        case 'A':
          gradeColor = 'green';
          gradeLabel = 'Xuất sắc';
          break;
        case 'B':
          gradeColor = 'green';
          gradeLabel = 'Tốt';
          break;
        case 'C':
          gradeColor = 'yellow';
          gradeLabel = 'Trung bình';
          break;
        case 'D':
          gradeColor = 'orange';
          gradeLabel = 'Dưới trung bình';
          break;
        case 'E':
          gradeColor = 'orange';
          gradeLabel = 'Kém';
          break;
        case 'F':
        case 'G':
          gradeColor = 'red';
          gradeLabel = 'Rất kém';
          break;
        default:
          gradeValue = 'N/A';
          gradeLabel = 'Không xác định';
      }
    }
    
    // Home ownership badge color - handle string or object
    const homeOwnership = typeof customer.personHomeOwnership === 'object'
      ? customer.personHomeOwnership?.name || customer.personHomeOwnership?.value
      : customer.personHomeOwnership;
    
    let ownershipColor = 'purple';
    let ownershipDisplay = homeOwnership || 'N/A';
    
    if (homeOwnership === 'OWN') ownershipColor = 'green';
    else if (homeOwnership === 'MORTGAGE') ownershipColor = 'blue';
    else if (homeOwnership === 'RENT') ownershipColor = 'purple';
    else if (homeOwnership === 'OTHER') ownershipColor = 'gray';
    else ownershipColor = 'gray';
    
    // Format income (VND/năm)
    const income = customer.personIncome 
      ? `${customer.personIncome.toLocaleString('vi-VN')} VND/năm`
      : 'N/A';
    
    // Format age
    const age = customer.personAge 
      ? `${customer.personAge} tuổi`
      : 'N/A';
    
    // Format employment length
    const empLength = customer.personEmpLength != null
      ? `${customer.personEmpLength} năm kinh nghiệm`
      : 'N/A';
    
    // Format credit history length
    const creditHistLength = customer.cbPersonCredHistLength != null && customer.cbPersonCredHistLength !== undefined
      ? `${customer.cbPersonCredHistLength} năm tín dụng`
      : 'Chưa có lịch sử';
    
    // Default status (Y = has default, N = no default)
    const defaultOnFile = String(customer.cbPersonDefaultOnFile || '').toUpperCase();
    const hasDefault = defaultOnFile === 'Y' || defaultOnFile === 'YES' || defaultOnFile === 'TRUE';
    const defaultStatus = hasDefault 
      ? '<span class="size-1.5 rounded-full bg-red-500"></span><span class="text-red-600 dark:text-red-400">Đã từng vỡ nợ</span>'
      : '<span class="size-1.5 rounded-full bg-green-500"></span><span class="text-green-600 dark:text-green-400">Chưa từng vỡ nợ</span>';
    
    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">${initials}</div>
            <div>
              <p class="font-bold text-sm text-gray-900 dark:text-white">${customer.fullName || 'N/A'}</p>
              <p class="text-xs text-gray-500">${customer.email || 'Không có email'}</p>
              <p class="text-xs text-gray-400">ID: ${customer.customerSlug || 'N/A'}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="space-y-1">
            <p class="text-sm font-bold text-gray-900 dark:text-white">${age}</p>
            <p class="text-xs text-gray-500">${empLength}</p>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="space-y-1">
            <p class="text-sm font-bold text-gray-900 dark:text-white">${income}</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-${ownershipColor}-100 text-${ownershipColor}-700 dark:bg-${ownershipColor}-900/30 dark:text-${ownershipColor}-400 border border-${ownershipColor}-200 dark:border-${ownershipColor}-800">${ownershipDisplay}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center size-8 rounded-full bg-${gradeColor}-100 text-${gradeColor}-700 dark:bg-${gradeColor}-900/30 dark:text-${gradeColor}-400 font-bold text-sm">${gradeValue}</span>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${gradeLabel}</p>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="space-y-1">
            <p class="text-xs text-gray-500">${creditHistLength}</p>
            <span class="inline-flex items-center gap-1 text-[10px] font-medium">
              ${defaultStatus}
            </span>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex justify-center gap-1">
            <button
              onclick="window.viewCustomer('${customer.customerProfileId}')"
              class="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-primary rounded-lg transition-colors"
              title="Xem khách hàng">
              <span class="material-symbols-outlined text-[20px]">visibility</span>
            </button>
            ${canWrite ? `
              <button
                onclick="window.editCustomer('${customer.customerProfileId}')"
                class="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-primary rounded-lg transition-colors"
                title="Chỉnh sửa khách hàng">
                <span class="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button
                onclick="window.createLoanForCustomer('${customer.customerProfileId}')"
                class="w-8 h-8 flex items-center justify-center hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors"
                title="Tạo khoản vay">
                <span class="material-symbols-outlined text-[20px]">request_quote</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Load customers with pagination
async function loadCustomers(page = 0) {
  try {
    console.log(`[ListCustomer] Loading customers - page ${page}, size ${pageSize}`);
    
    const response = await getAllCustomers(page, pageSize);
    console.log('[ListCustomer] API Response:', response);
    console.log('[ListCustomer] Response type:', typeof response);
    console.log('[ListCustomer] Content:', response.content);
    
    allCustomers = response.content || [];
    currentPage = response.number || 0;
    totalPages = response.totalPages || 0;
    totalElements = response.totalElements || 0;
    
    console.log(`[ListCustomer] Loaded ${allCustomers.length} customers`);
    console.log('[ListCustomer] First customer sample:', allCustomers[0]);
    
    renderCustomers(allCustomers);
    updatePagination();
    updateResultsText();
    
  } catch (error) {
    console.error('[ListCustomer] Error loading customers:', error);
    console.error('[ListCustomer] Error stack:', error.stack);
    const tbody = document.getElementById('customer-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center">
            <div class="flex flex-col items-center gap-3">
              <span class="material-symbols-outlined text-red-300 text-5xl">error</span>
              <p class="text-red-500">Error loading customers: ${error.message}</p>
              <p class="text-xs text-gray-500">Check console for details</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

// Update pagination UI
function updatePagination() {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = `
    <button 
      ${currentPage === 0 ? 'disabled' : ''} 
      onclick="window.goToPage(${currentPage - 1})"
      class="size-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white transition-colors text-gray-500 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
    ${generatePageButtons()}
    <button 
      ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
      onclick="window.goToPage(${currentPage + 1})"
      class="size-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white transition-colors text-gray-500 ${currentPage >= totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;
}

// Generate page buttons
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
        onclick="window.goToPage(${i})"
        class="size-9 flex items-center justify-center rounded-lg ${i === currentPage ? 'bg-primary text-white font-bold' : 'hover:bg-white dark:hover:bg-gray-800'} transition-colors text-sm font-medium">
        ${i + 1}
      </button>
    `;
  }
  
  return buttons;
}

// Update results text
function updateResultsText() {
  const resultsText = document.getElementById('pagination-results-text');
  if (!resultsText) {
    console.warn('[updateResultsText] Results text element not found');
    return;
  }
  
  if (totalElements === 0) {
    resultsText.innerHTML = 'No customers found';
  } else {
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);
    resultsText.innerHTML = `Showing <span class="font-bold text-gray-900 dark:text-white">${start}</span> to <span class="font-bold text-gray-900 dark:text-white">${end}</span> of <span class="font-bold text-gray-900 dark:text-white">${totalElements}</span> entries`;
  }
  
  console.log(`[updateResultsText] Showing ${currentPage * pageSize + 1}-${Math.min((currentPage + 1) * pageSize, totalElements)} of ${totalElements}`);
}

// View customer details – handled by modal (see openCustomerModal in init)
function viewCustomerDetails(_customerId) { /* no-op: overridden by modal in init */ }

// Navigate to edit customer – handled by modal (see openCustomerModal in init)
function navigateToEditCustomer(_customerId) { /* no-op: overridden by modal in init */ }

// Navigate to create customer – handled by modal (see openCreateCustomerModal in init)
function navigateToCreateCustomer() { /* no-op: overridden by modal in init */ }

// Navigate to create loan – handled by modal (see openCreateLoanModal in init)
function navigateToCreateLoan(_customerId) { /* no-op: overridden by modal in init */ }

// Go to specific page
function goToPage(page) {
  if (page < 0 || page >= totalPages) return;
  currentPage = page;
  loadCustomers(page);
}

// Handle search
function handleSearch(event) {
  const query = event.detail?.query || '';
  console.log('[ListCustomer] Search query:', query);
  
  if (!query.trim()) {
    renderCustomers(allCustomers);
    return;
  }
  
  const filtered = allCustomers.filter(customer => {
    // Extract values handling both string and object types
    const loanGradeValue = typeof customer.loanGrade === 'object' 
      ? customer.loanGrade?.name || customer.loanGrade?.value || ''
      : customer.loanGrade || '';
    
    const homeOwnershipValue = typeof customer.personHomeOwnership === 'object'
      ? customer.personHomeOwnership?.name || customer.personHomeOwnership?.value || ''
      : customer.personHomeOwnership || '';
    
    const searchString = `
      ${customer.fullName || ''} 
      ${customer.email || ''} 
      ${customer.customerSlug || ''} 
      ${loanGradeValue} 
      ${homeOwnershipValue}
      ${customer.cbPersonCredHistLength || ''}
      ${customer.cbPersonDefaultOnFile || ''}
    `.toLowerCase();
    
    return searchString.includes(query.toLowerCase());
  });
  
  console.log(`[ListCustomer] Search results: ${filtered.length} customers found`);
  renderCustomers(filtered);
}

// Clear authentication
function clearAuth() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// Initialize page
function init() {
  // Check authentication first
  if (!checkAuth()) return;
  
  // Init sidebar user full name
  initSidebarUserName();

  const role = getStoredRole() || '';
  const canWrite = ['STAFF', 'ADMIN'].includes(role.toUpperCase());
  const isAnalyst = role.toUpperCase() === 'ANALYSTIC';

  // Show prediction nav link for ANALYST
  const predictionNavLink = document.getElementById('nav-prediction-link');
  if (predictionNavLink && isAnalyst) {
    predictionNavLink.classList.remove('hidden');
  }

  // Show/hide create button based on role
  const createBtn = document.querySelector('button[type="button"]');
  if (createBtn) {
    if (canWrite) {
      createBtn.addEventListener('click', navigateToCreateCustomer);
    } else {
      createBtn.style.display = 'none';
    }
  }
  
  // Load customers
  loadCustomers(0);
  
  // Listen for search events
  document.addEventListener('header-search', handleSearch);
  
  // Logout functionality
  const logoutLink = document.getElementById('customer-logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = LOGIN_URL;
    });
  }
  
  // Expose global functions for onclick handlers
  window.goToPage = goToPage;

  // ── Customer Detail Modal ────────────────────────────────────────────────
  let _cdmCustomerId = null;

  function _cdmSetViewMode() {
    document.getElementById('cdm-title').textContent    = 'Chi tiết khách hàng';
    document.getElementById('cdm-subtitle').textContent = 'Xem thông tin hồ sơ khách hàng';
    document.getElementById('cdm-view-body')?.classList.remove('hidden');
    document.getElementById('cdm-edit-body')?.classList.add('hidden');
    document.getElementById('cdm-edit-footer')?.classList.add('hidden');
  }

  function _cdmSetEditMode() {
    document.getElementById('cdm-title').textContent    = 'Chỉnh sửa khách hàng';
    document.getElementById('cdm-subtitle').textContent = 'Cập nhật thông tin tài chính khách hàng';
    document.getElementById('cdm-view-body')?.classList.add('hidden');
    document.getElementById('cdm-edit-body')?.classList.remove('hidden');
    document.getElementById('cdm-edit-footer')?.classList.remove('hidden');
    document.getElementById('cdm-edit-btn')?.classList.add('hidden');
  }

  function openCustomerModal(customerId, mode = 'view') {
    _cdmCustomerId = customerId;
    const modal = document.getElementById('customer-detail-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const editBtn = document.getElementById('cdm-edit-btn');
    if (editBtn) {
      if (canWrite) editBtn.classList.remove('hidden');
      else          editBtn.classList.add('hidden');
    }

    if (mode === 'edit' && canWrite) {
      _cdmSetEditMode();
      const editBody = document.getElementById('cdm-edit-body');
      if (editBody) {
        editBody.innerHTML = `<div class="flex flex-col items-center justify-center py-12 gap-3"><span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">edit</span><p class="text-sm text-gray-400">Đang tải form...</p></div>`;
        loadAndRenderCustomerEditForm(customerId, editBody).catch(err => {
          editBody.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message || 'Không thể tải form'}</p></div>`;
        });
      }
    } else {
      _cdmSetViewMode();
      if (canWrite) document.getElementById('cdm-edit-btn')?.classList.remove('hidden');
      const viewBody = document.getElementById('cdm-view-body');
      if (viewBody) {
        viewBody.innerHTML = `<div class="flex flex-col items-center justify-center py-12 gap-3"><span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">person_pin</span><p class="text-sm text-gray-400">Đang tải thông tin...</p></div>`;
        loadAndRenderCustomerView(customerId, viewBody).catch(err => {
          viewBody.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message || 'Không thể tải thông tin khách hàng'}</p></div>`;
        });
      }
    }
  }

  window.switchCustomerToEditMode = async function() {
    if (!_cdmCustomerId) return;
    _cdmSetEditMode();
    const editBody = document.getElementById('cdm-edit-body');
    if (!editBody) return;
    editBody.innerHTML = `<div class="flex flex-col items-center justify-center py-12 gap-3"><span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">edit</span><p class="text-sm text-gray-400">Đang tải form...</p></div>`;
    try { await loadAndRenderCustomerEditForm(_cdmCustomerId, editBody); }
    catch (err) { editBody.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message}</p></div>`; }
  };

  window.switchCustomerToViewMode = async function() {
    if (!_cdmCustomerId) return;
    _cdmSetViewMode();
    if (canWrite) document.getElementById('cdm-edit-btn')?.classList.remove('hidden');
    const viewBody = document.getElementById('cdm-view-body');
    if (!viewBody) return;
    try { await loadAndRenderCustomerView(_cdmCustomerId, viewBody); }
    catch (_) {}
  };

  window.saveCustomer = async function() {
    if (!_cdmCustomerId) return;
    const saveBtn = document.getElementById('cdm-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang lưu...'; }
    try {
      await submitCustomerEditForm(_cdmCustomerId);
      await loadCustomers(currentPage);
      window.switchCustomerToViewMode();
    } catch (err) {
      if (err.message !== 'Validation failed') showCustomerFormError(err.message || 'Không thể lưu');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span> Lưu thay đổi'; }
    }
  };

  window.closeCustomerModal = function() {
    document.getElementById('customer-detail-modal')?.classList.add('hidden');
    _cdmCustomerId = null;
  };

  document.getElementById('customer-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'customer-detail-modal') window.closeCustomerModal();
  });

  // Wire view/edit table actions to modal
  window.viewCustomer  = (customerId) => openCustomerModal(customerId, 'view');
  window.editCustomer  = (customerId) => openCustomerModal(customerId, 'edit');

  // ── Create Customer Modal ─────────────────────────────────────────────────
  function openCreateCustomerModal() {
    const modal = document.getElementById('create-customer-modal');
    const body  = document.getElementById('ccm-body');
    if (!modal || !body) return;
    body.innerHTML = renderCreateCustomerFormHtml();
    modal.classList.remove('hidden');
  }

  window.closeCreateCustomerModal = function() {
    document.getElementById('create-customer-modal')?.classList.add('hidden');
  };

  window.submitCreateCustomerModal = async function() {
    const btn = document.getElementById('ccm-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang tạo...'; }
    try {
      await submitCreateCustomerForm();
      const successEl = document.getElementById('cc-form-success');
      if (successEl) {
        successEl.querySelector('span:last-child').textContent = 'Tạo khách hàng thành công!';
        successEl.classList.remove('hidden');
      }
      await loadCustomers(currentPage);
      setTimeout(() => window.closeCreateCustomerModal(), 1200);
    } catch (err) {
      if (err.message !== 'Validation failed') showCreateCustomerError(err.message || 'Không thể tạo khách hàng');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-base">person_add</span> Tạo khách hàng'; }
    }
  };

  document.getElementById('create-customer-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-customer-modal') window.closeCreateCustomerModal();
  });

  // ── Create Loan Modal ─────────────────────────────────────────────────────
  let _clmCustomerId = null;

  function openCreateLoanModal(customerId) {
    _clmCustomerId = customerId;
    const modal = document.getElementById('create-loan-modal');
    const body  = document.getElementById('clm-body');
    if (!modal || !body) return;
    body.innerHTML = renderCreateLoanFormHtml();
    modal.classList.remove('hidden');
    initCreateLoanFormListeners();
    loadCustomerInfoForLoan(customerId);
  }

  window.closeCreateLoanModal = function() {
    document.getElementById('create-loan-modal')?.classList.add('hidden');
    _clmCustomerId = null;
  };

  window.submitCreateLoanModal = async function() {
    if (!_clmCustomerId) return;
    const staffId = getStoredValue(USER_ID_KEY);
    const btn = document.getElementById('clm-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang tạo...'; }
    try {
      await submitCreateLoanForm(_clmCustomerId, staffId);
      const successEl = document.getElementById('cl-form-success');
      if (successEl) {
        document.getElementById('cl-success-text').textContent = 'Tạo đơn vay thành công và đã kích hoạt dự đoán!';
        successEl.classList.remove('hidden');
      }
      await loadCustomers(currentPage);
      setTimeout(() => window.closeCreateLoanModal(), 1500);
    } catch (err) {
      if (err.message !== 'Validation failed') showCreateLoanError(err.message || 'Không thể tạo đơn vay');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-base">send</span> Tạo khoản vay'; }
    }
  };

  document.getElementById('create-loan-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-loan-modal') window.closeCreateLoanModal();
  });

  // Wire create actions to modals (override module-level navigate functions)
  window.createLoanForCustomer = (customerId) => openCreateLoanModal(customerId);
  if (createBtn && canWrite) {
    createBtn.removeEventListener('click', navigateToCreateCustomer);
    createBtn.addEventListener('click', () => openCreateCustomerModal());
  }

  // ── My Profile Modal helpers ──────────────────────────────────────────────
  function _mpGetAuth() {
    return { accessToken: getAccessToken(), userId: getStoredValue(USER_ID_KEY) };
  }
  function _mpSetViewMode() {
    document.getElementById('mp-modal-title').textContent = 'Hồ sơ của tôi';
    document.getElementById('mp-modal-subtitle').textContent = 'Thông tin cá nhân của bạn';
    document.getElementById('mp-edit-btn')?.classList.remove('hidden');
    document.getElementById('my-profile-modal-body')?.classList.remove('hidden');
    document.getElementById('my-profile-edit-body')?.classList.add('hidden');
    document.getElementById('mp-edit-footer')?.classList.add('hidden');
  }
  function _mpSetEditMode() {
    document.getElementById('mp-modal-title').textContent = 'Chỉnh sửa hồ sơ';
    document.getElementById('mp-modal-subtitle').textContent = 'Cập nhật thông tin cá nhân của bạn';
    document.getElementById('mp-edit-btn')?.classList.add('hidden');
    document.getElementById('my-profile-modal-body')?.classList.add('hidden');
    document.getElementById('my-profile-edit-body')?.classList.remove('hidden');
    document.getElementById('mp-edit-footer')?.classList.remove('hidden');
  }

  window.openMyProfileModal = async function() {
    const modal = document.getElementById('my-profile-modal');
    const body  = document.getElementById('my-profile-modal-body');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    _mpSetViewMode();
    body.innerHTML = `<div class="flex flex-col items-center justify-center py-12 gap-3"><span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">person</span><p class="text-sm text-gray-400">Đang tải hồ sơ...</p></div>`;
    const { accessToken, userId } = _mpGetAuth();
    if (!accessToken || !userId) {
      body.innerHTML = `<p class="text-center text-red-500 text-sm py-8">Chưa đăng nhập.</p>`;
      document.getElementById('mp-edit-btn')?.classList.add('hidden');
      return;
    }
    try { await loadAndRenderMyProfile(userId, accessToken, body); }
    catch (err) { body.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message || 'Không thể tải hồ sơ'}</p></div>`; }
  };

  window.switchMyProfileToEditMode = async function() {
    const editBody = document.getElementById('my-profile-edit-body');
    if (!editBody) return;
    _mpSetEditMode();
    editBody.innerHTML = `<div class="flex flex-col items-center justify-center py-12 gap-3"><span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">edit</span><p class="text-sm text-gray-400">Đang tải form...</p></div>`;
    const { accessToken, userId } = _mpGetAuth();
    try { await loadAndRenderEditMyProfileForm(userId, accessToken, editBody); }
    catch (err) { editBody.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message}</p></div>`; }
  };

  window.switchMyProfileToViewMode = async function() {
    const body = document.getElementById('my-profile-modal-body');
    _mpSetViewMode();
    const { accessToken, userId } = _mpGetAuth();
    if (body && accessToken && userId) { try { await loadAndRenderMyProfile(userId, accessToken, body); } catch (_) {} }
  };

  window.saveMyProfile = async function() {
    const saveBtn = document.getElementById('mp-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang lưu...'; }
    const { accessToken, userId } = _mpGetAuth();
    try {
      await submitEditMyProfileForm(userId, accessToken);
      const successEl = document.getElementById('emp-form-success');
      if (successEl) { successEl.textContent = 'Cập nhật hồ sơ thành công!'; successEl.classList.remove('hidden'); }
      setTimeout(() => window.switchMyProfileToViewMode(), 1200);
    } catch (err) {
      if (err.message !== 'Validation failed') showEditMyProfileError(err.message || 'Không thể lưu');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span> Lưu thay đổi'; }
    }
  };

  window.closeMyProfileModal = function() {
    document.getElementById('my-profile-modal')?.classList.add('hidden');
  };

  document.getElementById('my-profile-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'my-profile-modal') window.closeMyProfileModal();
  });
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
