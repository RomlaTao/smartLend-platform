package com.smart_lend_platform.loanmanagementservice.enums;

/**
 * Trạng thái đơn xin vay.
 */
public enum LoanApplicationStatus {
    DRAFT,          // Nháp
    SUBMITTED,      // Đã gửi
    UNDER_REVIEW,   // Đang xét duyệt (đã gửi predict, chờ kết quả)
    APPROVED,       // Đã duyệt
    REJECTED,       // Từ chối
    DISBURSED,      // Đã giải ngân
    CANCELLED       // Đã hủy
}
