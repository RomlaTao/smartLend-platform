// create-loan-renderer.js
// Shared renderer for the Create Loan modal.
// All element IDs are prefixed with "cl-" to avoid DOM collisions.

import { getCustomerById } from '/src/services/customer.service.js';
import { createLoanApplication, triggerLoanPrediction } from '/src/services/loanmanagement.service.js';
import { LOAN_INTENT_LABELS } from '/src/utils/loanIntent.js';
import { EMPTY_LABEL, formatLoanGradeLabel, orEmpty } from '/src/utils/formatter.js';

// ─── Monthly payment calculator ───────────────────────────────────────────────

function calcMonthlyPayment(principal, annualRate, termMonths) {
    if (!principal || !annualRate || !termMonths) return 0;
    const r = annualRate / 100 / 12;
    return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

function updateLoanSummary() {
    const amount = parseFloat(document.getElementById('cl-amount')?.value || 0);
    const term   = parseInt(document.getElementById('cl-term')?.value || 0);
    const rate   = parseFloat(document.getElementById('cl-rate')?.value || 0);
    const display = document.getElementById('cl-monthly-payment');
    if (!display) return;
    if (amount > 0 && term > 0 && rate > 0) {
        display.textContent = calcMonthlyPayment(amount, rate, term).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        display.textContent = '0';
    }
}

// ─── Form HTML ───────────────────────────────────────────────────────────────

export function renderCreateLoanFormHtml() {
    const intentOptions = Object.entries(LOAN_INTENT_LABELS)
        .map(([value, label]) => `<option value="${value}">${label}</option>`)
        .join('');

    return `
        <div id="cl-customer-banner" class="mb-5 flex items-center gap-3 p-4 bg-primary/5 border border-primary/15 rounded-xl">
            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-xl">person</span>
            </div>
            <div>
                <p id="cl-customer-name" class="text-sm font-bold text-slate-900 dark:text-white">Đang tải...</p>
                <p id="cl-customer-meta" class="text-xs text-slate-500">Thông tin khách hàng</p>
            </div>
        </div>

        <form id="cl-form" class="space-y-5" novalidate>

            <!-- Core details -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">description</span>
                    Chi tiết khoản vay
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Mục đích vay <span class="text-red-500">*</span></label>
                        <select id="cl-intent" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            ${intentOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Số tiền yêu cầu (VND) <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₫</span>
                            <input type="number" id="cl-amount" min="0" step="1000000" value="100000000" required
                                class="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Kỳ hạn (Tháng) <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <input type="number" id="cl-term" min="1" max="360" value="12" required
                                class="w-full pl-4 pr-16 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">Tháng</span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Lãi suất (%) <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <input type="number" id="cl-rate" min="0" max="100" step="0.1" value="12.5" required
                                class="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-1">Lãi suất thị trường: 11.25% – 14.50%</p>
                    </div>
                </div>
            </div>

            <!-- Loan summary -->
            <div class="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-base">analytics</span>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-primary uppercase tracking-wide">Thanh toán hàng tháng dự kiến</p>
                        <p class="text-xs text-slate-500">Dựa trên thông tin hiện tại</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-extrabold text-slate-900 dark:text-white">
                        <span class="text-primary">₫</span><span id="cl-monthly-payment">0</span>
                    </p>
                </div>
            </div>

            <!-- Disclaimer -->
            <div class="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span class="material-symbols-outlined text-yellow-600 text-sm mt-0.5">info</span>
                <p class="text-xs text-yellow-800 dark:text-yellow-200/80 leading-relaxed">
                    Đây là ước tính và không bao gồm phí, thuế hoặc phạt. Việc phê duyệt phụ thuộc vào đánh giá tín dụng.
                </p>
            </div>

            <!-- Error / Success -->
            <div id="cl-form-error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm hidden"></div>
            <div id="cl-form-success" class="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm hidden flex items-center gap-2">
                <span class="material-symbols-outlined text-base">check_circle</span>
                <span id="cl-success-text"></span>
            </div>

        </form>
    `;
}

// ─── Init listeners ───────────────────────────────────────────────────────────

export function initCreateLoanFormListeners() {
    document.getElementById('cl-amount')?.addEventListener('input', updateLoanSummary);
    document.getElementById('cl-term')?.addEventListener('input', updateLoanSummary);
    document.getElementById('cl-rate')?.addEventListener('input', updateLoanSummary);
    updateLoanSummary();
}

// ─── Load customer info into banner ──────────────────────────────────────────

export async function loadCustomerInfoForLoan(customerId) {
    try {
        const customer = await getCustomerById(customerId);
        const nameEl = document.getElementById('cl-customer-name');
        const metaEl = document.getElementById('cl-customer-meta');
        if (nameEl) nameEl.textContent = orEmpty(customer.fullName, 'Không xác định');
        if (metaEl) metaEl.textContent = `${customer.email || ''} · Hạng ${customer.loanGrade ? `${customer.loanGrade} (${formatLoanGradeLabel(customer.loanGrade)})` : EMPTY_LABEL}`;
        return customer;
    } catch {
        document.getElementById('cl-customer-name').textContent = 'Không thể tải thông tin khách hàng';
    }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function showCreateLoanError(message) {
    const el = document.getElementById('cl-form-error');
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
    document.getElementById('cl-form-success')?.classList.add('hidden');
}

export function hideCreateLoanMessages() {
    document.getElementById('cl-form-error')?.classList.add('hidden');
    document.getElementById('cl-form-success')?.classList.add('hidden');
}

export function resetCreateLoanForm() {
    document.getElementById('cl-form')?.reset();
    hideCreateLoanMessages();
    document.getElementById('cl-amount').value = '10000';
    document.getElementById('cl-term').value   = '12';
    document.getElementById('cl-rate').value   = '12.5';
    updateLoanSummary();
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitCreateLoanForm(customerId, staffId) {
    hideCreateLoanMessages();

    const loanIntent            = document.getElementById('cl-intent')?.value;
    const requestedAmount       = parseFloat(document.getElementById('cl-amount')?.value);
    const requestedTermMonths   = parseInt(document.getElementById('cl-term')?.value);
    const requestedInterestRate = parseFloat(document.getElementById('cl-rate')?.value);

    if (!loanIntent)                                             { showCreateLoanError('Vui lòng chọn mục đích vay.'); throw new Error('Validation failed'); }
    if (isNaN(requestedAmount) || requestedAmount <= 0)          { showCreateLoanError('Số tiền vay phải lớn hơn 0.'); throw new Error('Validation failed'); }
    if (isNaN(requestedTermMonths) || requestedTermMonths <= 0 || requestedTermMonths > 360)
                                                                  { showCreateLoanError('Kỳ hạn phải từ 1 đến 360 tháng.'); throw new Error('Validation failed'); }
    if (isNaN(requestedInterestRate) || requestedInterestRate <= 0 || requestedInterestRate > 100)
                                                                  { showCreateLoanError('Lãi suất phải từ 0 đến 100.'); throw new Error('Validation failed'); }

    const result = await createLoanApplication(staffId, {
        customerId, loanIntent, requestedAmount, requestedTermMonths, requestedInterestRate,
    });

    let predictionTriggered = false;
    let predictionError = null;
    try {
        await triggerLoanPrediction(result.id, staffId);
        predictionTriggered = true;
    } catch (predErr) {
        predictionError = predErr.message || 'Lỗi không xác định';
        console.warn('[create-loan-renderer] Prediction trigger failed:', predictionError);
    }

    return { result, predictionTriggered, predictionError };
}
