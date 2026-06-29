// edit-customer-renderer.js
// Shared rendering utilities for View / Edit Customer in modal context.
// All form-field IDs are prefixed with "ec-" to avoid collisions with other elements.

import { getCustomerById, updateCustomer } from '/src/services/customer.service.js';

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmt(value, fallback = 'N/A') {
    return value != null && value !== '' ? value : fallback;
}

function fmtCurrency(amount) {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(amount);
}

function infoRow(label, value) {
    return `
        <div>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">${label}</p>
            <p class="text-sm text-slate-900 dark:text-slate-100 font-medium">${value}</p>
        </div>`;
}

const GRADE_BADGE = {
    A: 'bg-emerald-100 text-emerald-700', B: 'bg-green-100 text-green-700',
    C: 'bg-yellow-100 text-yellow-700',   D: 'bg-orange-100 text-orange-700',
    E: 'bg-red-100 text-red-700',         F: 'bg-rose-100 text-rose-700',
    G: 'bg-gray-100 text-gray-700',
};

const OWNERSHIP_BADGE = {
    OWN: 'bg-green-100 text-green-700', MORTGAGE: 'bg-blue-100 text-blue-700',
    RENT: 'bg-purple-100 text-purple-700', OTHER: 'bg-gray-100 text-gray-600',
};

// ─── View HTML ───────────────────────────────────────────────────────────────

export function renderCustomerViewHtml(customer) {
    const grade     = customer.loanGrade || 'N/A';
    const ownership = customer.personHomeOwnership || 'N/A';
    const hasDefault = String(customer.cbPersonDefaultOnFile || '').toUpperCase() === 'Y';

    const gradeBadge = grade !== 'N/A'
        ? `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${GRADE_BADGE[grade] || 'bg-gray-100 text-gray-700'}">${grade}</span>`
        : '<span class="text-sm font-medium text-slate-400">N/A</span>';

    const ownershipBadge = ownership !== 'N/A'
        ? `<span class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase ${OWNERSHIP_BADGE[ownership] || 'bg-gray-100 text-gray-700'}">${ownership}</span>`
        : '<span class="text-sm text-slate-400">N/A</span>';

    const defaultBadge = hasDefault
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-700"><span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>Đã từng vỡ nợ</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-700"><span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>Chưa từng vỡ nợ</span>';

    return `
        <div class="space-y-5">

            <!-- Basic Info -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Họ và tên', `<span class="font-semibold">${fmt(customer.fullName)}</span>`)}
                    ${infoRow('Email', fmt(customer.email))}
                    ${infoRow('Tuổi', customer.personAge != null ? `${customer.personAge} tuổi` : 'N/A')}
                    ${infoRow('Mã khách hàng', `<span class="font-mono text-xs">${fmt(customer.customerProfileId)}</span>`)}
                </div>
            </div>

            <!-- Financial Status -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">payments</span>
                    Tình trạng tài chính
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Thu nhập hàng năm', fmtCurrency(customer.personIncome))}
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Hình thức sở hữu nhà</p>
                        ${ownershipBadge}
                    </div>
                    ${infoRow('Thâm niên công việc', customer.personEmpLength != null ? `${customer.personEmpLength} năm` : 'N/A')}
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Hạng tín dụng</p>
                        <div class="flex items-center gap-2">${gradeBadge}</div>
                    </div>
                </div>
            </div>

            <!-- Credit History -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">history_edu</span>
                    Lịch sử tín dụng
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tiền sử vỡ nợ</p>
                        ${defaultBadge}
                    </div>
                    ${infoRow('Thâm niên tín dụng', customer.cbPersonCredHistLength != null ? `${customer.cbPersonCredHistLength} năm` : 'N/A')}
                </div>
            </div>

        </div>
    `;
}

// ─── Edit Form HTML ──────────────────────────────────────────────────────────

export function renderCustomerEditFormHtml() {
    return `
        <form id="ec-edit-form" class="space-y-5" novalidate>

            <!-- Basic Info -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Họ và tên <span class="text-red-500">*</span></label>
                        <input type="text" id="ec-fullName" name="fullName" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Địa chỉ Email <span class="text-red-500">*</span></label>
                        <input type="email" id="ec-email" name="email" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Tuổi <span class="text-red-500">*</span></label>
                        <input type="number" id="ec-personAge" name="personAge" min="18" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                </div>
            </div>

            <!-- Financial Status -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">payments</span>
                    Tình trạng tài chính
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Thu nhập hàng năm (VND) <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₫</span>
                            <input type="number" id="ec-personIncome" name="personIncome" min="0" step="1000" required
                                class="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Hình thức sở hữu nhà <span class="text-red-500">*</span></label>
                        <select id="ec-personHomeOwnership" name="personHomeOwnership" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Select...</option>
                            <option value="OWN">OWN</option>
                            <option value="RENT">RENT</option>
                            <option value="MORTGAGE">MORTGAGE</option>
                            <option value="OTHER">OTHER</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Thâm niên công việc (Năm) <span class="text-red-500">*</span></label>
                        <input type="number" id="ec-personEmpLength" name="personEmpLength" min="0" step="0.1" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Hạng tín dụng <span class="text-red-500">*</span></label>
                        <select id="ec-loanGrade" name="loanGrade" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Select...</option>
                            <option value="A">A – Xuất sắc</option>
                            <option value="B">B – Rất tốt</option>
                            <option value="C">C – Tốt</option>
                            <option value="D">D – Trung bình</option>
                            <option value="E">E – Kém</option>
                            <option value="F">F – Rất kém</option>
                            <option value="G">G – Xấu</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Credit History -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">history_edu</span>
                    Lịch sử tín dụng
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Tiền sử vỡ nợ <span class="text-red-500">*</span></label>
                        <div class="flex gap-2">
                            <label class="flex-1 cursor-pointer">
                                <input class="hidden peer" id="ec-defaultY" name="cbPersonDefaultOnFile" type="radio" value="Y"/>
                                <div class="text-center py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-700 text-sm font-medium transition-all">Có</div>
                            </label>
                            <label class="flex-1 cursor-pointer">
                                <input class="hidden peer" id="ec-defaultN" name="cbPersonDefaultOnFile" type="radio" value="N" checked/>
                                <div class="text-center py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700 text-sm font-medium transition-all">Không</div>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Thâm niên tín dụng (Năm) <span class="text-red-500">*</span></label>
                        <input type="number" id="ec-cbPersonCredHistLength" name="cbPersonCredHistLength" min="0" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                </div>
            </div>

            <!-- Form Error -->
            <div id="ec-form-error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm hidden"></div>

        </form>
    `;
}

// ─── Populate & read ─────────────────────────────────────────────────────────

export function populateCustomerEditForm(customer) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('ec-fullName',              customer.fullName);
    set('ec-email',                 customer.email);
    set('ec-personAge',             customer.personAge);
    set('ec-personIncome',          customer.personIncome);
    set('ec-personHomeOwnership',   customer.personHomeOwnership);
    set('ec-personEmpLength',       customer.personEmpLength);
    set('ec-loanGrade',             customer.loanGrade);
    set('ec-cbPersonCredHistLength', customer.cbPersonCredHistLength);

    const defaultVal = String(customer.cbPersonDefaultOnFile || 'N').toUpperCase();
    const radioY = document.getElementById('ec-defaultY');
    const radioN = document.getElementById('ec-defaultN');
    if (radioY && radioN) {
        radioY.checked = defaultVal === 'Y';
        radioN.checked = defaultVal !== 'Y';
    }
}

export function showCustomerFormError(message) {
    const el = document.getElementById('ec-form-error');
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
}

export function hideCustomerFormError() {
    document.getElementById('ec-form-error')?.classList.add('hidden');
}

// ─── Load orchestrators ──────────────────────────────────────────────────────

export async function loadAndRenderCustomerView(customerId, containerEl) {
    const customer = await getCustomerById(customerId);
    containerEl.innerHTML = renderCustomerViewHtml(customer);
    return customer;
}

export async function loadAndRenderCustomerEditForm(customerId, containerEl) {
    containerEl.innerHTML = renderCustomerEditFormHtml();
    const customer = await getCustomerById(customerId);
    populateCustomerEditForm(customer);
    return customer;
}

// ─── Submit ──────────────────────────────────────────────────────────────────

export async function submitCustomerEditForm(customerId) {
    const get     = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const getNum  = (id, parser) => { const v = get(id); return v !== '' ? parser(v) : null; };

    const fullName  = get('ec-fullName');
    const email     = get('ec-email');
    const personAge = getNum('ec-personAge', parseInt);

    if (!fullName || !email) { showCustomerFormError('Họ và tên và Email là bắt buộc.'); throw new Error('Validation failed'); }
    if (isNaN(personAge) || personAge < 18) { showCustomerFormError('Tuổi phải ít nhất là 18.'); throw new Error('Validation failed'); }

    const personIncome    = getNum('ec-personIncome',           parseFloat);
    const personEmpLength = getNum('ec-personEmpLength',        parseFloat);
    const credHistLength  = getNum('ec-cbPersonCredHistLength', parseInt);
    const homeOwnership   = get('ec-personHomeOwnership');
    const loanGrade       = get('ec-loanGrade');

    if (!homeOwnership) { showCustomerFormError('Vui lòng chọn hình thức sở hữu nhà.'); throw new Error('Validation failed'); }
    if (!loanGrade)     { showCustomerFormError('Vui lòng chọn hạng tín dụng.');    throw new Error('Validation failed'); }

    const cbPersonDefaultOnFile = document.querySelector('input[name="cbPersonDefaultOnFile"]:checked')?.value || 'N';

    hideCustomerFormError();

    return updateCustomer(customerId, {
        fullName, email, personAge,
        personIncome, personHomeOwnership: homeOwnership,
        personEmpLength, loanGrade,
        cbPersonDefaultOnFile, cbPersonCredHistLength: credHistLength,
    });
}
