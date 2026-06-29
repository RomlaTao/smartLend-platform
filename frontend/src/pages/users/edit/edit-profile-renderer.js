// edit-profile-renderer.js
// Shared rendering utilities for the Edit User Profile form (modal & standalone page)
// All form-field IDs are prefixed with "ep-" to avoid collisions with other modals on the same page.

import { getProfileById, updateProfileById } from '/src/services/identity.service.js';

// ─── Form HTML ───────────────────────────────────────────────────────────────

export function renderEditFormHtml() {
    return `
        <form id="ep-edit-form" class="space-y-5" novalidate>

            <!-- Basic Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Mã người dùng</label>
                        <input type="text" id="ep-user-id" readonly
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm font-mono cursor-not-allowed"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Tên đăng nhập</label>
                        <input type="text" id="ep-user-slug" name="userSlug" required
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Họ và tên <span class="text-red-500">*</span></label>
                        <input type="text" id="ep-full-name" name="fullName" required
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Địa chỉ Email <span class="text-red-500">*</span></label>
                        <input type="email" id="ep-email" name="email" required
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                </div>
            </div>

            <!-- Work Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">work</span>
                    Thông tin công việc
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Phòng ban</label>
                        <input type="text" id="ep-department" name="department" placeholder="Ví dụ: Tài chính"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Chức vụ</label>
                        <input type="text" id="ep-position" name="position" placeholder="Ví dụ: Chuyên viên phân tích cao cấp"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Ngày vào làm</label>
                        <input type="date" id="ep-hire-date" name="hireDate"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Trạng thái</label>
                        <select id="ep-is-active" name="isActive"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="true">Đang hoạt động</option>
                            <option value="false">Vô hiệu hóa</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Contact Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">contact_phone</span>
                    Thông tin liên hệ
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Số điện thoại</label>
                        <input type="tel" id="ep-phone-number" name="phoneNumber" placeholder="Ví dụ: +84 123 456 789"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Địa chỉ</label>
                        <textarea id="ep-address" name="address" rows="2" placeholder="Địa chỉ đầy đủ"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"></textarea>
                    </div>
                </div>
            </div>

            <!-- Form Error -->
            <div id="ep-form-error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm hidden"></div>

        </form>
    `;
}

// ─── Populate & read form ────────────────────────────────────────────────────

export function populateEditForm(profile) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('ep-user-id',      profile.userId);
    set('ep-user-slug',    profile.userSlug);
    set('ep-full-name',    profile.fullName);
    set('ep-email',        profile.email);
    set('ep-department',   profile.department);
    set('ep-position',     profile.position);
    set('ep-phone-number', profile.phoneNumber);
    set('ep-address',      profile.address);
    if (profile.hireDate) {
        set('ep-hire-date', profile.hireDate.split('T')[0]);
    }
    const isActiveEl = document.getElementById('ep-is-active');
    if (isActiveEl && profile.isActive !== undefined) {
        isActiveEl.value = profile.isActive ? 'true' : 'false';
    }
}

export function getEditFormValues() {
    const get = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const body = {
        userSlug:    get('ep-user-slug')    || null,
        fullName:    get('ep-full-name')    || null,
        email:       get('ep-email')        || null,
        department:  get('ep-department')   || null,
        position:    get('ep-position')     || null,
        phoneNumber: get('ep-phone-number') || null,
        address:     get('ep-address')      || null,
        isActive:    document.getElementById('ep-is-active')?.value === 'true',
    };
    const hireDate = get('ep-hire-date');
    if (hireDate) body.hireDate = hireDate;
    return body;
}

export function showEditFormError(message) {
    const el = document.getElementById('ep-form-error');
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
}

export function hideEditFormError() {
    document.getElementById('ep-form-error')?.classList.add('hidden');
}

// ─── Load orchestrator ───────────────────────────────────────────────────────

/**
 * Fetch a user profile and render the editable form into containerEl.
 * @param {string} userId
 * @param {string} accessToken
 * @param {HTMLElement} containerEl
 * @returns {Object} profile data
 */
export async function loadAndRenderEditForm(userId, accessToken, containerEl) {
    containerEl.innerHTML = renderEditFormHtml();
    const profile = await getProfileById(userId, accessToken);
    populateEditForm(profile);
    return profile;
}

/**
 * Submit form values to the API.
 * @param {string} accessToken
 * @param {string} userId
 * @returns {Promise}
 */
export async function submitEditForm(accessToken, userId) {
    const fullName = document.getElementById('ep-full-name')?.value.trim();
    const email    = document.getElementById('ep-email')?.value.trim();
    const userSlug = document.getElementById('ep-user-slug')?.value.trim();

    if (!fullName || !email || !userSlug) {
        showEditFormError('Họ và tên, Email và Tên đăng nhập là bắt buộc.');
        throw new Error('Validation failed');
    }

    hideEditFormError();
    const requestBody = getEditFormValues();
    return updateProfileById(accessToken, userId, requestBody);
}
