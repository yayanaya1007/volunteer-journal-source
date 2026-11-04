import { unzipSync, zipSync, strFromU8, strToU8 } from './source-layout-zip.js';

// Text extraction must use all cached source pages, rather than treating a
// document with one manual page break as if it had only two physical pages.
export function withCachedHwpxPageBreaks(text) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagNameNS('*', 'parsererror').length) return text;
  const paragraphs = [...xml.documentElement.children].filter(node => node.localName === 'p');
  let previous = -1, changed = false;
  for (const paragraph of paragraphs) {
    const lines = [...paragraph.children].find(node => node.localName === 'linesegarray');
    if (!lines?.children.length) return text;
    const positions = [...lines.children].map(line => line.hasAttribute('vertpos') ? Number(line.getAttribute('vertpos')) : NaN);
    if (positions.some((value, index) => !Number.isFinite(value) || index && value < positions[index - 1])) return text;
    if (previous >= 0 && positions[0] < previous && paragraph.getAttribute('pageBreak') !== '1') {
      paragraph.setAttribute('pageBreak', '1'); changed = true;
    }
    previous = positions.at(-1);
  }
  return changed ? new XMLSerializer().serializeToString(xml) : text;
}

// This is a renderer-only copy. Stored/downloaded source bytes and page margins
// are never changed. Floating tables with cached positions must not push the
// following paragraphs forward a second time during browser pagination.
export function openCachedSourceDocument(bytes, HwpDocument) {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return null;
  let candidate;
  try {
    const entries = unzipSync(bytes);
    const names = Object.keys(entries).filter(name => /^Contents\/section\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/section(\d+)/)[1]) - Number(b.match(/section(\d+)/)[1]));
    if (!names.length) return null;
    const boundaries = [];
    let changed = false;
    for (let sec = 0; sec < names.length; sec++) {
      const xml = new DOMParser().parseFromString(strFromU8(entries[names[sec]]), 'application/xml');
      if (xml.querySelector('parsererror')) return null;
      const paragraphs = [...xml.documentElement.children].filter(node => node.localName === 'p');
      if (!paragraphs.length) return null;
      let previous = -1;
      boundaries.push({ sec, para: 0 });
      for (let para = 0; para < paragraphs.length; para++) {
        const paragraph = paragraphs[para];
        const lines = [...paragraph.children].find(node => node.localName === 'linesegarray');
        if (!lines?.children.length) return null;
        const positions = [...lines.children].map(line => line.hasAttribute('vertpos') ? Number(line.getAttribute('vertpos')) : NaN);
        if (positions.some(position => !Number.isFinite(position))) return null;
        // Multi-page paragraphs need the native renderer; never guess their split.
        if (positions.some((position, index) => index && position < positions[index - 1])) return null;
        if (previous >= 0 && (positions[0] < previous || paragraph.getAttribute('pageBreak') === '1')) {
          boundaries.push({ sec, para });
        }
        previous = positions.at(-1);
        for (const run of [...paragraph.children].filter(node => node.localName === 'run')) {
          for (const table of [...run.children].filter(node => node.localName === 'tbl')) {
            const position = [...table.children].find(node => node.localName === 'pos');
            if (position?.getAttribute('treatAsChar') === '0' && position.getAttribute('flowWithText') === '1') {
              position.setAttribute('flowWithText', '0');
              changed = true;
            }
          }
        }
      }
      entries[names[sec]] = strToU8(new XMLSerializer().serializeToString(xml));
    }
    if (!changed) return null;
    candidate = new HwpDocument(zipSync(entries, { level: 0 }));
    // Only accept the adaptation when every page starts at the source's cached
    // paragraph boundary. Other documents keep the existing renderer path.
    if (candidate.pageCount() !== boundaries.length) { candidate.free(); return null; }
    for (let page = 0; page < boundaries.length; page++) {
      const actual = JSON.parse(candidate.getPositionOfPage(page));
      if (!actual.ok || actual.sec !== boundaries[page].sec || actual.para !== boundaries[page].para) {
        candidate.free(); return null;
      }
    }
    return candidate;
  } catch {
    candidate?.free();
    return null;
  }
}
