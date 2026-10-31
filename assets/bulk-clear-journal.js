const identity = project => JSON.stringify([project.month, project.name, project.camp]);

export function clearJournalDates(project, dates) {
  const selected = new Set(dates.filter(date => date.startsWith(`${project.month}-`) && project.records.some(record => record.date === date)));
  const records = project.records.filter(record => selected.has(record.date));
  const photos = project.assets.filter(asset => asset.kind === 'photo' && selected.has(asset.date));
  return {
    project: { ...project, records: project.records.filter(record => !selected.has(record.date)), assets: project.assets.filter(asset => !photos.includes(asset)) },
    history: { identity: identity(project), records, photos },
    cleared: selected.size,
  };
}

export function restoreClearedJournalDates(project, history) {
  if (identity(project) !== history.identity) throw new Error('일지를 비웠던 활동월과 활동가에서만 되돌릴 수 있습니다.');
  // A newly imported or written date must never be overwritten by undo.
  const dates = new Set(history.records.map(record => record.date).filter(date => !project.records.some(record => record.date === date) && !project.assets.some(asset => asset.kind === 'photo' && asset.date === date)));
  return {
    project: { ...project, records: [...project.records, ...history.records.filter(record => dates.has(record.date))].sort((a, b) => a.date.localeCompare(b.date)), assets: [...project.assets, ...history.photos.filter(photo => dates.has(photo.date) && !project.assets.some(asset => asset.id === photo.id))] },
    restored: dates.size,
    kept: new Set(history.records.map(record => record.date)).size - dates.size,
  };
}

export function CalendarClearTools({ React, mode, dates, onStart, onCancel, onAll, onConfirm, disabled }) {
  const h = React.createElement;
  return h('div', { className: 'calendar-clear-tools' },
    h('p', { className: 'calendar-clear-hint' }, '날짜를 누르면 그날 일지가 열립니다. 비울 날짜는 체크칸으로 선택하세요.'),
    h('button', { type: 'button', disabled, 'aria-pressed': mode, onClick: mode ? onCancel : onStart }, mode ? '선택 취소' : '여러 날짜 선택'),
    h(React.Fragment, null,
      h('button', { type: 'button', disabled, onClick: onAll }, '작성된 날짜 모두 선택'),
      dates.length > 0 && !mode && h('button', { type: 'button', disabled, onClick: onCancel }, '선택 모두 해제'),
      h('span', { role: 'status' }, `${dates.length}일 선택`),
      h('button', { type: 'button', className: 'calendar-clear-confirm', disabled: disabled || !dates.length, onClick: onConfirm }, `선택한 ${dates.length}일 비우기`)));
}

export function BulkClearJournalButton({ React, project, disabled, onClear, onRestore, onStartSelection, selectionRequest }) {
  const h = React.createElement;
  const [open, setOpen] = React.useState(false), [dates, setDates] = React.useState([]), [confirm, setConfirm] = React.useState(false), [history, setHistory] = React.useState(null), [message, setMessage] = React.useState('');
  const dialog = React.useRef(null), projectKey = identity(project);
  React.useEffect(() => { setOpen(false); setDates([]); setHistory(null); setMessage(''); setConfirm(false); }, [projectKey]);
  React.useEffect(() => {
    if (!selectionRequest || selectionRequest.identity !== projectKey || disabled) return;
    const eligible = selectionRequest.dates.filter(date => project.records.some(record => record.date === date));
    if (!eligible.length) return;
    setDates(eligible); setConfirm(true); setMessage(''); setOpen(true);
  }, [selectionRequest]);
  React.useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);
  const available = [...new Set(project.records.map(record => record.date))].filter(date => date.startsWith(`${project.month}-`)).sort();
  const selected = dates.filter(date => available.includes(date));
  const toggle = date => { setDates(old => old.includes(date) ? old.filter(value => value !== date) : [...old, date].sort()); setConfirm(false); };
  const clear = () => {
    try {
      const result = onClear(selected);
      if (!result.cleared) throw new Error('비울 날짜를 선택해 주세요.');
      setHistory(result.history); setDates([]); setOpen(false); setConfirm(false);
      setMessage(`${result.cleared}일의 일지와 출장사진 연결을 비웠습니다. 다시 입력하거나 원본 파일을 다시 올릴 수 있습니다. 작업 저장을 눌러 주세요.`);
    } catch (error) { setMessage(error.message); }
  };
  const restore = () => {
    try { const result = onRestore(history); setHistory(null); setMessage(`${result.restored}일의 일지를 되돌렸습니다.${result.kept ? ` 새로 입력한 ${result.kept}일은 보존했습니다.` : ''} 작업 저장을 눌러 주세요.`); }
    catch (error) { setMessage(error.message); }
  };
  return h('div', { className: 'bulk-journal-launch' },
    h('button', { type: 'button', className: 'bulk-launch-button', disabled: disabled || !available.length, onClick: () => { if (onStartSelection) { onStartSelection(); return; } setDates([]); setConfirm(false); setMessage(''); setOpen(true); } }, '여러 날짜 일지 비우기'),
    history && h('button', { type: 'button', className: 'bulk-undo-button', disabled, onClick: restore }, '방금 비운 일지 되돌리기'),
    message && !open && h('p', { role: 'status', className: 'bulk-result' }, message),
    open && h('dialog', { ref: dialog, className: 'bulk-journal-dialog', 'aria-labelledby': 'bulk-clear-title', onCancel: () => setOpen(false), onClose: () => setOpen(false) },
      h('div', { className: 'bulk-dialog-head' }, h('div', null, h('h2', { id: 'bulk-clear-title' }, '선택한 날짜 일지 비우기'), h('p', null, `${project.month} · ${project.name} · ${project.camp}`)), h('button', { type: 'button', 'aria-label': '일지 비우기 닫기', onClick: () => setOpen(false) }, '×')),
      h('p', { className: 'bulk-intro' }, '잘못 넣은 날짜를 선택하면 해당 날짜의 일지 내용과 출장사진 연결을 비웁니다. 올린 원본 파일·서명 설정과 선택하지 않은 날짜는 보관합니다.'),
      !confirm ? h(React.Fragment, null,
        h('div', { className: 'bulk-date-tools' }, h('button', { type: 'button', onClick: () => setDates(available) }, '작성된 날짜 전체 선택'), h('button', { type: 'button', onClick: () => setDates([]) }, '날짜 선택 모두 해제'), h('span', { role: 'status' }, `${selected.length}일 선택`)),
        h('div', { className: 'clear-journal-dates', 'aria-label': '비울 일지 날짜 선택' }, available.map(date => h('label', { key: date }, h('input', { type: 'checkbox', checked: selected.includes(date), onChange: () => toggle(date) }), `${Number(date.slice(5, 7))}월 ${Number(date.slice(-2))}일`, project.records.find(record => record.date === date)?.sourceId ? h('small', null, '원본 있음') : h('small', null, '직접 작성')))),
        h('div', { className: 'bulk-dialog-actions' }, h('button', { type: 'button', onClick: () => setOpen(false) }, '취소'), h('button', { type: 'button', className: 'bulk-primary', disabled: disabled || !selected.length, onClick: () => setConfirm(true) }, `선택한 ${selected.length}일 비우기`))) : h(React.Fragment, null,
        h('h3', null, `${selected.length}일의 일지를 비울까요?`), h('p', { className: 'bulk-help' }, selected.join(' · ')),
        h('p', { className: 'bulk-help' }, '해당 날짜는 달력에서 자료 없음으로 바뀝니다. 비운 직후에는 ‘방금 비운 일지 되돌리기’로 복구할 수 있습니다.'),
        h('div', { className: 'bulk-dialog-actions' }, h('button', { type: 'button', onClick: () => onStartSelection ? setOpen(false) : setConfirm(false) }, onStartSelection ? '달력으로 돌아가기' : '날짜 다시 선택'), h('button', { type: 'button', className: 'bulk-primary', disabled: disabled || !selected.length, onClick: clear }, `${selected.length}일 일지 비우기`))),
      message && h('p', { role: 'alert', className: 'bulk-error' }, message)));
}
