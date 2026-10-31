// A whole-month signature is used only after an explicit user action.
export function journalSignatureForDate(assets, date) {
  const common = assets.find(asset => asset.kind === 'signature' && asset.url);
  if (common?.applyToAllDates) return common;
  return assets.find(asset => asset.kind === 'source-signature' && asset.date === date && asset.url) || common;
}

export function withSharedJournalSignature(project, asset) {
  return { ...project, assets: [...project.assets.filter(item => item.kind !== 'signature'), { ...asset, kind: 'signature', date: '', tripId: '', applyToAllDates: true }] };
}

export function SharedJournalSignatureControls({ React, assets, date, busy, onApply, ImageComponent }) {
  const h = React.createElement;
  const candidates = assets.filter(asset => ['source-signature', 'signature'].includes(asset.kind) && asset.url);
  const preferred = candidates.find(asset => asset.kind === 'signature' && asset.applyToAllDates) || candidates.find(asset => asset.kind === 'source-signature' && asset.date === date) || candidates.find(asset => asset.kind === 'signature') || candidates[0];
  const [selectedId, setSelectedId] = React.useState('');
  React.useEffect(() => { setSelectedId(preferred?.id || ''); }, [date, preferred?.id]);
  if (!candidates.length) return null;
  const selected = candidates.find(asset => asset.id === selectedId) || preferred;
  const common = candidates.find(asset => asset.kind === 'signature' && asset.applyToAllDates);
  const alreadyApplied = common?.id === selected.id || common?.originalSignatureId === selected.id;
  return h('div', { className: 'shared-journal-signature', style: { padding: 12, border: '1px solid #d6e1dc', borderRadius: 10, display: 'grid', gap: 10, maxWidth: '100%' } },
    h('label', { style: { display: 'grid', gap: 6 } }, h('span', null, '이달 전체에 사용할 서명'),
      h('select', { 'aria-label': '이달 전체에 사용할 서명', value: selected.id, disabled: busy, onChange: event => setSelectedId(event.target.value), style: { width: '100%', maxWidth: '100%', padding: 8, border: '1px solid #d6e1dc', borderRadius: 8 } },
        ...candidates.map(asset => h('option', { key: asset.id, value: asset.id }, asset.kind === 'source-signature' ? `${asset.date} · 원본 일지에서 추출한 서명` : asset.applyToAllDates ? '현재 이달 전체에 적용한 서명' : '따로 가져온 서명')))),
    h(ImageComponent, { src: selected.url, alt: '전체 적용할 투명 서명 미리보기', style: { display: 'block', maxWidth: 180, maxHeight: 70, objectFit: 'contain' } }),
    h('button', { type: 'button', disabled: busy || alreadyApplied, onClick: () => onApply(selected), style: { justifySelf: 'start', padding: '9px 12px', border: '1px solid #315e4b', borderRadius: 8, background: '#eff7f3', color: '#244b3a', cursor: 'pointer' } }, alreadyApplied ? '이달 전체 적용 중' : '이 서명을 이달 전체에 적용'),
    h('small', { style: { lineHeight: 1.6, color: '#60756b' } }, '직접 작성한 날, 여러 날짜로 만든 날, 앞으로 이달에 추가할 날에도 같은 서명을 넣습니다. 원본에서 추출한 서명은 보존합니다.'),
    common && h('p', { role: 'status', style: { margin: 0, fontSize: 13, color: '#315e4b' } }, '이달 전체 공통 서명이 설정되어 있습니다. 미리보기와 내려받는 문서에도 적용됩니다.'));
}
