package com.smart_lend_platform.loanmanagementservice.enums;

/**
 * Quyết định vay từ prediction (hoặc nhân viên).
 */
public enum LoanDecision {
    PENDING,   // Chờ kết quả dự đoán
    APPROVED,  // Duyệt cho vay
    REJECTED   // Từ chối
}
