// ListLoan.js - Logic for loan list management
import {
    getAllLoanApplications,
    getLoanApplicationById,
    getFinancialSnapshotById,
    getFinancialSnapshotsByCustomerId,
    triggerLoanPrediction,
    resetLoanPrediction,
    updateLoanApplicationDecision,
} from '/src/services/loanmanagement.service.js';
import { getCustomerById } from '/src/services/customer.service.js';
import { getPredictionById } from '/src/services/prediction.service.js';
import { getCurrentProfile } from '/src/services/identity.service.js';
import { showToast, showConfirm } from '/src/utils/notify.js';
import { formatLoanIntentLabel, attachLoanIntent } from '/src/utils/loanIntent.js';
import {
    EMPTY_LABEL,
    formatCurrencyVnd,
    formatDateVi,
    formatLoanDecision,
    formatLoanGradeLabel,
    formatLoanStatus,
    orEmpty,
} from '/src/utils/formatter.js';

const loanIntentApi = {
    getFinancialSnapshotById,
    getFinancialSnapshotsByCustomerId,
};
import {
    loadAndRenderPrediction,
    renderLoadingSkeleton,
    startPredictionPolling,
    stopPredictionPolling,
} from '/src/pages/loan/predict/prediction-result-renderer.js';
import { loadAndRenderMyProfile } from '/src/pages/share/my-profile/my-profile-renderer.js';
import { loadAndRenderEditMyProfileForm, submitEditMyProfileForm, showEditMyProfileError } from '/src/pages/share/edit-my-profile/edit-my-profile-renderer.js';

// Auth & logout (reuse pattern from prediction page)
const ACCESS_TOKEN_KEY = 'smartlend_access_token';
const USER_ID_KEY = 'smartlend_user_id';
const ROLE_KEY = 'smartlend_role';
const TOKEN_KEYS = [
    'smartlend_access_token',
    'smartlend_refresh_token',
    'smartlend_user_id',
    'smartlend_email',
    'smartlend_role',
];
const LOGIN_URL = '/src/pages/share/login/login.html';
const ROLE_LABELS = {
    'STAFF': 'Nhân viên',
    'ADMIN': 'Quản trị viên',
    'ANALYSTIC': 'Phân tích viên',
};

function getStoredValue(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
}

function getAccessToken() {
    return getStoredValue(ACCESS_TOKEN_KEY);
}

function getUserId() {
    return getStoredValue(USER_ID_KEY);
}

function getStoredRole() {
    return getStoredValue(ROLE_KEY);
}

function canWrite() {
    return ['STAFF', 'ADMIN'].includes(getStoredRole().toUpperCase());
}

function clearAuth() {
    TOKEN_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

let currentPage = 0;
const pageSize = 10;
let totalPages = 0;
let allLoans = [];

async function initSidebarUserName() {
    const nameEl = document.getElementById('loan-sidebar-fullname');
    const roleEl = document.getElementById('loan-sidebar-role');

    if (roleEl) {
        const role = getStoredRole().toUpperCase();
        roleEl.textContent = ROLE_LABELS[role] || role;
    }

    if (!nameEl) return;
    try {
        const accessToken = getAccessToken();
        const userId = getUserId();
        if (!accessToken || !userId) return;

        const profile = await getCurrentProfile(userId, accessToken);
        if (profile && profile.fullName) {
            nameEl.textContent = profile.fullName;
        }
    } catch (err) {
        console.error('Error loading sidebar user name:', err);
    }
}

// Get grade badge styling
function getGradeBadge(grade) {
    const gradeMap = {
        'A': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        'B': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        'C': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        'D': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        'E': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        'F': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
        'G': 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    };
    return gradeMap[grade] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
}

// Get status badge styling
function getStatusBadge(status) {
    const statusMap = {
        'PENDING': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        'APPROVED': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        'REJECTED': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
        'DISBURSED': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        'UNDER_REVIEW': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    };
    return statusMap[status] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
}

// Format currency — dùng formatter chung
function formatCurrency(amount) {
    return formatCurrencyVnd(amount);
}

// Format date theo định dạng Việt Nam
function formatDate(dateString) {
    return formatDateVi(dateString);
}

// Open loan detail modal
async function openLoanModal(loanId) {
    const modal = document.getElementById('loan-modal');
    const modalBody = document.getElementById('loan-modal-body');
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Show loading
    modalBody.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <span class="material-symbols-outlined text-4xl text-gray-400 animate-spin">progress_activity</span>
            <p class="ml-3 text-gray-500">Đang tải chi tiết...</p>
        </div>
    `;
    
    try {
        // Fetch loan and customer data
        const loan = await getLoanApplicationById(loanId);
        await attachLoanIntent(loan, loanIntentApi);
        const customer = await getCustomerById(loan.customerId);

        let prediction = null;
        if (loan.predictionId) {
            try {
                prediction = await getPredictionById(loan.predictionId);
            } catch (e) {
                console.log('Prediction not ready yet for modal:', e.message);
            }
        }
        
        // Render loan details
        renderLoanModal(loan, customer, prediction);
    } catch (error) {
        console.error('Error loading loan details:', error);
        modalBody.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <span class="material-symbols-outlined text-4xl text-red-500">error</span>
                <p class="mt-3 text-red-600 font-semibold">Không thể tải dữ liệu</p>
                <p class="text-sm text-gray-500">${error.message}</p>
            </div>
        `;
    }
}

// Render loan modal content
function renderLoanModal(loan, customer, prediction) {
    const modalBody = document.getElementById('loan-modal-body');
    const loanId = loan.id ? loan.id.substring(0, 8) : EMPTY_LABEL;

    const hasPredictionResult =
        (prediction && prediction.predictionResult !== null && prediction.predictionResult !== undefined)
        || loan.predictionLabel != null;
    const effectiveResult = prediction?.predictionResult ?? loan.predictionLabel;
    const effectiveConfidence = prediction?.confidence ?? loan.predictionConfidence;
    const predictionVerdictText = hasPredictionResult
        ? effectiveResult
            ? 'Có thể phê duyệt'
            : 'Rủi ro cao — không nên phê duyệt'
        : '';
    const predictionVerdictClass = hasPredictionResult
        ? effectiveResult
            ? 'text-emerald-600'
            : 'text-rose-600'
        : 'text-slate-500';
    const predictionConfidenceText =
        effectiveConfidence != null
            ? (effectiveConfidence * 100).toFixed(1) + '%'
            : EMPTY_LABEL;
    
    modalBody.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-2xl">description</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Khoản vay #${loanId}</h3>
                        <p class="text-sm text-gray-500">Tạo ngày ${formatDate(loan.createdAt)}</p>
                    </div>
                </div>
                <span class="px-3 py-1 ${getStatusBadge(loan.status)} text-[10px] font-bold rounded-full uppercase tracking-wider">
                    ${formatLoanStatus(loan.status)}
                </span>
            </div>
            
            <!-- Customer Info -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Thông tin khách hàng</h4>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-xs text-gray-500">Họ và tên</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${orEmpty(customer?.fullName)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Email</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${orEmpty(customer?.email)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Tuổi</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${customer?.personAge != null ? `${customer.personAge} tuổi` : EMPTY_LABEL}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Thu nhập</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${customer?.personIncome != null ? formatCurrency(customer.personIncome) : EMPTY_LABEL}</p>
                    </div>
                </div>
            </div>
            
            <!-- Loan Details -->
            <div>
                <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Chi tiết khoản vay</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs text-gray-500">Số tiền yêu cầu</p>
                        <p class="text-lg font-bold text-primary">${formatCurrency(loan.requestedAmount || 0)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Kỳ hạn</p>
                        <p class="text-lg font-bold text-gray-900 dark:text-white">${loan.requestedTermMonths != null ? loan.requestedTermMonths : EMPTY_LABEL} tháng</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Lãi suất</p>
                        <p class="text-lg font-bold text-gray-900 dark:text-white">${loan.requestedInterestRate != null ? `${loan.requestedInterestRate}%` : EMPTY_LABEL}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Mục đích vay</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${formatLoanIntentLabel(loan.loanIntent)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Hạng tín dụng</p>
                        <p class="text-lg font-bold">
                            <span class="px-2.5 py-1 ${getGradeBadge(customer?.loanGrade)} text-xs font-bold rounded-full">${customer?.loanGrade || EMPTY_LABEL}</span>
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- AI Prediction (Model) -->
            ${loan.predictionId ? `
            <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h4 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <span class="material-symbols-outlined text-indigo-500 text-base">auto_awesome</span>
                    Dự đoán AI
                </h4>
                ${hasPredictionResult ? `
                <div class="flex items-center justify-between gap-4 text-sm">
                    <div>
                        <p class="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Kết quả mô hình</p>
                        <p class="font-bold ${predictionVerdictClass}">${predictionVerdictText}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Xác suất vỡ nợ</p>
                        <p class="font-bold text-gray-900 dark:text-white">${predictionConfidenceText}</p>
                    </div>
                </div>
                ` : `
                <p class="text-xs text-gray-500">
                    Dự đoán đang chờ xử lý. Xem chi tiết khi dự đoán hoàn thành.
                </p>
                `}
            </div>
            ` : ''}
            
            <!-- Decision Info -->
            ${loan.decision && loan.decision !== 'PENDING' ? `
            <div class="bg-${loan.decision === 'APPROVED' ? 'emerald' : 'rose'}-50 dark:bg-${loan.decision === 'APPROVED' ? 'emerald' : 'rose'}-900/20 rounded-lg p-4">
                <h4 class="text-sm font-bold text-${loan.decision === 'APPROVED' ? 'emerald' : 'rose'}-700 dark:text-${loan.decision === 'APPROVED' ? 'emerald' : 'rose'}-300 mb-2 uppercase tracking-wide">Quyết định</h4>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-xs text-gray-500">Kết quả</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${formatLoanDecision(loan.decision)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Xác suất vỡ nợ</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${loan.predictionConfidence != null ? (loan.predictionConfidence * 100).toFixed(2) + '%' : EMPTY_LABEL}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Ngày quyết định</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${formatDate(loan.decisionAt)}</p>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                ${loan.predictionId ? `
                <button onclick="viewPrediction('${loan.id}')" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    <span class="material-symbols-outlined text-lg">psychology</span>
                    Xem dự đoán
                </button>
                ${loan.predictionLabel == null && loan.predictionConfidence == null && canWrite() ? `
                <button onclick="retryPredictionForLoan('${loan.id}')" class="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
                    <span class="material-symbols-outlined text-lg">replay</span>
                    Chạy lại dự đoán
                </button>
                ` : ''}
                ` : canWrite() ? `
                <button onclick="triggerPredictionForLoan('${loan.id}')" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                    <span class="material-symbols-outlined text-lg">auto_awesome</span>
                    Chạy dự đoán
                </button>
                ` : ''}
                <button onclick="closeLoanModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    Đóng
                </button>
            </div>
        </div>
    `;
}

// Close modal
window.closeLoanModal = function() {
    const modal = document.getElementById('loan-modal');
    modal.classList.add('hidden');
};

// Trigger prediction for loan and open prediction result modal
window.triggerPredictionForLoan = async function(loanId) {
    const staffId = localStorage.getItem('smartlend_user_id') || sessionStorage.getItem('smartlend_user_id');
    
    if (!staffId) {
        showToast('Không tìm thấy mã nhân viên. Vui lòng đăng nhập lại.', { type: 'error' });
        return;
    }
    
    try {
        await triggerLoanPrediction(loanId, staffId);

        // Close loan detail modal if open
        const loanModal = document.getElementById('loan-modal');
        if (loanModal && !loanModal.classList.contains('hidden')) closeLoanModal();

        // Open prediction result modal
        openPredictionModal(loanId, null);
    } catch (error) {
        console.error('Error triggering prediction:', error);
        showToast('Không thể kích hoạt dự đoán: ' + error.message, { type: 'error' });
    }
};

window.retryPredictionForLoan = async function(loanId) {
    const staffId = getUserId();
    if (!staffId) {
        showToast('Không tìm thấy mã nhân viên. Vui lòng đăng nhập lại.', { type: 'error' });
        return;
    }

    const confirmed = await showConfirm(
        'Dự đoán có thể đang bị treo. Reset và chạy lại dự đoán AI?',
        { confirmText: 'Chạy lại', cancelText: 'Hủy' },
    );
    if (!confirmed) return;

    try {
        await resetLoanPrediction(loanId, staffId);
        await triggerLoanPrediction(loanId, staffId);
        showToast('Đã reset và kích hoạt lại dự đoán AI.', { type: 'success' });
        await loadLoans();
        openPredictionModal(loanId, null);
    } catch (error) {
        console.error('Error retrying prediction:', error);
        showToast('Không thể chạy lại dự đoán: ' + error.message, { type: 'error' });
    }
};

const STATUS_DOT = {
    PENDING:      'bg-amber-400',
    UNDER_REVIEW: 'bg-blue-400',
    APPROVED:     'bg-emerald-500',
    REJECTED:     'bg-rose-500',
    DISBURSED:    'bg-indigo-500',
};

// Render table rows
function renderLoans(loans) {
    const tbody = document.getElementById('loan-table-body');

    if (!loans || loans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-gray-300 text-5xl">inbox</span>
                        <p class="text-gray-500">Không có khoản vay nào</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = loans.map(loan => {
        const loanId       = loan.id ? loan.id.substring(0, 8).toUpperCase() : EMPTY_LABEL;
        const customerName = loan.customerName || 'Không xác định';
        const grade        = loan.loanGrade || EMPTY_LABEL;
        const status       = loan.status || 'PENDING';
        let intent = formatLoanIntentLabel(loan.loanIntent);
        if (intent === EMPTY_LABEL) intent = '—';
        const amount       = loan.requestedAmount != null ? formatCurrency(loan.requestedAmount) : EMPTY_LABEL;
        const term         = loan.requestedTermMonths != null ? `${loan.requestedTermMonths} tháng` : '—';
        const rate         = loan.requestedInterestRate != null ? `${loan.requestedInterestRate}%` : '—';
        const createdDate  = formatDate(loan.createdAt);

        const canReject =
            canWrite() &&
            (status === 'PENDING' || status === 'UNDER_REVIEW') &&
            (!loan.decision || loan.decision === 'PENDING');

        const canApprove =
            canWrite() &&
            status === 'UNDER_REVIEW' &&
            (!loan.decision || loan.decision === 'PENDING') &&
            loan.predictionLabel != null;

        const canRetryPrediction =
            canWrite() &&
            loan.predictionId &&
            loan.predictionLabel == null &&
            loan.predictionConfidence == null;

        const dotClass = STATUS_DOT[status] || 'bg-gray-400';

        // Loan intent chip color
        const intentChip = loan.loanIntent
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">${intent}</span>`
            : '';

        // Grade badge (circle)
        const gradeBadge = grade !== EMPTY_LABEL
            ? `<span class="inline-flex items-center justify-center size-8 rounded-full ${getGradeBadge(grade)} font-black text-sm" title="${formatLoanGradeLabel(grade)}">${grade}</span>`
            : `<span class="text-sm text-gray-400">${EMPTY_LABEL}</span>`;

        // Status badge
        const statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(status)}">
                <span class="size-1.5 rounded-full ${dotClass} inline-block"></span>
                ${formatLoanStatus(status)}
            </span>`;

        // Action buttons
        const actionBtns = `
            <div class="flex justify-center gap-1">
                <button
                    onclick="openLoanModal('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-primary rounded-lg transition-colors"
                    title="Xem chi tiết">
                    <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
                ${loan.predictionId ? `
                <button
                    onclick="viewPrediction('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors"
                    title="Xem dự đoán">
                    <span class="material-symbols-outlined text-[20px]">psychology</span>
                </button>
                ` : canWrite() ? `
                <button
                    onclick="triggerPredictionForLoan('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                    title="Chạy dự đoán AI">
                    <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
                </button>
                ` : ''}
                ${canRetryPrediction ? `
                <button
                    onclick="retryPredictionForLoan('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-colors"
                    title="Chạy lại dự đoán">
                    <span class="material-symbols-outlined text-[20px]">replay</span>
                </button>
                ` : ''}
                ${canReject ? `
                <button
                    onclick="rejectLoan('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Từ chối">
                    <span class="material-symbols-outlined text-[20px]">cancel</span>
                </button>
                ` : ''}
                ${canApprove ? `
                <button
                    onclick="approveLoan('${loan.id}')"
                    class="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors"
                    title="Phê duyệt">
                    <span class="material-symbols-outlined text-[20px]">check_circle</span>
                </button>
                ` : canReject && loan.predictionId && loan.predictionLabel == null ? `
                <button
                    disabled
                    class="w-8 h-8 flex items-center justify-center text-gray-300 rounded-lg cursor-not-allowed"
                    title="Chờ kết quả dự đoán AI trước khi phê duyệt">
                    <span class="material-symbols-outlined text-[20px]">check_circle</span>
                </button>
                ` : ''}
            </div>`;

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-[18px]">description</span>
                        </div>
                        <div>
                            <p class="font-bold text-sm text-gray-900 dark:text-white font-mono">#${loanId}</p>
                            <div class="mt-0.5">${intentChip}</div>
                            <p class="text-xs text-gray-400 mt-0.5">${createdDate}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div>
                        <p class="font-bold text-sm text-gray-900 dark:text-white">${customerName}</p>
                        <p class="text-xs text-gray-400 font-mono mt-0.5">${loan.customerId ? loan.customerId.substring(0, 12) + '…' : EMPTY_LABEL}</p>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="space-y-1">
                        <p class="text-sm font-bold text-primary">${amount}</p>
                        <p class="text-xs text-gray-500">${term} · ${rate}</p>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">${gradeBadge}</div>
                </td>
                <td class="px-6 py-4">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4">
                    ${actionBtns}
                </td>
            </tr>
        `;
    }).join('');
}

// Update metrics
function updateMetrics(loans) {
    const total = loans.length;
    const pending = loans.filter(l => l.status === 'UNDER_REVIEW' || l.status === 'PENDING').length;
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'DISBURSED').length;
    
    document.getElementById('total-requests').textContent = total;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
}

// Update pagination info
function updatePaginationInfo(currentPage, pageSize, totalElements) {
    const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);
    
    document.getElementById('pagination-info').innerHTML = `
        Hiển thị <span class="font-medium text-slate-900 dark:text-white">${start}</span> 
        - <span class="font-medium text-slate-900 dark:text-white">${end}</span> 
        trong <span class="font-medium text-slate-900 dark:text-white">${totalElements}</span> bản ghi
    `;
}

// Render pagination controls
function renderPagination(currentPage, totalPages) {
    const container = document.getElementById('pagination-controls');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let buttons = '';
    
    // Previous button
    buttons += `
        <button onclick="changePage(${currentPage - 1})"
                class="size-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white transition-colors text-gray-500 disabled:opacity-40"
                ${currentPage === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
    `;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(0, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttons += `
            <button onclick="changePage(${i})"
                    class="size-9 flex items-center justify-center rounded-lg ${isActive ? 'bg-primary text-white font-bold text-sm' : 'hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm font-medium'} ">
                ${i + 1}
            </button>
        `;
    }
    
    // Next button
    buttons += `
        <button onclick="changePage(${currentPage + 1})"
                class="size-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white transition-colors text-gray-500 disabled:opacity-40"
                ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;
    
    container.innerHTML = buttons;
}

// Change page
window.changePage = function(page) {
    if (page < 0 || page >= totalPages) return;
    currentPage = page;
    loadLoans();
};

// Load loans from API
async function loadLoans() {
    try {
        const response = await getAllLoanApplications(currentPage, pageSize);
        
        if (response && response.content) {
            allLoans = response.content;
            totalPages = response.totalPages || 1;
            
            renderLoans(allLoans);
            updateMetrics(allLoans);
            updatePaginationInfo(currentPage, pageSize, response.totalElements || 0);
            renderPagination(currentPage, totalPages);
        }
    } catch (error) {
        console.error('Error loading loans:', error);
        document.getElementById('loan-table-body').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-500">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl">error_outline</span>
                        <p>Không thể tải danh sách khoản vay</p>
                        <p class="text-sm">${error.message}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            
            if (!query) {
                renderLoans(allLoans);
                return;
            }
            
            const filtered = allLoans.filter(loan => {
                const loanId = (loan.id || '').toLowerCase();
                const customerName = (loan.customerName || '').toLowerCase();
                const loanIntent = (loan.loanIntent || '').toLowerCase();
                
                return loanId.includes(query) || 
                       customerName.includes(query) || 
                       loanIntent.includes(query);
            });
            
            renderLoans(filtered);
        }, 300);
    });
}

// View prediction for a loan — open inline modal
window.viewPrediction = function(loanId) {
    openPredictionModal(loanId, null);
};

// Approve / Reject helpers
async function handleLoanDecision(loanId, decision) {
    const staffId = localStorage.getItem('smartlend_user_id') || sessionStorage.getItem('smartlend_user_id');

    if (!staffId) {
        showToast('Không tìm thấy mã nhân viên. Vui lòng đăng nhập lại.', { type: 'error' });
        return;
    }

    const confirmMsg =
        decision === 'APPROVED'
            ? 'Bạn có chắc muốn PHÊ DUYỆT khoản vay này?'
            : 'Bạn có chắc muốn TỪ CHỐI khoản vay này?';

    const confirmed = await showConfirm(confirmMsg, {
        confirmText: decision === 'APPROVED' ? 'Phê duyệt' : 'Từ chối',
        cancelText: 'Hủy',
    });
    if (!confirmed) return;

    try {
        await updateLoanApplicationDecision(loanId, staffId, { decision });
        showToast(
            `Khoản vay đã được ${decision === 'APPROVED' ? 'phê duyệt' : 'từ chối'} thành công.`,
            { type: 'success' },
        );
        await loadLoans();
    } catch (error) {
        console.error('Error updating loan decision:', error);
        showToast('Không thể cập nhật quyết định: ' + error.message, { type: 'error' });
    }
}

window.approveLoan = function(loanId) {
    handleLoanDecision(loanId, 'APPROVED');
};

window.rejectLoan = function(loanId) {
    handleLoanDecision(loanId, 'REJECTED');
};

// Make openLoanModal available globally
window.openLoanModal = openLoanModal;

// ─── My Profile Modal ────────────────────────────────────────────────────────

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

    try {
        const accessToken = getAccessToken();
        const userId      = getUserId();
        if (!accessToken || !userId) {
            body.innerHTML = `<p class="text-center text-red-500 text-sm py-8">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>`;
            document.getElementById('mp-edit-btn')?.classList.add('hidden');
            return;
        }
        await loadAndRenderMyProfile(userId, accessToken, body);
    } catch (err) {
        console.error('Error loading My Profile:', err);
        body.innerHTML = `
            <div class="flex flex-col items-center gap-2 py-8">
                <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                <p class="text-sm text-red-500">${err.message || 'Không thể tải hồ sơ'}</p>
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
    try {
        const accessToken = getAccessToken();
        const userId      = getUserId();
        await loadAndRenderEditMyProfileForm(userId, accessToken, editBody);
    } catch (err) {
        editBody.innerHTML = `
            <div class="flex flex-col items-center gap-2 py-8">
                <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                <p class="text-sm text-red-500">${err.message || 'Không thể tải form'}</p>
            </div>`;
    }
};

window.switchMyProfileToViewMode = async function() {
    const body = document.getElementById('my-profile-modal-body');
    _mpSetViewMode();
    if (!body) return;
    try {
        const accessToken = getAccessToken();
        const userId      = getUserId();
        await loadAndRenderMyProfile(userId, accessToken, body);
    } catch (err) { /* silently keep previous content */ }
};

window.saveMyProfile = async function() {
    const confirmed = await showConfirm('Bạn có chắc muốn cập nhật thông tin hồ sơ?', {
        confirmText: 'Cập nhật',
        cancelText: 'Hủy',
    });
    if (!confirmed) return;

    const saveBtn = document.getElementById('mp-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang lưu...';
    }
    try {
        const accessToken = getAccessToken();
        const userId      = getUserId();
        await submitEditMyProfileForm(userId, accessToken);
        // Show success, then switch back to view mode
        const successEl = document.getElementById('emp-form-success');
        if (successEl) { successEl.textContent = 'Cập nhật hồ sơ thành công!'; successEl.classList.remove('hidden'); }
        setTimeout(() => window.switchMyProfileToViewMode(), 1200);
    } catch (err) {
        if (err.message !== 'Validation failed') showEditMyProfileError(err.message || 'Không thể lưu');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span> Lưu thay đổi';
        }
    }
};

window.closeMyProfileModal = function() {
    document.getElementById('my-profile-modal')?.classList.add('hidden');
};

// ─── Prediction Result Modal ─────────────────────────────────────────────────

let _predModalLoanId       = null;
let _predModalPredictionId = null;

function getPredictionModalEls() {
    return {
        titleEl:           document.getElementById('pred-modal-title'),
        statusBadgeEl:     document.getElementById('pred-modal-status-badge'),
        btnApprove:        document.getElementById('pred-modal-btn-approve'),
        btnReject:         document.getElementById('pred-modal-btn-reject'),
        customerProfileEl: document.getElementById('pred-modal-customer-profile-body'),
        loanDetailsEl:     document.getElementById('pred-modal-loan-details-body'),
        riskCardEl:        document.getElementById('pred-modal-risk-card-body'),
        explanationBodyEl: document.getElementById('pred-modal-explanation-body'),
    };
}

function updatePredictionModalActions(currentLoan, currentPrediction) {
    const els = getPredictionModalEls();
    if (!els.btnApprove || !els.btnReject) return;

    const status = currentLoan?.status;
    const hasMlResult =
        currentLoan?.predictionLabel != null ||
        (currentPrediction?.predictionResult != null);

    const canRejectLoan =
        canWrite() &&
        currentLoan &&
        (status === 'UNDER_REVIEW' || status === 'PENDING') &&
        (!currentLoan.decision || currentLoan.decision === 'PENDING');

    const canApproveLoan =
        canWrite() &&
        currentLoan &&
        status === 'UNDER_REVIEW' &&
        (!currentLoan.decision || currentLoan.decision === 'PENDING') &&
        hasMlResult;

    if (canRejectLoan) {
        els.btnReject.classList.remove('hidden');
        els.btnReject.disabled = false;
    } else {
        els.btnReject.classList.add('hidden');
    }

    if (currentLoan && canWrite() && status === 'UNDER_REVIEW' &&
        (!currentLoan.decision || currentLoan.decision === 'PENDING')) {
        els.btnApprove.classList.remove('hidden');
        els.btnApprove.disabled = !canApproveLoan;
        els.btnApprove.title = canApproveLoan
            ? 'Phê duyệt khoản vay'
            : 'Chờ kết quả dự đoán AI trước khi phê duyệt';
        els.btnApprove.classList.toggle('opacity-50', !canApproveLoan);
        els.btnApprove.classList.toggle('cursor-not-allowed', !canApproveLoan);
    } else {
        els.btnApprove.classList.add('hidden');
    }
}

async function openPredictionModal(loanId, predictionId) {
    _predModalLoanId       = loanId;
    _predModalPredictionId = predictionId;

    const modal = document.getElementById('prediction-result-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const els = getPredictionModalEls();

    // Reset hidden buttons
    if (els.btnApprove) els.btnApprove.classList.add('hidden');
    if (els.btnReject)  els.btnReject.classList.add('hidden');

    // Show skeleton while loading
    renderLoadingSkeleton(els);

    try {
        const data = await loadAndRenderPrediction(loanId, predictionId, els);
        updatePredictionModalActions(data.currentLoan, data.currentPrediction);

        if (els.btnApprove) {
            els.btnApprove.onclick = () => {
                if (els.btnApprove.disabled) return;
                closePredictionModal();
                approveLoan(data.currentLoan?.id || loanId);
            };
        }
        if (els.btnReject) {
            els.btnReject.onclick = () => {
                closePredictionModal();
                rejectLoan(data.currentLoan?.id || loanId);
            };
        }

        const pending =
            data.currentPrediction?.predictionResult == null &&
            data.currentLoan?.predictionLabel == null &&
            data.currentPrediction?.status !== 'FAILED';

        if (pending) {
            startPredictionPolling(loanId, predictionId, els, 4000, (pollData) => {
                updatePredictionModalActions(pollData.currentLoan, pollData.currentPrediction);
            });
        }
    } catch (error) {
        console.error('Error loading prediction modal:', error);
        showToast('Không thể tải kết quả dự đoán: ' + error.message, { type: 'error' });
        if (els.riskCardEl) {
            els.riskCardEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 gap-2">
                    <span class="material-symbols-outlined text-3xl text-red-400">error</span>
                    <p class="text-sm text-red-500 font-semibold">Không thể tải kết quả dự đoán</p>
                    <p class="text-xs text-slate-400">${error.message}</p>
                </div>`;
        }
    }
}

window.closePredictionModal = function() {
    stopPredictionPolling();
    const modal = document.getElementById('prediction-result-modal');
    if (modal) modal.classList.add('hidden');
    _predModalLoanId       = null;
    _predModalPredictionId = null;
};

// Exposed for the "Refresh" button rendered inside the pending state
window.refreshPredictionModal = function() {
    if (_predModalLoanId || _predModalPredictionId) {
        const els = getPredictionModalEls();
        if (els.btnApprove) els.btnApprove.classList.add('hidden');
        if (els.btnReject)  els.btnReject.classList.add('hidden');
        renderLoadingSkeleton(els);
        loadAndRenderPrediction(_predModalLoanId, _predModalPredictionId, els)
            .then((data) => {
                updatePredictionModalActions(data.currentLoan, data.currentPrediction);
            })
            .catch((err) => {
                showToast('Không thể làm mới: ' + err.message, { type: 'error' });
            });
    }
};

// Make openPredictionModal available globally (used from inline HTML onclick)
window.openPredictionModal = openPredictionModal;

// ─── Initialize ──────────────────────────────────────────────────────────────

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initSidebarUserName();
    loadLoans();
    setupSearch();

    // Show prediction nav link for ANALYST
    const isAnalyst = getStoredRole().toUpperCase() === 'ANALYSTIC';
    const predictionNavLink = document.getElementById('nav-prediction-link');
    if (predictionNavLink && isAnalyst) {
        predictionNavLink.classList.remove('hidden');
    }

    // Modals chỉ đóng bằng nút Đóng / Hủy — không đóng khi click ra ngoài

    // Logout from sidebar avatar dropdown
    const logoutLink = document.getElementById('loan-logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            window.location.href = LOGIN_URL;
        });
    }
});
