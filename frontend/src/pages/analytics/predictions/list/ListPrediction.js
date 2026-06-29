/**
 * Trang danh sách predictions (ANALYSTIC only).
 * Guard: chỉ cho phép user có role ANALYSTIC; nếu chưa đăng nhập hoặc không phải ANALYSTIC → redirect về login.
 */

import { getAllPredictions, createPrediction } from '/src/services/prediction.service.js';
import { loadAndRenderPrediction, renderLoadingSkeleton, startPredictionPolling, stopPredictionPolling } from '/src/pages/loan/predict/prediction-result-renderer.js';
import { loadAndRenderMyProfile } from '/src/pages/share/my-profile/my-profile-renderer.js';
import { loadAndRenderEditMyProfileForm, submitEditMyProfileForm, showEditMyProfileError } from '/src/pages/share/edit-my-profile/edit-my-profile-renderer.js';
import { showConfirm } from '/src/utils/notify.js';

const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const ROLE_KEY        = 'smartlend_role';
const EMAIL_KEY       = 'smartlend_email';
const NAME_KEY        = 'smartlend_name';
const TOKEN_KEYS      = ['smartlend_access_token', 'smartlend_refresh_token', 'smartlend_user_id', 'smartlend_email', 'smartlend_role', 'smartlend_name'];
const LOGIN_URL       = '/src/pages/share/login/login.html';
const PAGE_SIZE       = 10;

let currentPage    = 0;
let totalPages     = 0;
let totalElements  = 0;

// Active client-side filters (applied after API call)
let activeFilters = {
  search:         '',
  status:         '',
  dateFrom:       '',
  dateTo:         '',
  nonDefaultOnly: false,
  defaultOnly:    false,
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
}

function clearAuth() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function requireAnalystic() {
  if (!getStoredValue(ACCESS_TOKEN_KEY)) {
    window.location.replace(LOGIN_URL);
    return false;
  }
  if (getStoredValue(ROLE_KEY).toUpperCase() !== 'ANALYSTIC') {
    window.location.replace(LOGIN_URL);
    return false;
  }
  return true;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDateTime(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortId(uuid) {
  if (!uuid) return '<span class="text-slate-400">—</span>';
  return `<span class="font-mono text-primary font-medium cursor-default" title="${uuid}">${uuid.slice(0, 8)}…</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // Fallback (older browsers / non-secure context)
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }
}

function getStatusBadge(status) {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
      return '<div class="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit"><span class="size-1.5 bg-emerald-500 rounded-full"></span><span class="text-xs font-bold text-slate-700">Hoàn thành</span></div>';
    case 'PENDING':
      return '<div class="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg w-fit"><span class="size-1.5 bg-yellow-400 rounded-full"></span><span class="text-xs font-bold text-yellow-700">Đang xử lý</span></div>';
    case 'FAILED':
      return '<div class="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg w-fit"><span class="size-1.5 bg-red-500 rounded-full"></span><span class="text-xs font-bold text-red-600">Thất bại</span></div>';
    default:
      return `<div class="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit"><span class="size-1.5 bg-slate-400 rounded-full"></span><span class="text-xs font-bold text-slate-600">${status || '—'}</span></div>`;
  }
}

function getResultBadge(predictionResult) {
  if (predictionResult === null || predictionResult === undefined) {
    return '<span class="text-slate-400 text-xs font-medium">—</span>';
  }
  return predictionResult
    ? '<div class="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit"><span class="size-1.5 bg-emerald-500 rounded-full"></span><span class="text-xs font-bold text-slate-700">Không vỡ nợ</span></div>'
    : '<div class="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg w-fit"><span class="size-1.5 bg-red-500 rounded-full"></span><span class="text-xs font-bold text-red-600">Rủi ro vỡ nợ</span></div>';
}

function getDefaultRiskBar(confidence) {
  if (confidence === null || confidence === undefined) {
    return '<span class="text-slate-400 text-xs font-medium">—</span>';
  }
  const pct   = Math.round(confidence * 100);
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-orange-500' : 'bg-emerald-500';
  return `
    <div class="flex items-center gap-3">
      <div class="flex-1 w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div class="${color} h-full" style="width:${pct}%"></div>
      </div>
      <span class="text-xs font-bold text-slate-600" title="Xác suất vỡ nợ">${pct}%</span>
    </div>
  `;
}

// ─── Client-side filter ───────────────────────────────────────────────────────

function applyClientFilters(predictions) {
  return predictions.filter((p) => {
    // Search by ID or name
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const matched =
        (p.predictionId || '').toLowerCase().includes(q) ||
        (p.customerId   || '').toLowerCase().includes(q) ||
        (p.employeeId   || '').toLowerCase().includes(q) ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.employeeName || '').toLowerCase().includes(q);
      if (!matched) return false;
    }

    // Status dropdown
    if (activeFilters.status && (p.status || '').toUpperCase() !== activeFilters.status) {
      return false;
    }

    // Date from
    if (activeFilters.dateFrom && p.createdAt) {
      if (new Date(p.createdAt) < new Date(activeFilters.dateFrom)) return false;
    }

    // Date to (inclusive)
    if (activeFilters.dateTo && p.createdAt) {
      const to = new Date(activeFilters.dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(p.createdAt) > to) return false;
    }

    // Outcome checkboxes (mutually exclusive; if both checked, show all)
    if (activeFilters.nonDefaultOnly && !activeFilters.defaultOnly) {
      if (p.predictionResult !== true) return false;
    }
    if (activeFilters.defaultOnly && !activeFilters.nonDefaultOnly) {
      if (p.predictionResult !== false) return false;
    }

    return true;
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderPredictionRow(p) {
  const customerName  = p.customerName || 'Không rõ';
  const employeeLabel = p.employeeName || p.employeeId;

  return `
    <tr class="hover:bg-slate-50 transition-colors group">
      <td class="px-8 py-5">${shortId(p.predictionId)}</td>
      <td class="px-8 py-5">
        <div class="space-y-1">
          <p class="text-sm font-bold text-slate-900">${escapeHtml(customerName)}</p>
          ${
            p.customerId
              ? `
                <button
                  type="button"
                  data-copy-text="${p.customerId}"
                  class="inline-flex items-start gap-1.5 text-left text-xs text-slate-500 hover:text-primary transition-colors"
                  title="Click để sao chép ID khách hàng"
                >
                  <span class="font-mono break-all">${p.customerId}</span>
                  <span class="material-symbols-outlined text-[16px] leading-4 mt-[1px]" data-copy-icon>content_copy</span>
                </button>
              `
              : `<span class="text-slate-400 text-xs">—</span>`
          }
        </div>
      </td>
      <td class="px-8 py-5">${shortId(p.employeeId)}</td>
      <td class="px-8 py-5 text-center">${getStatusBadge(p.status)}</td>
      <td class="px-8 py-5">${getResultBadge(p.predictionResult)}</td>
      <td class="px-8 py-5">${getDefaultRiskBar(p.confidence)}</td>
      <td class="px-8 py-5 text-slate-500 text-xs font-medium tabular-nums">${formatDateTime(p.createdAt)}</td>
      <td class="px-8 py-5 text-right">
        <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onclick="openPredictionModal(null, '${p.predictionId}')"
            class="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all glow-blue"
            title="Xem chi tiết"
          >
            <span class="material-symbols-outlined text-lg">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function setLoading() {
  const tbody = document.getElementById('prediction-tbody');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="px-8 py-10 text-center text-slate-400">
        <div class="flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl">progress_activity</span>
          <span class="text-sm font-medium">Đang tải dự đoán...</span>
        </div>
      </td>
    </tr>
  `;
}

function renderPredictions(predictions) {
  const tbody = document.getElementById('prediction-tbody');
  if (!tbody) return;

  if (!predictions || predictions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-8 py-10 text-center text-slate-400">
          <div class="flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-4xl">inbox</span>
            <span class="text-sm font-medium">Không có dữ liệu dự đoán</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = predictions.map(renderPredictionRow).join('');
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function renderPageButtons() {
  const container = document.getElementById('page-buttons');
  if (!container) return;

  const maxVisible = 3;
  const half       = Math.floor(maxVisible / 2);
  let   start      = Math.max(0, currentPage - half);
  let   end        = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);

  let html = '';
  for (let i = start; i <= end; i++) {
    if (i === currentPage) {
      html += `<button class="size-8 text-xs bg-primary text-white rounded-lg font-black shadow-lg shadow-primary/20" data-page="${i}">${i + 1}</button>`;
    } else {
      html += `<button class="size-8 text-xs bg-white text-slate-600 border border-border-color rounded-lg hover:bg-slate-50 transition-all font-bold" data-page="${i}">${i + 1}</button>`;
    }
  }
  container.innerHTML = html;

  container.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => loadPredictions(parseInt(btn.dataset.page, 10)));
  });
}

function updatePaginationControls(visibleCount) {
  const prevBtn  = document.getElementById('prev-page-btn');
  const nextBtn  = document.getElementById('next-page-btn');
  const infoSpan = document.getElementById('pagination-info');

  if (prevBtn) prevBtn.disabled = currentPage === 0;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;

  renderPageButtons();

  if (infoSpan) {
    if (totalElements === 0) {
      infoSpan.textContent = 'Đang hiển thị 0 bản ghi';
    } else {
      const start = currentPage * PAGE_SIZE + 1;
      const end   = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
      infoSpan.innerHTML = `Đang hiển thị <span class="text-slate-900 font-bold">${visibleCount}</span> trong <span class="text-slate-900 font-bold">${totalElements}</span> bản ghi (trang ${start}–${end})`;
    }
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadPredictions(page = 0) {
  setLoading();

  try {
    const response = await getAllPredictions({ page, size: PAGE_SIZE, sort: 'createdAt,desc' });

    if (response && Array.isArray(response.content)) {
      currentPage   = response.number   ?? page;
      totalPages    = response.totalPages   ?? 0;
      totalElements = response.totalElements ?? 0;

      const filtered = applyClientFilters(response.content);
      renderPredictions(filtered);
      updatePaginationControls(filtered.length);
    } else {
      renderPredictions([]);
      currentPage   = 0;
      totalPages    = 0;
      totalElements = 0;
      updatePaginationControls(0);
    }
  } catch (error) {
    console.error('Error loading predictions:', error);
    const tbody = document.getElementById('prediction-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-8 py-10 text-center text-red-400">
            <div class="flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-4xl">error</span>
              <span class="text-sm font-medium">${error.message || 'Không thể tải dữ liệu dự đoán'}</span>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

// ─── My Profile Modal ────────────────────────────────────────────────────────

function _mpGetAuth() {
    return { accessToken: getStoredValue(ACCESS_TOKEN_KEY), userId: getStoredValue('smartlend_user_id') };
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
    document.getElementById('mp-modal-subtitle').textContent = 'Cập nhật thông tin cá nhân';
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
    body.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 gap-3">
            <span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">person</span>
            <p class="text-sm text-gray-400">Đang tải hồ sơ...</p>
        </div>`;

    const { accessToken, userId } = _mpGetAuth();
    if (!accessToken || !userId) {
        body.innerHTML = `<p class="text-center text-red-500 text-sm py-8">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>`;
        document.getElementById('mp-edit-btn')?.classList.add('hidden');
        return;
    }
    try {
        await loadAndRenderMyProfile(userId, accessToken, body);
    } catch (err) {
        body.innerHTML = `
            <div class="flex flex-col items-center gap-2 py-8">
                <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                <p class="text-sm text-red-500">${err.message || 'Failed to load profile'}</p>
            </div>`;
    }
};

window.switchMyProfileToEditMode = async function() {
    const editBody = document.getElementById('my-profile-edit-body');
    if (!editBody) return;
    _mpSetEditMode();
    editBody.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 gap-3">
            <span class="material-symbols-outlined text-4xl text-gray-300 animate-pulse">edit</span>
            <p class="text-sm text-gray-400">Đang tải form...</p>
        </div>`;
    const { accessToken, userId } = _mpGetAuth();
    try {
        await loadAndRenderEditMyProfileForm(userId, accessToken, editBody);
    } catch (err) {
        editBody.innerHTML = `<div class="flex flex-col items-center gap-2 py-8"><span class="material-symbols-outlined text-3xl text-red-400">error</span><p class="text-sm text-red-500">${err.message}</p></div>`;
    }
};

window.switchMyProfileToViewMode = async function() {
    const body = document.getElementById('my-profile-modal-body');
    _mpSetViewMode();
    const { accessToken, userId } = _mpGetAuth();
    if (body && accessToken && userId) {
        try { await loadAndRenderMyProfile(userId, accessToken, body); } catch (_) {}
    }
};

window.saveMyProfile = async function() {
    const confirmed = await showConfirm('Bạn có chắc muốn cập nhật thông tin hồ sơ?', {
        confirmText: 'Cập nhật',
        cancelText: 'Hủy',
    });
    if (!confirmed) return;

    const saveBtn = document.getElementById('mp-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang lưu...'; }
    const { accessToken, userId } = _mpGetAuth();
    try {
        await submitEditMyProfileForm(userId, accessToken);
        const successEl = document.getElementById('emp-form-success');
        if (successEl) { successEl.textContent = 'Cập nhật hồ sơ thành công!'; successEl.classList.remove('hidden'); }
        setTimeout(() => window.switchMyProfileToViewMode(), 1200);
    } catch (err) {
        if (err.message !== 'Validation failed') showEditMyProfileError(err.message || 'Failed to save');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span> Lưu thay đổi'; }
    }
};

window.closeMyProfileModal = function() {
    document.getElementById('my-profile-modal')?.classList.add('hidden');
};

// ─── Prediction Result Modal ──────────────────────────────────────────────────

let _predModalLoanId       = null;
let _predModalPredictionId = null;

function getPredictionModalEls() {
    return {
        titleEl:            document.getElementById('pred-modal-title'),
        statusBadgeEl:      document.getElementById('pred-modal-status-badge'),
        btnApprove:         null,
        btnReject:          null,
        customerProfileEl:  document.getElementById('pred-modal-customer-profile-body'),
        loanDetailsEl:      document.getElementById('pred-modal-loan-details-body'),
        riskCardEl:         document.getElementById('pred-modal-risk-card-body'),
        explanationBodyEl:  document.getElementById('pred-modal-explanation-body'),
    };
}

window.openPredictionModal = async function(loanId, predictionId) {
    _predModalLoanId       = loanId;
    _predModalPredictionId = predictionId;

    const modal = document.getElementById('prediction-result-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const els = getPredictionModalEls();
    renderLoadingSkeleton(els);

    try {
        const data = await loadAndRenderPrediction(loanId, predictionId, els);
        const pending =
            data.currentPrediction?.predictionResult == null &&
            data.currentPrediction?.status !== 'FAILED';

        if (pending) {
            startPredictionPolling(loanId, predictionId, els);
        }
    } catch (error) {
        console.error('Error loading prediction modal:', error);
        if (els.riskCardEl) {
            els.riskCardEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 gap-2">
                    <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                    <p class="text-sm text-red-500 font-semibold">Không thể tải kết quả dự đoán</p>
                    <p class="text-xs text-slate-400">${error.message}</p>
                </div>`;
        }
    }
};

window.closePredictionModal = function() {
    stopPredictionPolling();
    const modal = document.getElementById('prediction-result-modal');
    if (modal) modal.classList.add('hidden');
    _predModalLoanId       = null;
    _predModalPredictionId = null;
};

window.refreshPredictionModal = function() {
    if (_predModalLoanId || _predModalPredictionId) {
        const els = getPredictionModalEls();
        renderLoadingSkeleton(els);
        loadAndRenderPrediction(_predModalLoanId, _predModalPredictionId, els).catch(() => {});
    }
};

// ─── Create Prediction Modal ──────────────────────────────────────────────────

function _cpResetForm() {
  ['cp-customer-id', 'cp-loan-amnt', 'cp-loan-int-rate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const intentEl = document.getElementById('cp-loan-intent');
  if (intentEl) intentEl.value = '';
  document.getElementById('cp-error')?.classList.add('hidden');
  document.getElementById('cp-success')?.classList.add('hidden');
}

function _cpShowError(msg) {
  const el = document.getElementById('cp-error');
  const txt = document.getElementById('cp-error-text');
  if (el && txt) { txt.textContent = msg; el.classList.remove('hidden'); }
  document.getElementById('cp-success')?.classList.add('hidden');
}

function _cpShowSuccess(msg) {
  const el = document.getElementById('cp-success');
  const txt = document.getElementById('cp-success-text');
  if (el && txt) { txt.textContent = msg; el.classList.remove('hidden'); }
  document.getElementById('cp-error')?.classList.add('hidden');
}

window.openCreatePredictionModal = function () {
  _cpResetForm();
  document.getElementById('create-prediction-modal')?.classList.remove('hidden');
};

window.closeCreatePredictionModal = function () {
  document.getElementById('create-prediction-modal')?.classList.add('hidden');
};

window.submitCreatePrediction = async function () {
  document.getElementById('cp-error')?.classList.add('hidden');
  document.getElementById('cp-success')?.classList.add('hidden');

  const customerId  = document.getElementById('cp-customer-id')?.value.trim();
  const loanAmnt    = document.getElementById('cp-loan-amnt')?.value;
  const loanIntRate = document.getElementById('cp-loan-int-rate')?.value;
  const loanIntent  = document.getElementById('cp-loan-intent')?.value;

  if (!customerId)  return _cpShowError('Vui lòng nhập Mã khách hàng.');
  if (!loanAmnt)    return _cpShowError('Vui lòng nhập Số tiền vay.');
  if (!loanIntRate) return _cpShowError('Vui lòng nhập Lãi suất.');
  if (!loanIntent)  return _cpShowError('Vui lòng chọn Mục đích vay.');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(customerId)) return _cpShowError('Mã khách hàng không đúng định dạng UUID.');

  const payload = {
    customerId,
    loanIntent,
    loanAmnt:    parseFloat(loanAmnt),
    loanIntRate: parseFloat(loanIntRate),
  };

  const submitBtn = document.getElementById('cp-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang xử lý...';
  }

  try {
    const staffId = getStoredValue('smartlend_user_id');
    await createPrediction(payload, staffId || undefined);
    _cpShowSuccess('Dự đoán đã được tạo thành công! Hệ thống đang xử lý kết quả.');
    loadPredictions(0);
    setTimeout(() => window.closeCreatePredictionModal(), 2000);
  } catch (err) {
    _cpShowError(err.message || 'Không thể tạo dự đoán. Vui lòng thử lại.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">send</span> Tạo dự đoán';
    }
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (!requireAnalystic()) return;

  // Show user info in sidebar
  const email = getStoredValue(EMAIL_KEY);
  const nameEl = document.getElementById('sidebar-user-name');
  if (nameEl && email) nameEl.textContent = email;

  // Initial load
  loadPredictions(0);

  // Click-to-copy customer ID in table (customer column)
  document.getElementById('prediction-tbody')?.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('[data-copy-text]');
    if (!btn) return;

    const text = btn.dataset.copyText;
    const ok = await copyTextToClipboard(text);

    const icon = btn.querySelector?.('[data-copy-icon]');
    if (icon) {
      const prev = icon.textContent;
      icon.textContent = ok ? 'check' : 'error';
      setTimeout(() => { icon.textContent = prev; }, 900);
    }
  });

  // Logout button (in sidebar card)
  document.getElementById('analystic-logout-btn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = LOGIN_URL;
  });

  // Refresh button
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadPredictions(currentPage);
  });

  // Prev / Next pagination
  document.getElementById('prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 0) loadPredictions(currentPage - 1);
  });
  document.getElementById('next-page-btn')?.addEventListener('click', () => {
    if (currentPage < totalPages - 1) loadPredictions(currentPage + 1);
  });

  // Header search (debounced)
  let searchTimeout;
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      activeFilters.search = e.target.value.trim();
      loadPredictions(0);
    }, 400);
  });

  // Status filter dropdown (in table header bar)
  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    activeFilters.status = e.target.value;
    loadPredictions(0);
  });

  // Apply filters button (right sidebar)
  document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
    activeFilters.dateFrom       = document.getElementById('date-from')?.value  || '';
    activeFilters.dateTo         = document.getElementById('date-to')?.value    || '';
    activeFilters.nonDefaultOnly = document.getElementById('filter-non-default')?.checked || false;
    activeFilters.defaultOnly    = document.getElementById('filter-default')?.checked    || false;
    loadPredictions(0);
  });

  // Clear all filters
  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    activeFilters = { search: '', status: '', dateFrom: '', dateTo: '', nonDefaultOnly: false, defaultOnly: false };
    const searchInput = document.getElementById('search-input');
    const statusSel   = document.getElementById('status-filter');
    const dateFrom    = document.getElementById('date-from');
    const dateTo      = document.getElementById('date-to');
    const cbNon       = document.getElementById('filter-non-default');
    const cbDef       = document.getElementById('filter-default');
    if (searchInput) searchInput.value = '';
    if (statusSel)   statusSel.value   = '';
    if (dateFrom)    dateFrom.value    = '';
    if (dateTo)      dateTo.value      = '';
    if (cbNon)       cbNon.checked     = false;
    if (cbDef)       cbDef.checked     = false;
    loadPredictions(0);
  });

  // Create prediction button
  document.getElementById('create-prediction-btn')?.addEventListener('click', () => {
    window.openCreatePredictionModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
