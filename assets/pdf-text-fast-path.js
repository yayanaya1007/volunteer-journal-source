// Keep short, complete digital journals out of the much slower image OCR path.
// Missing/garbled fields and scans still use the existing OCR pipeline.
export function pdfTextNeedsOcr(text, date, record) {
  if (!date || !text || /[\uFFFD\u0000]/.test(text)) return true;
  const compact = text.replace(/\s/g, '');
  if (compact.length >= 500) return false; // Existing text-only behavior.
  if (!record?.start || !record?.end || record.totalMinutes == null || !record.details?.trim()) return true;
  if (!/(?:활동가성명|활동가이름|성명)/.test(compact) || !/(?:거점캠프명|거점명)/.test(compact)) return true;
  if (!['활동유형', '세부활동내용', '활동실적', '출장내역', '특이사항'].every(heading => compact.includes(heading))) return true;
  // Some hybrid PDFs have text labels but raster check marks: retain OCR there.
  const types = compact.match(/활동유형([\s\S]*?)(?:세부활동내용|활동실적)/)?.[1] || '';
  if (!/[☑☒✓✔√■▣]/.test(types)) return true;
  return false;
}

export function pdfPageConcurrency(pageCount, environment = globalThis) {
  const device = environment.navigator || {};
  return pageCount >= 4 && device.hardwareConcurrency >= 4 && device.deviceMemory >= 4 && environment.matchMedia?.('(pointer:fine)').matches ? 2 : 1;
}

export async function readPdfPages(pageCount, concurrency, readPage, progress) {
  const pages = new Array(pageCount);
  let next = 1, completed = 0, failed = false;
  const results = await Promise.allSettled(Array.from({ length: Math.min(pageCount, Math.max(1, concurrency)) }, async (_, lane) => {
    while (!failed && next <= pageCount) {
      const number = next++;
      try {
        pages[number - 1] = await readPage(number, lane);
        progress(++completed, pageCount);
      } catch (error) { failed = true; throw error; }
    }
  }));
  // Wait for every in-flight page before the caller releases OCR workers.
  const error = results.find(result => result.status === 'rejected');
  if (error) throw error.reason;
  return pages;
}

export function resolvePdfImageObject(page, id, timeoutMs = 8000) {
  // PDF.js stores g_ objects in commonObjs, shared across pages.
  const objects = id.startsWith('g_') ? page.commonObjs : page.objs;
  if (!objects) return Promise.reject(new Error('PDF 그림 저장소를 찾지 못했습니다.'));
  if (objects.has(id)) return Promise.resolve(objects.get(id));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PDF 사진·서명 일부를 추출하지 못했습니다. 원본을 확인해 주세요.')), timeoutMs);
    try { objects.get(id, data => { clearTimeout(timer); data ? resolve(data) : reject(new Error('PDF 그림이 비어 있습니다.')); }); }
    catch (error) { clearTimeout(timer); reject(error); }
  });
}
