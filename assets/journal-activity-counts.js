// The form has count boxes for these six activity types. A detail category describes the work.
export const promotionCountLabels = ['홍보·모집 인원', '홍보·모집 건수', '신규 봉사자 등록인원'];

/** @type {Record<string, string[]>} */
export const requiredCountsByType = {
  '거점상담': ['상담 인원'],
  '홍보·모집': [], // Any one of the three promotion boxes is sufficient.
  '수요처 발굴': ['수요처 발굴·확인'],
  '연계·배치': ['봉사자 연계·배치 인원', '봉사자 연계·배치 건수'],
  '실적관리': ['실적 입력·정리'],
  '프로그램 운영': ['프로그램 운영 횟수', '프로그램 운영 인원'],
};

/** @type {Record<string, string>} */
export const countUnits = {
  '상담 인원': '명', '신규 봉사자 등록인원': '명', '홍보·모집 인원': '명', '홍보·모집 건수': '건',
  '봉사자 연계·배치 인원': '명', '봉사자 연계·배치 건수': '건', '실적 입력·정리': '건',
  '프로그램 운영 횟수': '회', '프로그램 운영 인원': '명',
};

export function activityCountFieldsForType(type) {
  return type === '홍보·모집' ? promotionCountLabels : requiredCountsByType[type] || [];
}

export function requiredCountLabels(types) {
  return [...new Set(types.flatMap(type => requiredCountsByType[type] || []))];
}

export function canEnterActivityCount(types, field) {
  return field === '기타' || types.some(type => activityCountFieldsForType(type).includes(field));
}

function countValue(record, field) {
  return String(record.counts?.[field] ?? '').trim();
}

const isInteger = value => /^\d+$/.test(value);

export function validateActivityCounts(record) {
  const notices = [];
  const types = record.types || [];
  for (const field of requiredCountLabels(types)) {
    const value = countValue(record, field);
    if (!value) notices.push(`${field} 칸에 ${countUnits[field] ? '수량(' + countUnits[field] + ')' : '실적'}을 입력해 주세요.`);
    else if (countUnits[field] && !isInteger(value)) notices.push(`${field} 칸에는 0 이상의 정수를 입력해 주세요.`);
  }
  if (types.includes('홍보·모집')) {
    const filled = promotionCountLabels.filter(field => countValue(record, field));
    if (!filled.length) notices.push('홍보·모집 인원·건수 또는 신규 봉사자 등록인원 중 하나에 숫자를 입력해 주세요.');
    for (const field of filled) {
      if (!isInteger(countValue(record, field))) notices.push(`${field} 칸에는 0 이상의 정수를 입력해 주세요.`);
    }
  }
  return notices;
}

// Preserve imported figures. An existing number without its type still needs the user's review.
export function activityCountTypeNotices(record) {
  const notices = [];
  for (const type of Object.keys(requiredCountsByType)) {
    if (record.types?.includes(type)) continue;
    for (const field of activityCountFieldsForType(type)) {
      if (isInteger(countValue(record, field))) notices.push(`${field} 칸에 숫자가 입력되어 있습니다. 2번 활동유형에서 ‘${type}’ 항목을 체크해 주세요.`);
    }
  }
  return notices;
}

export function needsConsultationDetailCategory(record) {
  return isInteger(countValue(record, '상담 인원')) &&
    !String(record.detailCategory || '').split(/[,/]/).some(label => label.trim() === '상담');
}

export function changeActivityType(record, type, checked) {
  const types = record.types.filter(value => value !== type);
  if (checked) return {types: [...types, type], counts: record.counts};
  const counts = {...record.counts};
  for (const field of activityCountFieldsForType(type)) {
    if (!canEnterActivityCount(types, field)) delete counts[field];
  }
  return {types, counts};
}
