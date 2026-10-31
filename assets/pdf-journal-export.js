export function projectForPdfSource(project, sourceId) {
  const source = project.assets.find(asset => asset.id === sourceId && asset.kind === 'source' && (asset.type === 'application/pdf' || /\.pdf$/i.test(asset.name)));
  if (!source) throw new Error('원본 PDF를 찾지 못했습니다.');
  const records = project.records.filter(record => record.sourceId === sourceId).sort((a, b) => a.date.localeCompare(b.date));
  if (!records.length) throw new Error('먼저 이 PDF의 문서 읽기를 완료해 주세요.');
  return { ...project, records: records.map(record => ({ ...record, details: record.activityGroup ? `활동 단체: ${record.activityGroup}${record.details ? `\n${record.details}` : ''}` : record.details })) };
}
