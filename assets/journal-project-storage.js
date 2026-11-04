const PREFIX = 'volunteer-journal:';
const normalizeName = value => String(value || '').normalize('NFKC').trim();

// A requested person must never fall back to somebody else's month.
export function findSavedJournalProjectJson(storage, month, name) {
  const requested = normalizeName(name);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter(key => key?.startsWith(`${PREFIX}${month}|`)).sort();
  const exact = `${PREFIX}${month}|${encodeURIComponent(String(name || '').trim())}`;
  const legacy = `${PREFIX}${month}`;
  const candidates = requested ? [exact, legacy, ...keys] : [...keys.slice(-1), legacy, ...keys];
  for (const key of new Set(candidates)) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const project = JSON.parse(raw);
      if (project?.month !== month || !Array.isArray(project.records)) continue;
      if (requested && normalizeName(project.name) !== requested) continue;
      return raw;
    } catch { /* Preserve unreadable entries and continue searching. */ }
  }
  return null;
}
