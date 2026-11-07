import {hasExistingWork} from './bulk-journal-drafts.js?v=20261103-row-picker-v20';

export function planJournalRecordImport(existing, incoming, mode = 'empty') {
  const records = new Map(existing.map(record => [record.date, record]));
  const collisions = [...new Set(incoming.filter(record => hasExistingWork(records.get(record.date))).map(record => record.date))];
  const skippedDates = mode === 'empty' ? collisions : [];
  const skipped = new Set(skippedDates);
  const accepted = incoming.filter(record => !skipped.has(record.date));
  return { mode, collisions, skippedDates, accepted };
}

export function keepJournalImportAsset(asset, plan, replacementIds) {
  return !(plan.mode === 'overwrite' && ['photo', 'source-signature'].includes(asset.kind) && replacementIds.has(asset.sourceId || '') && plan.accepted.some(record => record.date === asset.date));
}

export function missingJournalTrips(existing, incoming, sourceId) {
  const sourceTrips = new Map(incoming.filter(record => record.sourceId === sourceId && record.trips?.length)
    .map(record => [record.date, record.trips]));
  return existing.filter(record => record.sourceId === sourceId && !record.trips?.length && sourceTrips.has(record.date))
    .map(record => ({...record, trips: sourceTrips.get(record.date), reviewed: false}));
}

export function chooseJournalImportMode(dates, missingTripCount = 0) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'journal-import-choice';
    dialog.setAttribute('aria-label', '기존 일지와 겹치는 날짜 처리');
    const heading = document.createElement('h2'); heading.textContent = '이미 작성한 날짜가 있습니다';
    const help = document.createElement('p'); help.textContent = `겹치는 ${dates.length}일: ${dates.join(', ')}. 기존 내용을 덮어쓸까요, 비어 있는 날짜만 넣을까요?`;
    const note = document.createElement('p'); note.textContent = '비어 있는 날짜만 넣으면 직접 작성한 일지와 기존 사진·서명을 그대로 유지합니다.';
    const actions = document.createElement('div'); actions.className = 'journal-import-choice-actions';
    let settled = false;
    const finish = mode => { if (settled) return; settled = true; dialog.close(); dialog.remove(); resolve(mode); };
    const choices = [['empty', '비어 있는 날짜만 넣기']];
    if (missingTripCount) choices.push(['trips', `빈 출장내역만 채우기 (${missingTripCount}일)`]);
    choices.push(['overwrite', '덮어쓰기'], ['cancel', '취소']);
    for (const [mode, label] of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      if (mode === 'empty') { button.className = 'primary'; button.autofocus = true; }
      button.addEventListener('click', () => finish(mode)); actions.appendChild(button);
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish('cancel'); });
    dialog.addEventListener('close', () => finish('cancel'));
    dialog.append(heading, help, note, actions); document.body.appendChild(dialog); dialog.showModal(); actions.firstElementChild.focus();
  });
}
