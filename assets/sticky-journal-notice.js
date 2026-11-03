// Keep validation messages visible without changing journal data or validation.
export function StickyJournalNotice({ React, message, Icon }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const notice = ref.current, main = notice?.closest('main');
    if (!notice || !main) return;
    const update = () => main.style.setProperty('--journal-notice-height', `${Math.ceil(notice.getBoundingClientRect().height) + 12}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(notice);
    return () => { observer.disconnect(); main.style.removeProperty('--journal-notice-height'); };
  }, [message]);
  return React.createElement('div', { ref, role: 'alert', className: 'notice error journal-sticky-notice' }, React.createElement(Icon, { size: 18 }), React.createElement('span', null, message));
}
