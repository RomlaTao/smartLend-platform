// create-customer-renderer.js
// Shared renderer for the Create Customer modal.
// All element IDs are prefixed with "cc-" to avoid DOM collisions.

import { createCustomer } from '/src/services/customer.service.js';

// ─── Form HTML ───────────────────────────────────────────────────────────────

export function renderCreateCustomerFormHtml() {
    return `
        <form id="cc-form" class="space-y-5" novalidate>

            <!-- Basic Info -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Họ và tên <span class="text-red-500">*</span></label>
                        <input type="text" id="cc-fullName" name="fullName" placeholder="Nhập họ và tên" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Email <span class="text-red-500">*</span></label>
                        <input type="email" id="cc-email" name="email" placeholder="email@example.com" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Tuổi <span class="text-red-500">*</span></label>
                        <input type="number" id="cc-personAge" name="personAge" min="18" max="120" placeholder="25" required
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
                            <input type="number" id="cc-personIncome" name="personIncome" min="0" step="1000" placeholder="50000000" required
                                class="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Hình thức sở hữu nhà <span class="text-red-500">*</span></label>
                        <select id="cc-personHomeOwnership" name="personHomeOwnership" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">-- Chọn --</option>
                            <option value="RENT">Thuê nhà</option>
                            <option value="OWN">Sở hữu</option>
                            <option value="MORTGAGE">Đang thế chấp</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Thâm niên công việc (Năm) <span class="text-red-500">*</span></label>
                        <input type="number" id="cc-personEmpLength" name="personEmpLength" min="0" step="0.1" placeholder="3.5" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Hạng tín dụng <span class="text-red-500">*</span></label>
                        <select id="cc-loanGrade" name="loanGrade" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">-- Chọn --</option>
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
                                <input class="hidden peer" name="cbPersonDefaultOnFile" type="radio" value="Y"/>
                                <div class="text-center py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-700 text-sm font-medium transition-all">Có</div>
                            </label>
                            <label class="flex-1 cursor-pointer">
                                <input class="hidden peer" name="cbPersonDefaultOnFile" type="radio" value="N" checked/>
                                <div class="text-center py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700 text-sm font-medium transition-all">Không</div>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Thâm niên tín dụng (Năm) <span class="text-red-500">*</span></label>
                        <input type="number" id="cc-cbPersonCredHistLength" name="cbPersonCredHistLength" min="0" placeholder="5" required
                            class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                </div>
            </div>

            <!-- Error -->
            <div id="cc-form-error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm hidden"></div>

            <!-- Success -->
            <div id="cc-form-success" class="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm hidden flex items-center gap-2">
                <span class="material-symbols-outlined text-base">check_circle</span>
                <span></span>
            </div>

        </form>
    `;
}

// ─── Error helpers ───────────────────────────────────────────────────────────

export function showCreateCustomerError(message) {
    const el = document.getElementById('cc-form-error');
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
    document.getElementById('cc-form-success')?.classList.add('hidden');
}

export function hideCreateCustomerMessages() {
    document.getElementById('cc-form-error')?.classList.add('hidden');
    document.getElementById('cc-form-success')?.classList.add('hidden');
}

// ─── Reset form ──────────────────────────────────────────────────────────────

export function resetCreateCustomerForm() {
    document.getElementById('cc-form')?.reset();
    hideCreateCustomerMessages();
}

// ─── Submit ──────────────────────────────────────────────────────────────────

export async function submitCreateCustomerForm() {
    const get    = (id)        => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const getNum = (id, fn)    => { const v = get(id); return v !== '' ? fn(v) : NaN; };

    hideCreateCustomerMessages();

    const fullName  = get('cc-fullName');
    const email     = get('cc-email');
    const personAge = getNum('cc-personAge', parseInt);

    if (!fullName || !email) { showCreateCustomerError('Họ và tên và Email là bắt buộc.'); throw new Error('Validation failed'); }
    if (isNaN(personAge) || personAge < 18) { showCreateCustomerError('Tuổi phải ít nhất là 18.'); throw new Error('Validation failed'); }

    const personIncome    = getNum('cc-personIncome',           parseFloat);
    const personEmpLength = getNum('cc-personEmpLength',        parseFloat);
    const credHistLength  = getNum('cc-cbPersonCredHistLength', parseInt);
    const homeOwnership   = get('cc-personHomeOwnership');
    const loanGrade       = get('cc-loanGrade');

    if (isNaN(personIncome)  || personIncome < 0)   { showCreateCustomerError('Thu nhập hàng năm phải là số dương.'); throw new Error('Validation failed'); }
    if (!homeOwnership)                              { showCreateCustomerError('Vui lòng chọn hình thức sở hữu nhà.'); throw new Error('Validation failed'); }
    if (isNaN(personEmpLength) || personEmpLength < 0) { showCreateCustomerError('Thâm niên công việc phải là số dương.'); throw new Error('Validation failed'); }
    if (!loanGrade)                                  { showCreateCustomerError('Vui lòng chọn hạng tín dụng.'); throw new Error('Validation failed'); }
    if (isNaN(credHistLength) || credHistLength < 0) { showCreateCustomerError('Thâm niên tín dụng phải là số dương.'); throw new Error('Validation failed'); }

    const cbPersonDefaultOnFile = document.querySelector('#cc-form input[name="cbPersonDefaultOnFile"]:checked')?.value || 'N';

    return createCustomer({
        fullName, email, personAge,
        personIncome, personHomeOwnership: homeOwnership,
        personEmpLength, loanGrade,
        cbPersonDefaultOnFile, cbPersonCredHistLength: credHistLength,
    });
}
