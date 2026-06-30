// my-profile-renderer.js
// Shared rendering utilities for the My Profile / View User Profile view (modal & standalone page)

import { getCurrentProfile, getProfileById } from '/src/services/identity.service.js';
import {
    EMPTY_LABEL,
    formatDateTimeVi,
    formatDateVi,
    orEmpty,
} from '/src/utils/formatter.js';

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDate(dateString) {
    return formatDateTimeVi(dateString);
}

function formatDateOnly(dateString) {
    return formatDateVi(dateString);
}

function infoRow(label, value) {
    return `
        <div>
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">${label}</p>
            <p class="text-sm text-gray-900 font-medium">${value ?? EMPTY_LABEL}</p>
        </div>`;
}

// ─── HTML builder ────────────────────────────────────────────────────────────

export function renderProfileHtml(profile) {
    const statusBadge = profile.isActive
        ? '<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800">Đang hoạt động</span>'
        : '<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800">Vô hiệu hóa</span>';

    return `
        <div class="space-y-5">

            <!-- Basic Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">person</span>
                    Thông tin cơ bản
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Mã người dùng', `<span class="font-mono text-xs">${orEmpty(profile.userId)}</span>`)}
                    ${infoRow('Tên đăng nhập', orEmpty(profile.userSlug))}
                    ${infoRow('Họ và tên', `<span class="font-semibold text-gray-900">${orEmpty(profile.fullName)}</span>`)}
                    ${infoRow('Email', orEmpty(profile.email))}
                </div>
            </div>

            <!-- Work Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">work</span>
                    Thông tin công việc
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Phòng ban', orEmpty(profile.department))}
                    ${infoRow('Chức vụ', orEmpty(profile.position))}
                    ${infoRow('Ngày vào làm', formatDateOnly(profile.hireDate))}
                    <div>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Trạng thái</p>
                        ${statusBadge}
                    </div>
                </div>
            </div>

            <!-- Contact Info -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">contact_phone</span>
                    Thông tin liên hệ
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Số điện thoại', orEmpty(profile.phoneNumber))}
                    <div class="col-span-2">${infoRow('Địa chỉ', orEmpty(profile.address))}</div>
                </div>
            </div>

            <!-- Metadata -->
            <div class="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-base">schedule</span>
                    Thông tin hệ thống
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${infoRow('Ngày tạo', formatDate(profile.createdAt))}
                    ${infoRow('Cập nhật lúc', formatDate(profile.updatedAt))}
                </div>
            </div>

        </div>
    `;
}

// ─── Load orchestrators ──────────────────────────────────────────────────────

/** Fetch the current (logged-in) user's profile and render into containerEl. */
export async function loadAndRenderMyProfile(userId, accessToken, containerEl) {
    const profile = await getCurrentProfile(userId, accessToken);
    containerEl.innerHTML = renderProfileHtml(profile);
    return profile;
}

/** Fetch any user profile by ID (admin use) and render into containerEl. */
export async function loadAndRenderProfileById(userId, accessToken, containerEl) {
    const profile = await getProfileById(userId, accessToken);
    containerEl.innerHTML = renderProfileHtml(profile);
    return profile;
}
