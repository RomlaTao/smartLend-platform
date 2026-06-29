/**
 * Nhãn tiếng Việt cho các đặc trưng (feature) trong giải thích SHAP / LIME.
 * Khớp với feature_names trong ml-model/model/preprocessing_meta.json
 */

export const ML_FEATURE_LABELS = {
  person_age: 'Tuổi',
  person_income: 'Thu nhập hàng năm',
  person_emp_length: 'Thâm niên công việc',
  loan_amnt: 'Số tiền vay',
  loan_int_rate: 'Lãi suất vay',
  loan_percent_income: 'Tỷ lệ vay / thu nhập',
  cb_person_cred_hist_length: 'Thâm niên tín dụng',
  person_home_ownership_MORTGAGE: 'Sở hữu nhà: Đang thế chấp',
  person_home_ownership_OTHER: 'Sở hữu nhà: Khác',
  person_home_ownership_OWN: 'Sở hữu nhà: Sở hữu',
  person_home_ownership_RENT: 'Sở hữu nhà: Thuê',
  loan_intent_DEBTCONSOLIDATION: 'Mục đích vay: Trả nợ',
  loan_intent_EDUCATION: 'Mục đích vay: Giáo dục',
  loan_intent_HOMEIMPROVEMENT: 'Mục đích vay: Sửa nhà',
  loan_intent_MEDICAL: 'Mục đích vay: Y tế',
  loan_intent_OTHER: 'Mục đích vay: Khác',
  loan_intent_PERSONAL: 'Mục đích vay: Cá nhân',
  loan_intent_VENTURE: 'Mục đích vay: Kinh doanh',
  loan_grade_encoded: 'Hạng tín dụng (mã hóa)',
  loan_to_income_ratio: 'Tỷ lệ số tiền vay / thu nhập',
  high_loan_pct_flag: 'Cờ vay cao so với thu nhập',
  woe_ownership: 'WOE hình thức sở hữu nhà',
  woe_grade: 'WOE hạng tín dụng',
  historical_default_flag: 'Cờ tiền sử vỡ nợ',
  age_income_interaction: 'Tương tác tuổi × thu nhập',
  percent_income_loan: 'Phần trăm thu nhập dùng trả vay',
  annual_interest_cost: 'Chi phí lãi hàng năm',
  interest_to_income: 'Tỷ lệ lãi / thu nhập',
  employment_age_ratio: 'Tỷ lệ thâm niên / tuổi',
  high_grade_flag: 'Cờ hạng tín dụng thấp',
  high_interest_flag: 'Cờ lãi suất cao',
  grade_x_int_rate: 'Hạng tín dụng × lãi suất',
  residual_income: 'Thu nhập còn lại sau lãi',
  residual_income_ratio: 'Tỷ lệ thu nhập còn lại',
  credit_coverage_ratio: 'Tỷ lệ thâm niên tín dụng / tuổi',
  compound_risk_score: 'Điểm rủi ro tổng hợp',
};

const _sortedFeatureKeys = Object.keys(ML_FEATURE_LABELS).sort((a, b) => b.length - a.length);

/**
 * @param {string|null|undefined} featureKey
 * @returns {string}
 */
export function formatFeatureLabel(featureKey) {
  if (featureKey == null || featureKey === '') return '';
  const key = String(featureKey).trim();
  return ML_FEATURE_LABELS[key]
    || ML_FEATURE_LABELS[key.toLowerCase()]
    || key.replace(/_/g, ' ');
}

/**
 * Dịch quy tắc LIME (vd. "0.5 < person_age <= 35.5") sang tiếng Việt.
 * @param {string|null|undefined} rule
 * @returns {string}
 */
export function translateLimeRule(rule) {
  if (rule == null || rule === '') return '';

  let text = String(rule).trim();

  for (const key of _sortedFeatureKeys) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    text = text.replace(re, ML_FEATURE_LABELS[key]);
  }

  // Các token snake_case còn sót (feature mới chưa có trong map)
  text = text.replace(/\b([a-z][a-z0-9_]*)\b/gi, (match) => formatFeatureLabel(match));

  return text;
}
