// The picker receives the existing journal's action list; no separate activity catalogue.
export const COMMON_ACTIVITY_CONTEXT = new Set(['도로변', '마을', '대상자', '취약계층', '어르신', '우리동네', '김치', '불고기', '김장김치', '장조림']);

export function makeActivitySentence({ place = '', camp = '', counterpart = '', activityGroup = '', actionResult = '', actionSelections = [] }) {
  const location = place.trim() || camp;
  return `${location}에서 ${counterpart.trim() ? `${counterpart.trim()}와 ` : ''}${activityGroup ? `${activityGroup}과 함께 ` : ''}${actionSelections.join('·')} 활동을 진행함${actionResult.trim() ? `. ${actionResult.trim()}` : '.'}`;
}

function activityMetadata(label) {
  const types = label === '홍보·모집' ? ['홍보·모집'] : label === '수요처 발굴' ? ['수요처 발굴'] : ['상담', '말벗', '안부 묻기'].includes(label) ? ['거점상담'] : ['월례회의', '거점회의', '회의·협의'].includes(label) ? ['회의·교육'] : ['실적관리', '1365입력', '봉사자관리'].includes(label) ? ['실적관리'] : label === '출장' ? ['출장'] : ['기타'];
  const category = label === '홍보·모집' ? '홍보' : ['상담', '말벗', '안부 묻기'].includes(label) ? '상담' : label === '수요처 발굴' ? '발굴' : types.includes('회의·교육') ? '교육' : types.includes('실적관리') ? '관리' : '기타';
  return { types, category };
}

export function monthDates(month) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month || '')) return [];
  const [year, number] = month.split('-').map(Number);
  return Array.from({ length: new Date(Date.UTC(year, number, 0)).getUTCDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

export function hasExistingWork(record) {
  if (!record) return false;
  return Boolean(record.sourceId || record.reviewed || record.declarationsTouched || record.nameConfirmationTouched || record.totalMinutes != null ||
    ['details', 'place', 'start', 'end', 'start2', 'end2', 'notes', 'activityGroup', 'counterpart', 'actionResult'].some(key => String(record[key] || '').trim()) ||
    record.types?.length || record.trips?.length || record.additionalActivityTimes?.length || record.actionSelections?.length ||
    Object.values(record.counts || {}).some(value => value !== '' && value != null));
}

export function makeDraftPlan(dates, selected, options = {}) {
  const actions = selected.filter(label => !COMMON_ACTIVITY_CONTEXT.has(label));
  const context = selected.filter(label => COMMON_ACTIVITY_CONTEXT.has(label));
  if (!actions.length) throw new Error('기존 활동 목록에서 실제로 진행한 활동을 하나 이상 선택해 주세요.');
  return [...new Set(dates)].sort().map((date, index) => {
    const activity = actions[index % actions.length], actionSelections = [activity, ...context];
    return { date, activityId: activity, label: activity, ...activityMetadata(activity), actionSelections,
      text: makeActivitySentence({ ...options, actionSelections }) };
  });
}

function validRange(start, end) {
  const parse = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
  return !start && !end || Number.isFinite(parse(start)) && Number.isFinite(parse(end)) && parse(end) > parse(start);
}

export function validateCommonTrip(options) {
  const trip = options.trip;
  if (!trip?.enabled) return;
  if (!trip.start || !trip.end || !validRange(trip.start, trip.end)) throw new Error('출장 시작시간과 종료시간을 올바르게 입력해 주세요.');
  if (!trip.place?.trim() || !trip.purpose?.trim()) throw new Error('출장지와 출장목적을 입력해 주세요.');
  if (options.start && options.end && (trip.start < options.start || trip.end > options.end)) throw new Error('출장시간은 공통 활동시간 안에 입력해 주세요.');
}

export function buildBulkDrafts(project, plan, options, createRecord, calculateMinutes, batchId) {
  if (!project.month || !project.name?.trim() || !project.camp?.trim()) throw new Error('활동월·활동가 이름·거점을 먼저 선택해 주세요.');
  if (!validRange(options.start, options.end)) throw new Error('공통 활동시간의 시작과 종료를 올바르게 입력해 주세요.');
  validateCommonTrip(options);
  const validDates = new Set(monthDates(project.month));
  const seen = new Set(), history = [], skipped = [];
  const records = [...project.records];
  for (const item of plan) {
    if (!validDates.has(item.date) || seen.has(item.date)) throw new Error('선택한 활동월의 날짜를 확인해 주세요.');
    seen.add(item.date);
    const index = records.findIndex(record => record.date === item.date), before = index < 0 ? null : records[index];
    if (hasExistingWork(before)) { skipped.push(item.date); continue; }
    if (!item.text.trim()) throw new Error(`${item.date} 활동내용을 입력해 주세요.`);
    const record = { ...createRecord(item.date, project.name, project.camp), place: options.place.trim(), start: options.start, end: options.end,
      types: [...item.types], detailCategory: item.category, details: item.text.trim(), typeOther: item.types.includes('기타') ? item.label : '', actionSelections: [...item.actionSelections], counterpart: options.counterpart || '', activityGroup: options.activityGroup || '', actionResult: options.actionResult || '',
      reviewed: false, bulkDraftBatchId: batchId, warnings: ['여러 날짜 일지 초안입니다. 해당 날짜에 실제로 진행한 활동인지 확인하고, 활동시간·장소·실적을 확인해 주세요.'] };
    if (options.trip?.enabled) {
      record.types = [...new Set([...record.types, '출장'])];
      record.trips = [{ id: `${batchId}-${item.date}-trip`, start: options.trip.start, end: options.trip.end, place: options.trip.place.trim(), purpose: options.trip.purpose.trim() }];
    }
    record.totalMinutes = options.start ? calculateMinutes(record) : null;
    if (index < 0) records.push(record); else records[index] = record;
    history.push({ date: item.date, before: before ? JSON.parse(JSON.stringify(before)) : null, after: JSON.parse(JSON.stringify(record)) });
  }
  return { project: { ...project, records: records.sort((a, b) => a.date.localeCompare(b.date)) }, history, skipped, created: history.length };
}

export function undoBulkDrafts(project, history) {
  let restored = 0, kept = 0;
  const records = [...project.records];
  for (const item of history) {
    const index = records.findIndex(record => record.date === item.date);
    if (index < 0 || JSON.stringify(records[index]) !== JSON.stringify(item.after)) { kept++; continue; }
    if (item.before) records[index] = item.before; else records.splice(index, 1);
    restored++;
  }
  return { project: { ...project, records }, restored, kept };
}

export function BulkJournalDraftButton({ React, project, onApply, onUndo, activityOptions, initialRecord, disabled }) {
  const h = React.createElement;
  const [open, setOpen] = React.useState(false), [dates, setDates] = React.useState([]), [activities, setActivities] = React.useState([]);
  const [counterpart, setCounterpart] = React.useState(''), [activityGroup, setActivityGroup] = React.useState(''), [actionResult, setActionResult] = React.useState(''), [place, setPlace] = React.useState(''), [start, setStart] = React.useState(''), [end, setEnd] = React.useState('');
  const [plan, setPlan] = React.useState(null), [message, setMessage] = React.useState(''), [history, setHistory] = React.useState([]);
  const [tripEnabled, setTripEnabled] = React.useState(false), [tripStart, setTripStart] = React.useState(''), [tripEnd, setTripEnd] = React.useState(''), [tripPlace, setTripPlace] = React.useState(''), [tripPurpose, setTripPurpose] = React.useState('');
  const dialog = React.useRef(null);
  const openBuilder = () => { setMessage(''); setPlan(null); setTripEnabled(false); setActivities(initialRecord?.actionSelections || []); setPlace(initialRecord?.place || ''); setCounterpart(initialRecord?.counterpart || ''); setActivityGroup(initialRecord?.activityGroup || ''); setActionResult(initialRecord?.actionResult || ''); setOpen(true); };
  React.useEffect(() => { const handler = () => openBuilder(); window.addEventListener('volunteer-journal:bulk-open', handler); return () => window.removeEventListener('volunteer-journal:bulk-open', handler); }, [initialRecord, project.month, project.name, project.camp]);
  const allDates = monthDates(project.month), identity = `${project.month}|${project.name}|${project.camp}`;
  React.useEffect(() => { setDates([]); setPlan(null); setHistory([]); setMessage(''); }, [identity]);
  React.useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);
  const occupied = date => hasExistingWork(project.records.find(record => record.date === date));
  const resetPlan = action => { action(); setPlan(null); setMessage(''); };
  const eligible = allDates.filter(date => !occupied(date));
  const toggle = date => resetPlan(() => setDates(old => old.includes(date) ? old.filter(item => item !== date) : [...old, date].sort()));
  const sentenceOptions = { place, camp: project.camp, counterpart, activityGroup, actionResult };
  const trip = { enabled: tripEnabled, start: tripStart, end: tripEnd, place: tripPlace, purpose: tripPurpose };
  const makePlan = () => { try { if (!dates.length) throw new Error('실제로 활동한 날짜를 선택해 주세요.'); validateCommonTrip({ start, end, trip }); setPlan(makeDraftPlan(dates, activities, sentenceOptions)); setMessage(''); } catch (error) { setMessage(error.message); } };
  const apply = () => { try {
    const result = onApply(plan, { place, start, end, counterpart, activityGroup, actionResult, trip });
    setHistory(result.history); setPlan(null); setDates([]); setOpen(false);
    setMessage(`${result.created}일의 초안을 넣었습니다.${result.skipped.length ? ` 기존 기록이 있는 ${result.skipped.length}일은 보존했습니다.` : ''} 내용을 확인한 뒤 작업 저장을 눌러 주세요.`);
  } catch (error) { setMessage(error.message); } };
  const restore = () => { const result = onUndo(history); setHistory([]); setMessage(`${result.restored}일의 초안을 되돌렸습니다.${result.kept ? ` 이후 수정한 ${result.kept}일은 보존했습니다.` : ''}`); };
  const field = (label, type, value, setter) => h('label', { className: 'bulk-field' }, h('span', null, label), h('input', { type, value, onChange: event => resetPlan(() => setter(event.target.value)) }));
  return h('div', { className: 'bulk-journal-launch' },
    h('button', { type: 'button', className: 'bulk-launch-button', disabled: disabled || !project.month || !project.name?.trim() || !project.camp?.trim(), onClick: openBuilder }, '여러 날짜 일지 만들기'),
    history.length > 0 && h('button', { type: 'button', className: 'bulk-undo-button', onClick: restore }, '방금 만든 초안 되돌리기'),
    message && !open && h('p', { role: 'status', className: 'bulk-result' }, message),
    open && h('dialog', { ref: dialog, className: 'bulk-journal-dialog', 'aria-labelledby': 'bulk-journal-title', onCancel: () => setOpen(false), onClose: () => setOpen(false) },
      h('div', { className: 'bulk-dialog-head' }, h('div', null, h('h2', { id: 'bulk-journal-title' }, '여러 날짜 일지 만들기'), h('p', null, `${project.month} · ${project.name} · ${project.camp}`)), h('button', { type: 'button', 'aria-label': '일괄 일지 닫기', onClick: () => setOpen(false) }, '×')),
      h('p', { className: 'bulk-intro' }, '기존 문장 만들기의 활동 목록을 그대로 사용합니다. 실제 활동 날짜와 활동을 선택하면 날짜별로 나눠 문장을 넣습니다. 이미 작성했거나 원본을 올린 날짜는 보존합니다.'),
      !plan ? h(React.Fragment, null,
        h('h3', null, '1. 활동한 날짜 선택'),
        h('div', { className: 'bulk-date-tools' }, h('button', { type: 'button', onClick: () => resetPlan(() => setDates(eligible.filter(date => ![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())))) }, '빈 평일 선택'), h('button', { type: 'button', onClick: () => resetPlan(() => setDates(eligible)) }, '빈 날짜 전체 선택'), h('button', { type: 'button', onClick: () => resetPlan(() => setDates([])) }, '선택 해제'), h('span', null, `${dates.length}일 선택`)),
        h('div', { className: 'bulk-calendar', 'aria-label': '일괄 작성 날짜 선택' },
          ...['일', '월', '화', '수', '목', '금', '토'].map(day => h('span', { key: `weekday-${day}`, className: 'bulk-weekday' }, day)),
          ...Array.from({ length: new Date(`${project.month}-01T12:00:00Z`).getUTCDay() }, (_, index) => h('span', { key: `empty-${index}` })),
          ...allDates.map(date => h('button', { type: 'button', key: date, disabled: occupied(date), 'aria-label': `${Number(date.slice(-2))}일${occupied(date) ? ' 기존 기록 보존' : ''}`, 'aria-pressed': dates.includes(date), onClick: () => toggle(date) }, Number(date.slice(-2)), occupied(date) && h('small', null, '작성됨')))),
        h('h3', null, '2. 기존 목록에서 활동 선택'),
        h('p', { className: 'bulk-help' }, '활동은 날짜별로 나누고, 마을·어르신 등 대상과 물품은 선택한 활동에 공통으로 붙입니다.'),
        h('div', { className: 'bulk-activities' }, ...activityOptions.map(label => h('label', { key: label }, h('input', { type: 'checkbox', checked: activities.includes(label), onChange: event => resetPlan(() => setActivities(old => event.target.checked ? [...old, label] : old.filter(item => item !== label))) }), label))),
        h('h3', null, '3. 공통 정보 (선택)'), h('div', { className: 'bulk-common' }, field('활동장소', 'text', place, setPlace), field('함께한 사람', 'text', counterpart, setCounterpart), field('활동 단체', 'text', activityGroup, setActivityGroup), field('결과·추가 내용', 'text', actionResult, setActionResult), field('공통 시작시간', 'time', start, setStart), field('공통 종료시간', 'time', end, setEnd)),
        h('p', { className: 'bulk-help' }, '시간을 비우면 각 날짜에서 입력할 수 있습니다. 인원·실적·사진은 임의로 채우지 않으며, 초안은 확인 완료로 처리하지 않습니다.'),
        h('h3', null, '4. 공통 출장내역 (선택)'),
        h('label', { className: 'bulk-trip-toggle' }, h('input', { type: 'checkbox', checked: tripEnabled, onChange: event => resetPlan(() => setTripEnabled(event.target.checked)) }), '선택한 날짜에 출장내역 함께 넣기'),
        tripEnabled && h('div', { className: 'bulk-common bulk-trip-fields' }, field('출장 시작시간', 'time', tripStart, setTripStart), field('출장 종료시간', 'time', tripEnd, setTripEnd), field('출장지 / 수요처', 'text', tripPlace, setTripPlace), field('출장목적', 'text', tripPurpose, setTripPurpose)),
        tripEnabled && h('p', { className: 'bulk-help' }, '입력한 출장내역을 선택한 각 날짜에 넣고 활동유형의 출장을 함께 선택합니다. 출장시간은 총 활동시간에 중복해서 더하지 않습니다.'),
        h('div', { className: 'bulk-dialog-actions' }, h('button', { type: 'button', className: 'bulk-primary', onClick: makePlan }, '날짜별 초안 미리보기'))
      ) : h(React.Fragment, null,
        h('h3', null, `${plan.length}일 초안 미리보기`), h('p', { className: 'bulk-help' }, '날짜별 활동과 문장을 확인하고 필요한 부분을 고친 뒤 적용하세요.'),
        h('div', { className: 'bulk-plan-list' }, ...plan.map((item, index) => h('article', { key: item.date, className: 'bulk-plan-row' },
          h('div', { className: 'bulk-plan-heading' }, h('strong', null, item.date), h('label', null, h('span', { className: 'bulk-sr-only' }, `${item.date} 활동 선택`), h('select', { value: item.activityId, onChange: event => { const id = event.target.value; const next = makeDraftPlan([item.date], [id, ...activities.filter(label => COMMON_ACTIVITY_CONTEXT.has(label))], sentenceOptions)[0]; setPlan(old => old.map((row, number) => number === index ? next : row)); } },
            ...activityOptions.filter(label => activities.includes(label) && !COMMON_ACTIVITY_CONTEXT.has(label)).map(label => h('option', { key: label, value: label }, label))))),
          h('textarea', { 'aria-label': `${item.date} 활동내용 초안`, value: item.text, onChange: event => setPlan(old => old.map((row, number) => number === index ? { ...row, text: event.target.value } : row)) }),
          h('small', null, [place || '장소 미입력', start && end ? `${start} ~ ${end}` : '시간 미입력'].join(' · '))))),
        tripEnabled && h('p', { className: 'bulk-trip-summary' }, `선택한 ${plan.length}일 공통 출장: ${tripStart} ~ ${tripEnd} · ${tripPlace} · ${tripPurpose}`),
        h('div', { className: 'bulk-dialog-actions' }, h('button', { type: 'button', onClick: () => setPlan(null) }, '선택 수정'), h('button', { type: 'button', className: 'bulk-primary', onClick: apply }, `${plan.length}일 초안 넣기`))
      ), message && h('p', { role: 'alert', className: 'bulk-error' }, message)));
}
