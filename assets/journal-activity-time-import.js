// A blank minute field in the journal means the whole hour. Never substitute
// times from the detail table or the business-trip table for the activity field.
const token = '(\\d{1,2})\\s*(?::\\s*(\\d{1,2})|시(?:\\s*(\\d{1,2})(?!\\d)(?!\\s*(?:시|:)))?\\s*분?)';
const range = new RegExp('(?<!\\d)' + token + '\\s*[~～∼〜–－-]\\s*' + token + '(?!\\d)', 'g');
export function readActivityTimeRanges(value) {
  return [...String(value).matchAll(range)].flatMap(match => {
    const hour = +match[1], minute = +(match[2] ?? match[3] ?? 0);
    const endHour = +match[4], endMinute = +(match[5] ?? match[6] ?? 0);
    if (hour > 23 || endHour > 23 || minute > 59 || endMinute > 59) return [];
    const format = (h, m) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    return [{ start: format(hour, minute), end: format(endHour, endMinute) }];
  });
}
export function readActivityTimeSection(value) {
  const text = String(value);
  const labels = [...text.matchAll(/활\s*동\s*시\s*간/g)];
  const label = labels.find(match => !/총\s*$/.test(text.slice(0, match.index)));
  if (!label) return { text: '', timeRanges: [] };
  const rest = text.slice(label.index + label[0].length);
  const section = rest.split(/총\s*활\s*동\s*시\s*간|활\s*동\s*유\s*형|세\s*부\s*활\s*동\s*내\s*용|활\s*동\s*실\s*적|출\s*장\s*내\s*역/)[0];
  return { text: section, timeRanges: readActivityTimeRanges(section) };
}
export function isDetailTimeCell(value) {
  // Only standalone time cells/separators are excluded. A sentence such as
  // "9시 방문하여 안부 확인" remains activity content.
  const text = String(value).trim();
  if (!text) return false;
  const withoutTimes = text.replace(new RegExp(token, 'g'), '').replace(/[\s,，~～∼〜–－-]/g, '');
  return (!withoutTimes && /\d/.test(text)) || /^[~～∼〜–－-]+$/.test(text);
}
export function stripLeadingDetailTime(value) {
  const text = String(value);
  const match = text.match(new RegExp('^\\s*' + range.source));
  return match && readActivityTimeRanges(match[0]).length ? text.slice(match[0].length).trim() : text;
}
