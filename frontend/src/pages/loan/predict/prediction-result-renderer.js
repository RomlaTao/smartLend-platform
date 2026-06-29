// prediction-result-renderer.js
// Shared rendering utilities for Prediction Result views (modal & standalone page)

import { getLoanApplicationById, getLoanApplicationsByCustomerId } from '/src/services/loanmanagement.service.js';
import { getCustomerById } from '/src/services/customer.service.js';
import { getPredictionById } from '/src/services/prediction.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatCurrency(amount) {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(amount);
}

export function formatUsd(amount) {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function _hasSnapshotData(loan) {
    return loan != null && (
        loan.snapshotPersonAge != null ||
        loan.snapshotPersonIncome != null ||
        loan.snapshotLoanAmnt != null ||
        loan.snapshotLoanPercentIncome != null
    );
}

export function getDaysAgo(dateString) {
    if (!dateString) return 0;
    const diffTime = Math.abs(new Date() - new Date(dateString));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function field(label, value) {
    return `
        <div>
            <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">${label}</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100 text-base">${value}</p>
        </div>`;
}

// ─── Card renderers ──────────────────────────────────────────────────────────

export function renderCustomerProfile(containerEl, customer, loan = null) {
    const useSnapshot = _hasSnapshotData(loan);
    const note = useSnapshot
        ? '<p class="col-span-2 text-[11px] text-slate-400 italic mb-1">(tại thời điểm nộp đơn)</p>'
        : '';

    const age = useSnapshot && loan.snapshotPersonAge != null
        ? loan.snapshotPersonAge
        : (customer?.personAge ?? 'N/A');
    const income = useSnapshot && loan.snapshotPersonIncome != null
        ? formatUsd(loan.snapshotPersonIncome)
        : (customer?.personIncome ? formatCurrency(customer.personIncome) : 'N/A');
    const homeOwnership = useSnapshot && loan.snapshotPersonHomeOwnership
        ? loan.snapshotPersonHomeOwnership
        : (customer?.personHomeOwnership || 'N/A');

    containerEl.innerHTML = `
        ${note}
        ${field('Họ và tên', customer?.fullName || 'N/A')}
        ${field('Email', customer?.email || 'N/A')}
        ${field('Tuổi', age)}
        ${field('Thu nhập hàng năm', income)}
        ${field('Hình thức sở hữu nhà', homeOwnership)}
        ${field('Thâm niên công việc', customer?.personEmpLength != null ? `${customer.personEmpLength} năm` : 'N/A')}
    `;
}

export function renderLoanDetails(containerEl, loan, customer) {
    const useSnapshot = _hasSnapshotData(loan);
    const note = useSnapshot
        ? '<p class="col-span-2 text-[11px] text-slate-400 italic mb-1">(tại thời điểm nộp đơn)</p>'
        : '';

    const loanGrade = loan?.loanGrade || customer?.loanGrade || 'N/A';
    const amountDisplay = useSnapshot && loan.snapshotLoanAmnt != null
        ? formatUsd(loan.snapshotLoanAmnt)
        : (loan?.requestedAmount ? formatCurrency(loan.requestedAmount) : 'N/A');

    let percentIncome = 'N/A';
    if (useSnapshot && loan.snapshotLoanPercentIncome != null) {
        percentIncome = (loan.snapshotLoanPercentIncome * 100).toFixed(1) + '%';
    } else if (customer?.personIncome && loan?.requestedAmount) {
        percentIncome = ((loan.requestedAmount / customer.personIncome) * 100).toFixed(1) + '%';
    }

    const daysAgo = getDaysAgo(loan?.createdAt);
    containerEl.innerHTML = `
        ${note}
        ${field('Mục đích vay', `<span class="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 text-xs font-bold uppercase">${loan?.loanIntent || 'N/A'}</span>`)}
        ${field('Hạng tín dụng', `<span class="text-primary font-black text-lg">${loanGrade}</span>`)}
        ${field('Số tiền vay', amountDisplay)}
        ${field('Kỳ hạn', loan?.requestedTermMonths != null ? `${loan.requestedTermMonths} tháng` : 'N/A')}
        ${field('Lãi suất', loan?.requestedInterestRate != null ? `${loan.requestedInterestRate}% (Cố định)` : 'N/A')}
        ${field('Vay / Thu nhập', percentIncome)}
        ${field('Ngày nộp', daysAgo > 0 ? `${daysAgo} ngày trước` : 'Hôm nay')}
    `;
}

export function renderStatusBadge(badgeEl, prediction) {
    const hasResult = prediction != null
        && prediction.predictionResult != null;

    if (!hasResult) {
        badgeEl.className = 'px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse';
        badgeEl.textContent = 'CHỜ XỬ LÝ';
    } else if (prediction.predictionResult === true) {
        badgeEl.className = 'px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider';
        badgeEl.textContent = 'PHÊ DUYỆT';
    } else {
        badgeEl.className = 'px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider';
        badgeEl.textContent = 'TỪ CHỐI';
    }
}

// ─── Risk level helpers ──────────────────────────────────────────────────────

function _riskLevelConfig(riskLevel) {
    switch ((riskLevel || '').toLowerCase()) {
        case 'high-risk':
            return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Rủi ro Cao' };
        case 'medium-risk':
            return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400', label: 'Rủi ro Trung bình' };
        case 'low-risk':
            return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Rủi ro Thấp' };
        default:
            return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: riskLevel || 'Không xác định' };
    }
}

function _buildRiskLevelBadge(riskLevel) {
    if (!riskLevel) return '';
    const { bg, text, dot, label } = _riskLevelConfig(riskLevel);
    return `<span class="flex items-center gap-1.5 px-2.5 py-1 ${bg} rounded-full">
        <span class="w-2 h-2 rounded-full ${dot} inline-block"></span>
        <span class="text-xs font-bold ${text}">${label}</span>
    </span>`;
}

// ─── Pending state ───────────────────────────────────────────────────────────

function renderPendingState(cardBody) {
    cardBody.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div class="relative w-20 h-20">
                <svg class="w-full h-full animate-spin" viewBox="0 0 80 80">
                    <circle class="text-slate-100 dark:text-slate-800" cx="40" cy="40" fill="transparent" r="32"
                        stroke="currentColor" stroke-width="8"/>
                    <circle class="text-primary" cx="40" cy="40" fill="transparent" r="32"
                        stroke="currentColor" stroke-dasharray="201" stroke-dashoffset="50" stroke-width="8"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="material-icons-round text-primary text-2xl animate-pulse">psychology</span>
                </div>
            </div>
            <div>
                <p class="font-bold text-slate-800 dark:text-white text-sm">Đang xử lý...</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[180px]">
                    Mô hình AI đang phân tích hồ sơ này.
                </p>
            </div>
            <button
                onclick="window.refreshPredictionModal ? window.refreshPredictionModal() : window.location.reload()"
                class="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1">
                <span class="material-icons-round text-sm">refresh</span>
                Làm mới
            </button>
        </div>
    `;
}

function renderPredictionResultContent(cardBody, prediction) {
    const isApproved = prediction.predictionResult === true;
    const riskLevel  = prediction.riskLevel || prediction.explanation?.riskLevel || null;
    // confidence = p_default (probability of default from LightGBM), use directly
    const riskPct    = prediction.confidence != null
        ? Math.round(prediction.confidence * 100)
        : null;
    const defaultPct = prediction.confidence != null
        ? (prediction.confidence * 100).toFixed(1)
        : 'N/A';

    const C = 339;
    let arcColor, verdictBg, verdictText, verdictLabel;
    if (isApproved) {
        arcColor     = 'text-emerald-500';
        verdictBg    = 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50';
        verdictText  = 'text-emerald-700 dark:text-emerald-300';
        verdictLabel = 'CÓ THỂ PHÊ DUYỆT AN TOÀN';
    } else {
        arcColor     = 'text-red-500';
        verdictBg    = 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50';
        verdictText  = 'text-red-700 dark:text-red-300';
        verdictLabel = 'RỦI RO CAO — KHÔNG NÊN PHÊ DUYỆT';
    }
    const strokeOffset = riskPct != null ? C - (riskPct / 100) * C : C * 0.5;

    cardBody.innerHTML = `
        <div class="flex flex-col items-center py-4 mb-4">
            <div class="relative w-36 h-36">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle class="text-slate-100 dark:text-slate-800" cx="60" cy="60"
                        fill="transparent" r="54" stroke="currentColor" stroke-width="12"/>
                    <circle class="${arcColor}" cx="60" cy="60"
                        fill="transparent" r="54" stroke="currentColor" stroke-width="12"
                        stroke-dasharray="${C}" stroke-dashoffset="${strokeOffset}"
                        stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span class="text-2xl font-black text-slate-800 dark:text-white">
                        ${riskPct != null ? riskPct + '%' : '—'}
                    </span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">rủi ro</span>
                </div>
            </div>
            ${riskLevel ? `<div class="mt-2">${_buildRiskLevelBadge(riskLevel)}</div>` : ''}
            <div class="mt-3 flex gap-5 text-xs text-slate-400">
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Thấp</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Trung bình</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Cao</span>
            </div>
        </div>
        <div class="${verdictBg} rounded-lg p-5 text-center">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1 ${verdictText}">Kết luận</p>
            <h3 class="text-sm font-extrabold ${verdictText}">${verdictLabel}</h3>
            <p class="text-xs ${verdictText} opacity-80 mt-1">
                Xác suất vỡ nợ: ${defaultPct}%
            </p>
        </div>
    `;
}

export function renderRiskAssessment(containerEl, prediction) {
    const hasResult = prediction != null && prediction.predictionResult != null;
    if (!hasResult) {
        renderPendingState(containerEl);
    } else {
        renderPredictionResultContent(containerEl, prediction);
    }
}

// ─── XAI Explanation (SHAP + LIME) ──────────────────────────────────────────

/**
 * Render SHAP + LIME explanation into containerEl.
 * Hides the container if no explanation data is available.
 * @param {HTMLElement} containerEl
 * @param {{ explanation?: { riskLevel?: string, shapBaseValue?: number, shapValues?: Record<string,number>, limeFeatures?: Array<{rule:string,weight:number}> } }|null} prediction
 */
export function renderExplanationSection(containerEl, prediction) {
    if (!containerEl) return;

    const explanation = prediction?.explanation;
    const isCompleted = prediction?.predictionResult != null;

    if (!explanation) {
        // Show placeholder only if prediction is completed (not pending)
        if (isCompleted) {
            containerEl.classList.remove('hidden');
            containerEl.innerHTML = `
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4 text-slate-400">
                    <span class="material-symbols-outlined text-3xl shrink-0">analytics</span>
                    <div>
                        <p class="text-sm font-semibold text-slate-500">Giải thích AI (XAI) chưa khả dụng</p>
                        <p class="text-xs mt-0.5">Dự đoán này được tạo trước khi hệ thống XAI được kích hoạt. Các dự đoán mới sẽ có đầy đủ phân tích SHAP &amp; LIME.</p>
                    </div>
                </div>`;
        } else {
            containerEl.classList.add('hidden');
        }
        return;
    }
    containerEl.classList.remove('hidden');

    // SHAP: sort by absolute value descending, show top 10
    const shapValues  = explanation.shapValues  || {};
    const shapEntries = Object.entries(shapValues)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 10);
    const maxAbs = shapEntries.length > 0
        ? Math.max(...shapEntries.map(([, v]) => Math.abs(v)))
        : 1;

    const shapRows = shapEntries.map(([feature, value]) => {
        const pct      = maxAbs > 0 ? ((Math.abs(value) / maxAbs) * 100).toFixed(1) : 0;
        const isPos    = value >= 0;
        const barColor = isPos ? 'bg-red-400'     : 'bg-emerald-400';
        const valColor = isPos ? 'text-red-600'   : 'text-emerald-600';
        const sign     = isPos ? '+'              : '';
        return `
            <div class="flex items-center gap-2 py-1">
                <span class="text-[11px] text-slate-600 w-44 truncate shrink-0 font-medium" title="${feature}">${feature}</span>
                <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="${barColor} h-full rounded-full transition-all" style="width:${pct}%"></div>
                </div>
                <span class="text-[11px] font-bold ${valColor} w-14 text-right shrink-0">${sign}${value.toFixed(3)}</span>
            </div>`;
    }).join('');

    // LIME: list of rules with weights
    const limeFeatures = explanation.limeFeatures || [];
    const limeRows = limeFeatures.map((f) => {
        const isPos      = f.weight >= 0;
        const ruleColor  = isPos ? 'bg-red-50 border-red-200 text-red-800'       : 'bg-emerald-50 border-emerald-200 text-emerald-800';
        const valColor   = isPos ? 'text-red-600 font-black'                     : 'text-emerald-600 font-black';
        const sign       = isPos ? '+' : '';
        return `
            <div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                <span class="text-[11px] px-2 py-1 rounded border ${ruleColor} flex-1 leading-snug">${f.rule}</span>
                <span class="text-[11px] ${valColor} whitespace-nowrap mt-1">${sign}${f.weight.toFixed(3)}</span>
            </div>`;
    }).join('');

    const riskLevelBadge = _buildRiskLevelBadge(explanation.riskLevel || prediction?.riskLevel || '');
    const shapBaseNote   = explanation.shapBaseValue != null
        ? `<span class="text-[10px] text-slate-400">Base value: <strong>${explanation.shapBaseValue.toFixed(3)}</strong></span>`
        : '';

    containerEl.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <!-- Section header -->
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                <span class="material-symbols-outlined text-indigo-500 text-xl">analytics</span>
                <h3 class="font-bold text-slate-800 dark:text-white">Giải thích AI (XAI)</h3>
                ${riskLevelBadge}
                <span class="ml-auto text-[10px] text-slate-400">Powered by SHAP &amp; LIME</span>
            </div>

            <!-- SHAP + LIME side by side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">

                <!-- SHAP panel -->
                <div class="p-6">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-400 text-lg">bar_chart</span>
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">SHAP — Tầm quan trọng đặc trưng</h4>
                        </div>
                        ${shapBaseNote}
                    </div>
                    <div class="flex gap-4 text-[10px] text-slate-400 mb-4">
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Tăng rủi ro vỡ nợ</span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Giảm rủi ro vỡ nợ</span>
                    </div>
                    <div class="space-y-1">
                        ${shapRows || '<p class="text-xs text-slate-400 text-center py-6">Không có dữ liệu SHAP</p>'}
                    </div>
                </div>

                <!-- LIME panel -->
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="material-symbols-outlined text-violet-400 text-lg">lightbulb</span>
                        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">LIME — Giải thích cục bộ</h4>
                        <span class="ml-auto text-[10px] text-slate-400">${limeFeatures.length} quy tắc</span>
                    </div>
                    <div class="flex gap-4 text-[10px] text-slate-400 mb-4">
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Tăng rủi ro vỡ nợ</span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Giảm rủi ro vỡ nợ</span>
                    </div>
                    <div>
                        ${limeRows || '<p class="text-xs text-slate-400 text-center py-6">Không có dữ liệu LIME</p>'}
                    </div>
                </div>

            </div>
        </div>
    `;
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

export function renderLoadingSkeleton(els) {
    if (els.titleEl)           els.titleEl.textContent = 'Kết quả dự đoán';
    if (els.statusBadgeEl) {
        els.statusBadgeEl.className = 'px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse';
        els.statusBadgeEl.textContent = 'ĐANG TẢI...';
    }
    if (els.customerProfileEl) els.customerProfileEl.innerHTML = `<div class="col-span-2 flex justify-center py-4"><span class="material-icons-round text-3xl text-slate-200 dark:text-slate-700 animate-pulse">person</span></div>`;
    if (els.loanDetailsEl)     els.loanDetailsEl.innerHTML     = `<div class="col-span-2 flex justify-center py-4"><span class="material-icons-round text-3xl text-slate-200 dark:text-slate-700 animate-pulse">request_quote</span></div>`;
    if (els.riskCardEl)        els.riskCardEl.innerHTML        = `<div class="flex flex-col items-center justify-center py-8 gap-3"><span class="material-icons-round text-4xl text-slate-300 dark:text-slate-600 animate-pulse">psychology</span><p class="text-sm text-slate-400">Đang tải dự đoán...</p></div>`;
    if (els.explanationBodyEl) els.explanationBodyEl.classList.add('hidden');
}

// ─── Main load orchestrator ──────────────────────────────────────────────────

/**
 * Load all data for a prediction result and render into provided DOM elements.
 * @param {string|null} loanId
 * @param {string|null} predictionId
 * @param {Object} els  – { titleEl, statusBadgeEl, customerProfileEl, loanDetailsEl, riskCardEl, explanationBodyEl? }
 * @returns {{ currentLoan, currentCustomer, currentPrediction }}
 */
export async function loadAndRenderPrediction(loanId, predictionId, els) {
    let currentLoan       = null;
    let currentCustomer   = null;
    let currentPrediction = null;

    if (loanId) {
        currentLoan     = await getLoanApplicationById(loanId);
        currentCustomer = await getCustomerById(currentLoan.customerId);
        if (currentLoan.predictionId) {
            try {
                currentPrediction = await getPredictionById(currentLoan.predictionId);
            } catch (e) {
                console.log('Prediction not ready yet:', e.message);
                currentPrediction = null;
            }
        }
    } else {
        currentPrediction = await getPredictionById(predictionId);
        currentCustomer   = await getCustomerById(currentPrediction.customerId);
        const loansOfCustomer = await getLoanApplicationsByCustomerId(
            currentCustomer.id || currentPrediction.customerId,
        );
        currentLoan = Array.isArray(loansOfCustomer)
            ? loansOfCustomer.find((l) => String(l.predictionId) === String(predictionId))
            : null;
    }

    if (currentLoan?.predictionLabel != null) {
        const merged = { ...(currentPrediction || {}) };
        if (merged.predictionResult == null) {
            merged.predictionResult = currentLoan.predictionLabel;
            merged.confidence = currentLoan.predictionConfidence ?? merged.confidence;
            merged.status = merged.status || 'COMPLETED';
            currentPrediction = merged;
        }
    }

    // Title
    if (els.titleEl) {
        const loanIdShort = currentLoan?.id ? currentLoan.id.substring(0, 8).toUpperCase() : '--------';
        els.titleEl.textContent = `${currentCustomer.fullName || 'Unknown'} — #${loanIdShort}`;
    }

    // Status badge
    if (els.statusBadgeEl) renderStatusBadge(els.statusBadgeEl, currentPrediction);

    // Customer + loan cards
    if (els.customerProfileEl && currentCustomer) {
        renderCustomerProfile(els.customerProfileEl, currentCustomer, currentLoan);
    }
    if (els.loanDetailsEl && currentLoan && currentCustomer) {
        renderLoanDetails(els.loanDetailsEl, currentLoan, currentCustomer);
    }

    // Risk score card
    if (els.riskCardEl) renderRiskAssessment(els.riskCardEl, currentPrediction);

    // XAI explanation (SHAP + LIME)
    if (els.explanationBodyEl) renderExplanationSection(els.explanationBodyEl, currentPrediction);

    return { currentLoan, currentCustomer, currentPrediction };
}

// ─── Auto-poll for pending predictions ───────────────────────────────────────

let _pollTimerId = null;

export function stopPredictionPolling() {
    if (_pollTimerId != null) {
        clearInterval(_pollTimerId);
        _pollTimerId = null;
    }
}

function _isPredictionComplete(loan, prediction) {
    if (prediction?.predictionResult != null) return true;
    if (loan?.predictionLabel != null) return true;
    if (prediction?.status === 'FAILED') return true;
    return false;
}

/**
 * Poll until prediction completes or modal closes.
 * @param {string|null} loanId
 * @param {string|null} predictionId
 * @param {Object} els - DOM elements for re-render
 * @param {number} [intervalMs=4000]
 * @param {Function} [onUpdate] - callback after each poll with loadAndRenderPrediction result
 */
export function startPredictionPolling(loanId, predictionId, els, intervalMs = 4000, onUpdate) {
    stopPredictionPolling();

    async function poll() {
        try {
            const data = await loadAndRenderPrediction(loanId, predictionId, els);
            if (onUpdate) onUpdate(data);
            if (_isPredictionComplete(data.currentLoan, data.currentPrediction)) {
                stopPredictionPolling();
            }
        } catch (e) {
            console.warn('[prediction-poll] Poll failed:', e.message);
        }
    }

    _pollTimerId = setInterval(poll, intervalMs);
}
