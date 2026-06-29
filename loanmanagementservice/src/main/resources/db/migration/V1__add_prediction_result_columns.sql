-- Sprint 1: lưu kết quả ML trên loan_applications (Task 1.1)
-- Chạy một lần trên DB production. Dev dùng spring.jpa.hibernate.ddl-auto=update.

ALTER TABLE loan_applications
    ADD COLUMN prediction_confidence DOUBLE NULL,
    ADD COLUMN prediction_label BOOLEAN NULL;
