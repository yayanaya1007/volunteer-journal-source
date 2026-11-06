// A whole-month signature is used only after an explicit user action.
export function isSignaturePasteTarget(event) {
  const target = event?.target;
  return !!(target?.matches?.('textarea[data-signature-paste="true"]') &&
    target.ownerDocument?.activeElement === target);
}

export function journalSignatureForDate(assets, date) {
  const common = assets.find(asset => asset.kind === 'signature' && asset.url);
  const chosen = common?.applyToAllDates ? common : assets.find(asset => asset.kind === 'source-signature' && asset.date === date && asset.url) || common;
  return chosen?.excludedDates?.includes(date) ? undefined : chosen;
}

export function withSharedJournalSignature(project, asset) {
  return { ...project, records: project.records?.some(record => record.signatureDeleted) ? project.records.map(record => record.signatureDeleted ? {...record, signatureDeleted: false} : record) : project.records, assets: [...project.assets.filter(item => item.kind !== 'signature').map(item => {
    if (item.kind !== 'source-signature' || !item.excludedDates) return item;
    const {excludedDates, ...rest} = item; return rest;
  }), { ...asset, kind: 'signature', date: '', tripId: '', applyToAllDates: true, excludedDates: [] }] };
}

export function withoutJournalSignatureForDate(project, date) {
  return {...project, records: project.records.map(record => record.date === date ? {...record, signatureDeleted: true, reviewed: false} : record), assets: project.assets.map(asset => {
    if (asset.kind !== 'signature' && !(asset.kind === 'source-signature' && asset.date === date)) return asset;
    return {...asset, excludedDates: [...new Set([...(asset.excludedDates || []), date])]};
  })};
}

export function withoutJournalSignaturesForMonth(project) {
  const month=project.month;
  if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month||''))return project;
  const count=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
  const dates=Array.from({length:count},(_,index)=>`${month}-${String(index+1).padStart(2,'0')}`);
  return {...project,
    records:project.records.map(record=>record.date?.startsWith(month+'-')?{...record,signatureDeleted:true}:record),
    assets:project.assets.map(asset=>asset.kind==='signature'||asset.kind==='source-signature'&&asset.date?.startsWith(month+'-')?{...asset,excludedDates:[...new Set([...(asset.excludedDates||[]),...dates])]}:asset)};
}

export function SharedJournalSignatureControls({ React, assets, date, busy, onApply, onClearMonth, ImageComponent }) {
  const h = React.createElement;
  const candidates = assets.filter(asset => ['source-signature', 'signature'].includes(asset.kind) && asset.url);
  const preferred = candidates.find(asset => asset.kind === 'signature' && asset.applyToAllDates) || candidates.find(asset => asset.kind === 'source-signature' && asset.date === date) || candidates.find(asset => asset.kind === 'signature') || candidates[0];
  const [selectedId, setSelectedId] = React.useState('');
  React.useEffect(() => { setSelectedId(preferred?.id || ''); }, [date, preferred?.id]);
  if (!candidates.length) return null;
  if (candidates.some(asset => asset.excludedDates?.includes(date))) return h('p', {role: 'status', style: {margin: 0, color: '#60756b'}}, '이 날짜의 서명을 삭제했습니다. JPG·PNG 서명 적용으로 새 서명을 넣을 수 있습니다.');
  const selected = candidates.find(asset => asset.id === selectedId) || preferred;
  const common = candidates.find(asset => asset.kind === 'signature' && asset.applyToAllDates);
  const alreadyApplied = common?.id === selected.id || common?.originalSignatureId === selected.id;
  return h('div', { className: 'shared-journal-signature', style: { padding: 12, border: '1px solid #d6e1dc', borderRadius: 10, display: 'grid', gap: 10, maxWidth: '100%' } },
    h('label', { style: { display: 'grid', gap: 6 } }, h('span', null, '이달 전체에 사용할 서명'),
      h('select', { 'aria-label': '이달 전체에 사용할 서명', value: selected.id, disabled: busy, onChange: event => setSelectedId(event.target.value), style: { width: '100%', maxWidth: '100%', padding: 8, border: '1px solid #d6e1dc', borderRadius: 8 } },
        ...candidates.map(asset => h('option', { key: asset.id, value: asset.id }, asset.kind === 'source-signature' ? `${asset.date} · 원본 일지에서 추출한 서명` : asset.applyToAllDates ? '현재 이달 전체에 적용한 서명' : '따로 가져온 서명')))),
    h('div', {className:'shared-signature-preview',style:{minHeight:70,display:'flex',alignItems:'center'}}, h(ImageComponent, { src: selected.url, alt: '전체 적용할 투명 서명 미리보기', style: { display: 'block', maxWidth: 180, maxHeight: 70, objectFit: 'contain' } })),
    h('div', {className:'shared-signature-actions',style:{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}},
      h('button', { type: 'button', disabled: busy || alreadyApplied, onClick: () => onApply(selected), style: { justifySelf: 'start', padding: '9px 12px', border: '1px solid #315e4b', borderRadius: 8, background: '#eff7f3', color: '#244b3a', cursor: 'pointer' } }, alreadyApplied ? '이달 전체 적용 중' : '이 서명을 이달 전체에 적용'),
      onClearMonth && h('button', {type:'button',disabled:busy,onClick:onClearMonth,style:{padding:'9px 12px',border:'1px solid #b65b5b',borderRadius:8,background:'#fff7f5',color:'#954343',cursor:'pointer'}},'이달 서명 전체 삭제')),
    h('small', { style: { lineHeight: 1.6, color: '#60756b' } }, '직접 작성한 날, 여러 날짜로 만든 날, 앞으로 이달에 추가할 날에도 같은 서명을 넣습니다. 원본에서 추출한 서명은 보존합니다.'),
    common && h('p', { role: 'status', style: { margin: 0, fontSize: 13, color: '#315e4b' } }, '이달 전체 공통 서명이 설정되어 있습니다. 미리보기와 내려받는 문서에도 적용됩니다.'));
}
