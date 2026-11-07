// Keep pointer focus from scrolling or moving a button before its click arrives.
// Keyboard focus, native pickers, checkboxes and tabs retain their own behavior.
export function journalActionButton(target) {
  const button = target?.closest?.('button');
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return null;
  if (!button.closest('.workspace, dialog, [role="dialog"]')) return null;
  if (['checkbox', 'radio', 'switch', 'combobox', 'tab'].includes(button.getAttribute('role'))) return null;
  return button;
}

// Validation is an intentional navigation: take the user to the missing item.
export function focusJournalValidation(message, doc = document) {
  const pane = doc.querySelector('.detail-pane');
  if (!pane) return false;
  const field = name => [...pane.querySelectorAll('label.field')].find(label =>
    label.querySelector('span')?.textContent.trim().startsWith(name))?.querySelector('input, textarea, select, button');
  const button = text => [...pane.querySelectorAll('button')].find(node => node.textContent.includes(text));
  let target;
  if (message.includes('활동유형을 하나 이상')) target = pane.querySelector('.activity-types [role="checkbox"]');
  else if (message.includes('세부활동 구분')) target = pane.querySelector('input[type="checkbox"]');
  else if (message.includes('활동일자')) target = pane.querySelector('.recognized-date input');
  else if (message.includes('활동가 이름을 확인')) target = pane.querySelector('[role="checkbox"]');
  else if (message.includes('활동가 이름')) target = field('활동가 성명');
  else if (message.includes('활동 내용 또는 출장 목적')) target = field('활동내용');
  else if (message.includes('출장 내역을 한 줄')) target = button('출장 추가');
  else if (message.includes('출장 장소와 목적')) target = [...pane.querySelectorAll('.trip-edit textarea')].find(input => !input.value.trim());
  else if (message.includes('출장 시간') || message.includes('출장시간')) target = [...pane.querySelectorAll('.trip-edit input[type="time"]')].find(input => !input.value) || pane.querySelector('.trip-edit input[type="time"]');
  else if (message.includes('활동유형 기타')) target = pane.querySelector('.activity-type-other-input');
  else if (message.includes('확인 항목')) target = pane.querySelector('.declarations [role="checkbox"][aria-checked="false"]');
  else if (message.includes('봉사시간을 확인해주세요')) {
    target = [...pane.querySelectorAll('input[type="time"]')].find(input =>
      !input.closest('.trip-edit') && input.value.startsWith('00:') &&
      input.closest('label')?.querySelector('span')?.textContent.includes('종료시간'));
  }
  else if (message.includes('활동시간') || message.includes('시작·종료 시간')) target = [...pane.querySelectorAll('input[type="time"]')].find(input => !input.closest('.trip-edit') && !input.value) || field('시작시간');
  if (!target) return false;
  target.scrollIntoView({block:'center',behavior:'auto'});
  // A time input seeds a default on focus. Validation must not fill it in.
  if (target.type !== 'time') target.focus({preventScroll:true});
  return true;
}

export function installJournalActionStability(doc = document) {
  let pending;
  const floors = new Map();
  const preserveBottom = event => {
    if (event.button !== 0 || !event.target?.closest?.('button, input, textarea, select, summary, a, label')) return;
    const root = event.target.closest('.workspace');
    if (!root || !doc.defaultView) return;
    if (!floors.has(root)) floors.set(root, root.style.minHeight);
    // A disappearing notice or signature can otherwise shorten the document
    // below the viewport and force the browser to clamp its scroll position.
    const floor = Math.ceil(doc.defaultView.innerHeight - root.getBoundingClientRect().top);
    root.style.minHeight = `${Math.max(floor, parseFloat(root.style.minHeight) || 0)}px`;
  };
  const releaseBottom = () => {
    for (const [root, original] of floors) root.style.minHeight = original;
    floors.clear();
  };
  const releaseOnKey = event => {
    if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseBottom();
  };
  const down = event => {
    pending = null;
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const button = journalActionButton(event.target);
    if (!button) return;
    pending = { button, active: doc.activeElement };
    event.preventDefault();
  };
  const click = event => {
    const saved = pending;
    pending = null;
    if (!saved || saved.button !== journalActionButton(event.target)) return;
    // A newly opened dialog or picker may have deliberately moved focus.
    if (saved.button.isConnected && doc.activeElement === saved.active) {
      saved.button.focus({ preventScroll: true });
    }
  };
  doc.addEventListener('mousedown', down, true);
  doc.addEventListener('click', click);
  doc.addEventListener('pointerdown', preserveBottom, true);
  doc.addEventListener('wheel', releaseBottom, {passive:true});
  doc.addEventListener('touchmove', releaseBottom, {passive:true});
  doc.addEventListener('keydown', releaseOnKey);
  return () => {
    doc.removeEventListener('mousedown', down, true);
    doc.removeEventListener('click', click);
    doc.removeEventListener('pointerdown', preserveBottom, true);
    doc.removeEventListener('wheel', releaseBottom);
    doc.removeEventListener('touchmove', releaseBottom);
    doc.removeEventListener('keydown', releaseOnKey);
    releaseBottom();
  };
}

if (typeof document !== 'undefined') installJournalActionStability();
