(() => {
  'use strict';
  const button = document.getElementById('install-journal-app');
  const help = document.getElementById('journal-install-help');
  const status = document.getElementById('journal-install-status');
  const standalone = matchMedia('(display-mode: standalone)');
  let installPrompt;
  const update = () => { button.hidden = standalone.matches || navigator.standalone === true; };
  update();
  standalone.addEventListener('change', update);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = undefined;
    button.hidden = true;
    if (help.open) help.close();
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) {
      status.textContent = '설치하면 ‘활동일지’ 아이콘으로 바로 열 수 있습니다. 이 브라우저에 저장한 자료를 그대로 사용합니다.';
      help.showModal();
      return;
    }
    const prompt = installPrompt;
    installPrompt = undefined;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') button.hidden = true;
    } catch {
      status.textContent = '브라우저 메뉴에서 앱 설치를 선택해 주세요.';
      help.showModal();
    }
  });
  document.getElementById('journal-install-close').addEventListener('click', () => help.close());
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./journal-install-sw.js', {
      scope: './', updateViaCache: 'none'
    }).catch(() => { /* Browser menu installation remains available. */ });
  }
})();
