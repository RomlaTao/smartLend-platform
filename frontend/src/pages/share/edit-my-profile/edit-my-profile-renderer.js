// edit-my-profile-renderer.js
// Shared rendering utilities for the "Edit My Profile" form used in modals.
// All form-field IDs are prefixed with "emp-" to avoid collisions with other modals.
// Staff can edit their own profile; no isActive field (can't deactivate themselves).

import { getCurrentProfile, updateCurrentProfile } from '/src/services/identity.service.js';

// ─── Form HTML ───────────────────────────────────────────────────────────────

export function renderEditMyProfileFormHtml() {
    return `
        <form id="emp-edit-form" class="space-y-5" novalidate>

            <!-- Basic Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Mã người dùng</label>
                        <input type="text" id="emp-user-id" readonly
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm font-mono cursor-not-allowed"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Tên đăng nhập</label>
                        <input type="text" id="emp-user-slug" name="userSlug" required
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Họ và tên <span class="text-red-500">*</span></label>
                        <input type="text" id="emp-full-name" name="fullName" required
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Địa chỉ Email <span class="text-red-500">*</span></label>
                        <input type="email" id="emp-email" name="email" required
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
                        <input type="text" id="emp-department" name="department" placeholder="Ví dụ: Tài chính"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Chức vụ</label>
                        <input type="text" id="emp-position" name="position" placeholder="Ví dụ: Chuyên viên phân tích cao cấp"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Ngày vào làm</label>
                        <input type="date" id="emp-hire-date" name="hireDate"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
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
                        <input type="tel" id="emp-phone-number" name="phoneNumber" placeholder="Ví dụ: +84 123 456 789"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"/>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Địa chỉ</label>
                        <textarea id="emp-address" name="address" rows="2" placeholder="Địa chỉ đầy đủ"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"></textarea>
                    </div>
                </div>
            </div>

            <!-- Form Error / Success -->
            <div id="emp-form-error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm hidden"></div>
            <div id="emp-form-success" class="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm hidden"></div>

        </form>
    `;
}

// ─── Populate & read ─────────────────────────────────────────────────────────

export function populateEditMyProfileForm(profile) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('emp-user-id',      profile.userId);
    set('emp-user-slug',    profile.userSlug);
    set('emp-full-name',    profile.fullName);
    set('emp-email',        profile.email);
    set('emp-department',   profile.department);
    set('emp-position',     profile.position);
    set('emp-phone-number', profile.phoneNumber);
    set('emp-address',      profile.address);
    if (profile.hireDate) {
        set('emp-hire-date', profile.hireDate.split('T')[0]);
    }
}

export function showEditMyProfileError(message) {
    const el = document.getElementById('emp-form-error');
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
    document.getElementById('emp-form-success')?.classList.add('hidden');
}

export function hideEditMyProfileMessages() {
    document.getElementById('emp-form-error')?.classList.add('hidden');
    document.getElementById('emp-form-success')?.classList.add('hidden');
}

// ─── Load & submit ───────────────────────────────────────────────────────────

/**
 * Load the current user's profile and render the edit form into containerEl.
 * @param {string} userId
 * @param {string} accessToken
 * @param {HTMLElement} containerEl
 * @returns {Object} profile data
 */
export async function loadAndRenderEditMyProfileForm(userId, accessToken, containerEl) {
    containerEl.innerHTML = renderEditMyProfileFormHtml();
    const profile = await getCurrentProfile(userId, accessToken);
    populateEditMyProfileForm(profile);
    return profile;
}

/**
 * Collect form values and submit to the API.
 * @param {string} userId
 * @param {string} accessToken
 * @returns {Promise}
 */
export async function submitEditMyProfileForm(userId, accessToken) {
    const get = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const fullName = get('emp-full-name');
    const email    = get('emp-email');
    const userSlug = get('emp-user-slug');

    if (!fullName || !email || !userSlug) {
        showEditMyProfileError('Họ và tên, Email và Tên đăng nhập là bắt buộc.');
        throw new Error('Validation failed');
    }

    hideEditMyProfileMessages();

    const requestBody = {
        userSlug,
        fullName,
        email,
        department:  get('emp-department')   || null,
        position:    get('emp-position')     || null,
        phoneNumber: get('emp-phone-number') || null,
        address:     get('emp-address')      || null,
        isActive: true,
    };

    const hireDate = get('emp-hire-date');
    if (hireDate) requestBody.hireDate = hireDate;

    return updateCurrentProfile(userId, requestBody, accessToken);
}
