(() => {
  'use strict';
  const button = document.getElementById('install-photo-app');
  const help = document.getElementById('photo-install-help');
  const status = document.getElementById('photo-install-status');
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
      status.textContent = '설치하면 활동일지와 별도의 ‘활동보고서사진’ 아이콘으로 바로 열 수 있습니다.';
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
  document.getElementById('photo-install-close').addEventListener('click', () => help.close());
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./activity-report-photo-sw.js', {
      scope: './activity-report-photo.html', updateViaCache: 'none'
    }).catch(() => { /* Browser menu installation remains available. */ });
  }
})();
