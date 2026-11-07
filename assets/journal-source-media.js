import {unzipSync, strFromU8} from './source-layout-zip.js';
import {tripEntriesFromCells} from './journal-trip-import.js?v=20261107-shared-hour-v4';

export function matchImportedMediaRecord(records, media) {
  if (media.date) {
    const dated = records.find(record => record.date === media.date);
    if (dated) return dated;
  }
  const candidates = records.filter(record => record.sourcePage === media.page);
  return candidates.length === 1 ? candidates[0] : null;
}

const textOf = node => [...node.getElementsByTagNameNS('*', 't')].map(part => part.textContent || '').join(' ');
const textWithBreaks = node => node.nodeType === 3 || node.nodeType === 4 ? node.nodeValue : node.localName === 'lineBreak' ? '\n' : [...node.childNodes].map(textWithBreaks).join('');
const paragraphText = node => [...node.getElementsByTagNameNS('*', 't')].map(textWithBreaks).join(' ');
const cellParagraphText = cell => [...cell.getElementsByTagNameNS('*','p')].map(paragraphText).filter(Boolean).join('\n').trim();
const children = node => [...node.children];
const dateOf = (text, fallbackYear) => {
  const field = text.match(/활\s*동\s*일\s*자\s*[:：]?([\s\S]{0,100})/)?.[1];
  if (!field) return '';
  const full = field.match(/(20\d{2})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?/);
  const short = field.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  const parts = full ? [+full[1], +full[2], +full[3]] : short ? [+fallbackYear, +short[1], +short[2]] : null;
  if (!parts) return '';
  const [year, month, day] = parts, check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Read source references in document order, independent of renderer pagination.
// HWP uses a read-only in-memory HWPX representation; no source file is saved.
export function extractHwpxJournalMedia(bytes, records) {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || !records.length) return null;
  const archive = unzipSync(bytes), parser = new DOMParser();
  const names = Object.keys(archive).filter(name => /^Contents\/section\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  if (!names.length) return null;
  const manifest = new Map(), paths = new Map(Object.keys(archive).map(name => [name.toLowerCase(), name]));
  if (archive['Contents/content.hpf']) {
    const opf = parser.parseFromString(strFromU8(archive['Contents/content.hpf']), 'application/xml');
    for (const item of opf.getElementsByTagNameNS('*', 'item')) {
      const href = item.getAttribute('href') || '';
      manifest.set(item.getAttribute('id'), {path: href.replace(/^\.\//, ''), type: item.getAttribute('media-type') || ''});
    }
  }
  const pages = records.map((record, index) => ({page: record.page || index + 1, date: record.date, photos: [], mediaWarnings: []}));
  const byDate = new Map();
  records.forEach((record, index) => { if (record.date && !byDate.has(record.date)) byDate.set(record.date, index); });
  const seen = new Set();
  let currentDate = '', section = '', matched = 0, unassigned = 0;
  for (const name of names) {
    const xml = parser.parseFromString(strFromU8(archive[name]), 'application/xml');
    if (xml.getElementsByTagNameNS('*', 'parsererror').length) throw new Error('원본 사진의 문서 구조를 읽지 못했습니다.');
    const visit = node => {
      if (node.localName === 'p') {
        const ownText = children(node).filter(part => part.localName === 'run').flatMap(run => children(run).filter(part => part.localName === 't').map(part => part.textContent || '')).join(' ').replace(/\s/g, '');
        if (/^(?:5[.)])?출장내역|^(?:\d+[.)])?(?:활동사진|증빙사진)/.test(ownText)) section = 'photos';
        else if (/^(?:7[.)])?확인$/.test(ownText)) section = 'confirmation';
      }
      if (node.localName === 'tbl') {
        const text = textOf(node);
        // A wrapping table may contain many days. Its inner basic-information
        // tables establish the date; never attach all its pictures to day one.
        const labels = text.match(/활\s*동\s*일\s*자/g) || [];
        if (labels.length === 1) {
          const date = dateOf(text, records[0].date?.slice(0, 4));
          currentDate = date; section = 'basic';
          if (date) matched++;
        }
        const rows=children(node).filter(part=>part.localName==='tr');
        const cells=row=>children(row).filter(part=>part.localName==='tc');
        const header=rows[0]&&cells(rows[0]).map(cell=>textOf(cell).replace(/\s/g,''));
        if(header?.length===3&&header[0]==='시간'&&header[1]==='구분'&&header[2]==='활동내용'){
          const index=byDate.get(currentDate);
          if(index!==undefined&&rows.slice(1).every(row=>cells(row).length===3)){
            const categories=[],contents=[];
            for(const row of rows.slice(1)){
              const columns=cells(row);if(columns.length!==3)continue;
              const category=cellParagraphText(columns[1]),content=cellParagraphText(columns[2]);
              if(category)categories.push(category);if(content)contents.push(content);
            }
            pages[index].category=categories.join('\n').split(/[\n,/]+/).map(value=>value.trim()).filter(Boolean).join(', ');
            pages[index].detailText=contents.join('\n');
          }
        }
        if(header?.length===5&&header[0]==='순번'&&header[1]==='출장시간'&&header[3]==='출장목적'){
          const index=byDate.get(currentDate);
          if(index!==undefined){
            const cellText=cell=>[...cell.getElementsByTagNameNS('*','p')].map(paragraphText).filter(Boolean).join('\n').trim();
            pages[index].trips??=[];
            for(const row of rows.slice(1)){
              const columns=cells(row);if(columns.length<4)continue;
              pages[index].trips.push(...tripEntriesFromCells(cellText(columns[1]),cellText(columns[2]),cellText(columns[3])));
            }
            pages[index].trips=pages[index].trips.map((trip,number)=>({...trip,id:`source-trip-${number+1}`}));
          }
        }
      }
      if (node.localName === 'pic') {
        const image = [...node.getElementsByTagNameNS('*', 'img')].find(part => part.hasAttribute('binaryItemIDRef'));
        if (!image) return;
        let cell = node.parentElement;
        while (cell && cell.localName !== 'tc') cell = cell.parentElement;
        const cellText = cell ? textOf(cell) : '';
        const signature = /서\s*명|날\s*인/.test(cellText) || section === 'confirmation';
        if (!signature && section !== 'photos') return;
        const index = byDate.get(currentDate);
        if (index === undefined) { unassigned++; return; }
        const ref = image.getAttribute('binaryItemIDRef'), item = manifest.get(ref);
        let path = item?.path;
        path = paths.get((path || '').toLowerCase()) || paths.get(('Contents/' + path).toLowerCase()) || Object.keys(archive).find(path => new RegExp('^BinData/' + ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.', 'i').test(path));
        const kind = signature ? 'signature' : 'photo', key = `${currentDate}:${kind}:${ref}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (!path || !archive[path]?.length) { pages[index].mediaWarnings.push('원본에서 사진 파일 연결을 찾지 못했습니다.'); return; }
        const extension = path.split('.').pop().toLowerCase();
        const type = (item?.type || ({jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', bmp:'image/bmp', gif:'image/gif', webp:'image/webp'}[extension]) || '').replace('image/jpg', 'image/jpeg');
        if (!type.startsWith('image/')) { pages[index].mediaWarnings.push('원본 사진의 이미지 형식을 확인해 주세요.'); return; }
        const blob = new Blob([archive[path]], {type});
        if (signature) pages[index].signature ||= blob;
        else pages[index].photos.push(blob);
        return;
      }
      for (const child of children(node)) visit(child);
    };
    visit(xml.documentElement);
  }
  if (!matched) return null;
  if (unassigned) pages[0].mediaWarnings.push(`날짜를 확인하지 못한 원본 사진 ${unassigned}개는 임의의 날짜에 넣지 않았습니다.`);
  return {pageCount: records.length, pages};
}
