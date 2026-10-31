import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
const monthInput = () => document.querySelector('input[aria-label="운영현황 보고 월"]')?.value || '';
const text = (value) => String(value ?? '').replace(/\u00a0/g, ' ').trim();
const integer = (value) => Math.max(0, Number.parseInt(String(value ?? '').replace(/,/g, ''), 10) || 0);
const centers = ['강경읍', '연무읍', '성동면', '광석면', '노성면', '상월면', '부적면', '연산면', '양촌면', '가야곡면', '은진면', '채운면', '취암동', '부창동'];

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function dataForMonth(month) {
  const rows = readJson(`volunteer-journal:operations:${month}`, []);
  const extras = readJson(`volunteer-journal:operations-details:${month}`, {});
  const programs = (Array.isArray(extras.programRows) ? extras.programRows : []).filter((row) =>
    text(row.program) || text(row.content) || text(row.participants) || text(row.date),
  );
  const links = (Array.isArray(extras.linkageRows) ? extras.linkageRows : []).filter((row) =>
    text(row.town) || text(row.recipientCategory) || text(row.recipient) || text(row.recipientAddress) ||
    text(row.providerAddress) || text(row.date) || text(row.participants) || text(row.hours) || text(row.activity) ||
    (Array.isArray(row.selectedGroups) && row.selectedGroups.length) || text(row.extraGroups),
  );
  const activeRows = (Array.isArray(rows) ? rows : []).filter((row) =>
    text(row.category) || text(row.activities) || text(row.participants) || text(row.participationCount) ||
    text(row.operatingExpense) || text(row.materialExpense) || text(row.mealExpense) || text(row.otherExpense) ||
    (Array.isArray(row.selectedGroups) && row.selectedGroups.length) || text(row.extraGroups),
  );
  const townOrder = (town) => {
    const index = centers.indexOf(town);
    return index < 0 ? (town === '공동' ? centers.length : centers.length + 1) : index;
  };
  programs.sort((a, b) => townOrder(text(a.center)) - townOrder(text(b.center)));
  links.sort((a, b) => townOrder(text(a.town)) - townOrder(text(b.town)));
  const townCount = new Set([
    ...activeRows.map((row) => text(row.town)),
    ...programs.map((row) => text(row.center)),
    ...links.map((row) => text(row.town)),
  ].filter(Boolean)).size;
  const groups = new Map();
  for (const row of links) {
    const town = text(row.town) || '공동';
    if (!groups.has(town)) groups.set(town, []);
    groups.get(town).push(row);
  }
  return {
    month,
    extras,
    programs,
    links,
    groups: [...groups.entries()].sort((a, b) => townOrder(a[0]) - townOrder(b[0])),
    townshipCount: townCount || integer(extras.townshipCount),
    campCount: integer(extras.campCount),
    newCampCount: integer(extras.newCampCount),
    programPeople: programs.reduce((sum, row) => sum + integer(row.participants), 0),
    linkagePeople: links.reduce((sum, row) => sum + integer(row.participants), 0),
  };
}

function allTables(root) {
  return Array.from(root.getElementsByTagNameNS(HP, 'tbl'));
}
function rows(table) {
  return Array.from(table.children).filter((child) => child.namespaceURI === HP && child.localName === 'tr');
}
function cells(row) {
  return Array.from(row.children).filter((child) => child.namespaceURI === HP && child.localName === 'tc');
}
function rowTexts(row) {
  return cells(row).map((cell) => Array.from(cell.getElementsByTagNameNS(HP, 't')).map((node) => node.textContent || '').join(''));
}
function setCellText(cell, value) {
  const nodes = Array.from(cell.getElementsByTagNameNS(HP, 't'));
  if (!nodes.length) throw new Error('원본 서식의 표 셀을 찾지 못했습니다.');
  nodes[0].textContent = String(value ?? '').replace(/\r?\n/g, ' ');
  for (const node of nodes.slice(1)) node.textContent = '';
}
function setRowAddress(row, rowIndex) {
  for (const cell of cells(row)) {
    const address = cell.getElementsByTagNameNS(HP, 'cellAddr').item(0);
    if (address) address.setAttribute('rowAddr', String(rowIndex));
  }
}
function setSpan(cell, attribute, value) {
  const span = cell.getElementsByTagNameNS(HP, 'cellSpan').item(0);
  if (span) span.setAttribute(attribute, String(value));
}
function replaceRows(table, nextRows) {
  for (const row of rows(table)) table.removeChild(row);
  for (const row of nextRows) table.appendChild(row);
  table.setAttribute('rowCnt', String(nextRows.length));
}
function setTableCellValues(row, values) {
  const tableCells = cells(row);
  if (tableCells.length !== values.length) throw new Error('원본 서식의 표 열 구성이 예상과 다릅니다.');
  tableCells.forEach((cell, index) => setCellText(cell, values[index]));
}

function programDate(value, month) {
  const raw = text(value);
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const short = raw.match(/(?:^|\D)(\d{1,2})\s*[./월-]\s*(\d{1,2})/);
    if (!short) return raw;
    match = [raw, month.slice(0, 4), String(Number(short[1])).padStart(2, '0'), String(Number(short[2])).padStart(2, '0')];
  }
  const year = Number(match[1]), m = Number(match[2]), day = Number(match[3]);
  if (!year || m < 1 || m > 12 || day < 1 || day > 31) return raw;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(year, m - 1, day).getDay()];
  return `${m}.${day}.(${weekday})`;
}
function linkageDate(value) {
  const raw = text(value);
  const iso = raw.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return iso ? `${Number(iso[1])}.${Number(iso[2])}.` : raw;
}
function groupLabel(town, name) {
  if (town === '연무읍' && name === '연무읍 여성의용소방대') return '연무여성 의용소방대';
  if (name === `${town} 거점캠프`) return `${town.replace(/[읍면동]$/, '')}거점`;
  return name.startsWith(`${town} `) ? name.slice(town.length + 1) : name;
}
function supplierNames(row) {
  const selected = (Array.isArray(row.selectedGroups) ? row.selectedGroups : []).map((name) => groupLabel(text(row.town), text(name)));
  const extras = String(row.extraGroups || '').split(/\r?\n/).map((name) => name.replace(/^\s*[•·\-*]\s*/, '').trim()).filter(Boolean);
  return [...new Set([...selected, ...extras])].join(', ');
}
function linkagePeopleCell(row) {
  const people = integer(row.participants);
  const hours = text(row.hours).replace(/\s*시간\s*$/, '');
  return `${people}명${hours ? `(${hours}시간)` : ''}`;
}

function updateTitle(root, month) {
  const title = Array.from(root.children).find((child) => child.namespaceURI === HP && child.localName === 'p');
  const nodes = title ? Array.from(title.getElementsByTagNameNS(HP, 't')) : [];
  if (nodes.length < 3) throw new Error('원본 서식의 제목을 찾지 못했습니다.');
  nodes[0].textContent = `${month.slice(0, 4)}년`;
  nodes[1].textContent = ` ${Number(month.slice(5))}월 `;
}

function updateSummary(table, data) {
  const tableRows = rows(table);
  if (tableRows.length < 2 || cells(tableRows[1]).length !== 5) throw new Error('원본 서식의 총괄표를 찾지 못했습니다.');
  setTableCellValues(tableRows[1], [
    data.townshipCount,
    data.campCount,
    data.newCampCount,
    `${data.programs.length}건 / ${data.programPeople.toLocaleString('ko-KR')}명`,
    `${data.links.length}건 / ${data.linkagePeople.toLocaleString('ko-KR')}명`,
  ]);
}

function updatePrograms(table, data) {
  const sourceRows = rows(table);
  if (sourceRows.length < 3) throw new Error('원본 서식의 프로그램 표를 찾지 못했습니다.');
  const header = sourceRows[0].cloneNode(true);
  const rowPrototype = sourceRows[1];
  const totalPrototype = sourceRows[sourceRows.length - 1];
  const nextRows = [header];
  for (const [index, item] of data.programs.entries()) {
    const row = rowPrototype.cloneNode(true);
    setTableCellValues(row, [text(item.center), text(item.program), text(item.content), integer(item.participants), programDate(item.date, data.month)]);
    setRowAddress(row, index + 1);
    nextRows.push(row);
  }
  const total = totalPrototype.cloneNode(true);
  const totalCells = cells(total);
  if (totalCells.length !== 2) throw new Error('원본 서식의 프로그램 합계 줄을 찾지 못했습니다.');
  setTableCellValues(total, ['합   계', `${data.programs.length}건  /  ${data.programPeople.toLocaleString('ko-KR')}명`]);
  setRowAddress(total, nextRows.length);
  nextRows.push(total);
  replaceRows(table, nextRows);
}

function makeLinkageTable(baseTable, totalPrototype, town, items, appendTotal, data) {
  const sourceRows = rows(baseTable);
  if (sourceRows.length < 4) throw new Error('원본 서식의 읍면동별 연계 표를 찾지 못했습니다.');
  const headerRows = [sourceRows[0].cloneNode(true), sourceRows[1].cloneNode(true)];
  const nextRows = [...headerRows];
  items.forEach((item, index) => {
    const row = (index === 0 ? sourceRows[2] : sourceRows[3]).cloneNode(true);
    const values = index === 0
      ? [town, text(item.recipientCategory), text(item.recipient), text(item.recipientAddress), supplierNames(item), text(item.providerAddress), linkageDate(item.date), linkagePeopleCell(item), text(item.activity), text(item.registered)]
      : [text(item.recipientCategory), text(item.recipient), text(item.recipientAddress), supplierNames(item), text(item.providerAddress), linkageDate(item.date), linkagePeopleCell(item), text(item.activity), text(item.registered)];
    setTableCellValues(row, values);
    setRowAddress(row, index + 2);
    if (index === 0) setSpan(cells(row)[0], 'rowSpan', items.length);
    nextRows.push(row);
  });
  if (appendTotal) {
    const total = totalPrototype.cloneNode(true);
    const totalCells = cells(total);
    if (totalCells.length !== 3) throw new Error('원본 서식의 연계 합계 줄을 찾지 못했습니다.');
    setTableCellValues(total, ['합계', `${data.links.length}건 / ${data.linkagePeople.toLocaleString('ko-KR')}명`, '']);
    setSpan(totalCells[0], 'colSpan', 8);
    setSpan(totalCells[1], 'colSpan', 2);
    setSpan(totalCells[2], 'colSpan', 1);
    const addresses = [0, 8, 10];
    totalCells.forEach((cell, index) => {
      const address = cell.getElementsByTagNameNS(HP, 'cellAddr').item(0);
      if (address) {
        address.setAttribute('colAddr', String(addresses[index]));
        address.setAttribute('rowAddr', String(nextRows.length));
      }
    });
    nextRows.push(total);
  }
  replaceRows(baseTable, nextRows);
  return baseTable;
}

function updateLinkages(root, tables, data) {
  if (tables.length < 4) throw new Error('원본 서식의 읍면동별 연계실적 표를 찾지 못했습니다.');
  const linkParagraphs = Array.from(root.children).filter((paragraph) => {
    if (paragraph.namespaceURI !== HP || paragraph.localName !== 'p') return false;
    const table = paragraph.getElementsByTagNameNS(HP, 'tbl').item(0);
    return table && rowTexts(rows(table)[0]).some((value) => /읍면/.test(value)) && rowTexts(rows(table)[0]).some((value) => /수요자/.test(value));
  });
  if (linkParagraphs.length < 2) throw new Error('원본 서식의 읍면동 표 틀을 찾지 못했습니다.');
  const baseTable = linkParagraphs[0].getElementsByTagNameNS(HP, 'tbl').item(0);
  const totalTable = linkParagraphs[linkParagraphs.length - 1].getElementsByTagNameNS(HP, 'tbl').item(0);
  const totalPrototype = rows(totalTable).at(-1).cloneNode(true);
  const insertionPoint = linkParagraphs[linkParagraphs.length - 1].nextSibling;
  for (const paragraph of linkParagraphs) root.removeChild(paragraph);

  const groups = data.groups.length ? data.groups : [['', []]];
  groups.forEach(([town, items], index) => {
    const paragraph = linkParagraphs[0].cloneNode(true);
    const table = paragraph.getElementsByTagNameNS(HP, 'tbl').item(0);
    makeLinkageTable(table, totalPrototype, town, items, index === groups.length - 1 && data.links.length > 0, data);
    root.insertBefore(paragraph, insertionPoint);
  });
}

async function exportReport() {
  const month = monthInput();
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('먼저 운영현황 보고 월을 선택해 주세요.');
  const data = dataForMonth(month);
  const response = await fetch(new URL('./center-operations-template.hwpx', import.meta.url));
  if (!response.ok) throw new Error('원본 운영현황 서식 파일을 불러오지 못했습니다.');
  const source = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(source);
  const section = files['Contents/section0.xml'];
  if (!section) throw new Error('원본 운영현황 본문을 찾지 못했습니다.');
  const xml = new DOMParser().parseFromString(strFromU8(section), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('원본 운영현황 서식을 읽지 못했습니다.');
  const root = xml.documentElement;
  const tables = allTables(root);
  if (tables.length < 4) throw new Error('원본 운영현황의 표 서식이 부족합니다.');
  updateTitle(root, month);
  updateSummary(tables[0], data);
  updatePrograms(tables[1], data);
  updateLinkages(root, tables, data);
  files['Contents/section0.xml'] = strToU8(new XMLSerializer().serializeToString(xml));
  files['Preview/PrvText.txt'] = strToU8(`${month} 논산시 거점캠프 운영 현황`);
  const entries = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, [bytes, { level: name === 'mimetype' ? 0 : 6 }]]));
  const archive = zipSync(entries);
  const blob = new Blob([archive], { type: 'application/haansofthwpx' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${month}_논산시_거점캠프_운영현황.hwpx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

document.addEventListener('click', (event) => {
  const origin = event.target;
  const button = origin instanceof Element ? origin.closest('button') : null;
  if (!button || text(button.textContent) !== '거점운영현황 한글파일저장') return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  exportReport().catch((error) => window.alert(error instanceof Error ? error.message : '한글 운영현황을 만들지 못했습니다.'));
}, true);
