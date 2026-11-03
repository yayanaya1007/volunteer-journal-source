// Keep validation messages visible without changing journal data or validation.
export function StickyJournalNotice({ React, message, Icon }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const notice = ref.current, main = notice?.closest('main');
    if (!notice || !main) return;
    const update = () => {
      main.style.setProperty('--journal-notice-height', `${Math.ceil(notice.getBoundingClientRect().height) + 12}px`);
      const grid = main.querySelector('.work-grid');
      const belowGrid = grid ? Math.max(0, document.documentElement.scrollHeight - grid.getBoundingClientRect().bottom - window.scrollY) : 0;
      main.style.setProperty('--journal-calendar-bottom-space', `${Math.ceil(belowGrid)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(notice);
    const footer = document.querySelector('footer');
    if (footer) observer.observe(footer);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); main.style.removeProperty('--journal-notice-height'); main.style.removeProperty('--journal-calendar-bottom-space'); };
  }, [message]);
  return React.createElement('div', { ref, role: 'alert', className: 'notice error journal-sticky-notice' }, React.createElement(Icon, { size: 18 }), React.createElement('span', null, message));
}
