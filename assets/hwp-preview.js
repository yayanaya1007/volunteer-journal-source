import initHwp, { HwpDocument } from './rhwp-VciUJEJo.js';

const states = new Map();
let initPromise;
let measureContext;
let measureFont = '';

function installTextMeasure() {
  globalThis.measureTextWidth = (font, text) => {
    measureContext ||= document.createElement('canvas').getContext('2d');
    if (!measureContext) return 0;
    if (font !== measureFont) {
      measureContext.font = font;
      measureFont = font;
    }
    return measureContext.measureText(text).width;
  };
}

function initializeRenderer() {
  installTextMeasure();
  initPromise ||= initHwp();
  return initPromise;
}

function readStoredFile(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('volunteer-journal-files', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
    };
    request.onerror = () => reject(request.error || new Error('저장된 원본 파일을 열지 못했습니다.'));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.close();
        reject(new Error('저장된 원본 파일을 찾지 못했습니다.'));
        return;
      }
      const get = db.transaction('files', 'readonly').objectStore('files').get(id);
      get.onsuccess = () => {
        db.close();
        if (get.result) resolve(get.result);
        else reject(new Error('저장된 원본 파일을 찾지 못했습니다. 파일을 다시 올려 주세요.'));
      };
      get.onerror = () => {
        db.close();
        reject(get.error || new Error('저장된 원본 파일을 읽지 못했습니다.'));
      };
    };
  });
}

globalThis.extractHwpEmbeddedMedia = async (bytes, pages) => {
  await initializeRenderer();
  const doc = new HwpDocument(bytes);
  try {
    const originalPageHeight = JSON.parse(doc.getPageDef(0)).height / 75;
    correctRendererOverflow(doc);
    const pageCount = doc.pageCount();
    if (pageCount !== pages.length) return { pageCount, pages: [] };
    const pageHeight = originalPageHeight;
    const extracted = [];
    for (let index = 0; index < pageCount; index++) {
      const sourcePage = pages[index] || {};
      const result = { page: index + 1, photos: [] };
      doc.getPageSourceImageKeys(index);
      const signatureText = /서명|날인|제출자/.test(sourcePage.text || '');
      const overlay = JSON.parse(doc.getPageOverlayImages(index));
      for (const image of [...(overlay.behind || []), ...(overlay.front || [])]) {
        const box = image.bbox || {};
        if (!/^image\/(?:jpeg|png)$/i.test(image.mime || '') || !image.base64 || box.y + box.height < pageHeight * 0.90 || box.width > 180 || box.height > 80) continue;
        const bytes = Uint8Array.from(atob(image.base64), character => character.charCodeAt(0));
        const blob = new Blob([bytes], { type: image.mime });
        let bitmap;
        try { bitmap = await createImageBitmap(blob); } catch { continue; }
        const signatureAspect = bitmap.width / Math.max(1, bitmap.height);
        if (bitmap.width <= 1200 && bitmap.height <= 500 && signatureAspect >= 1.2) result.signature ||= blob;
        bitmap.close();
      }
      const pageImages = JSON.parse(doc.getPageFlowImageOps(index)).images || [];
      for (const image of pageImages) {
        if (!/^image\/(?:jpeg|png)$/i.test(image.mime || '')) continue;
        const source = doc.getSourceImageBytes(image.sourceImageKey);
        if (!source?.length) continue;
        const blob = new Blob([source], { type: image.mime });
        let bitmap;
        try { bitmap = await createImageBitmap(blob); } catch { continue; }
        const signatureAspect = bitmap.width / Math.max(1, bitmap.height);
        const isSignature = signatureText && image.bbox.y > pageHeight * 0.80 && image.bbox.width < 260 && image.bbox.height < 120 && bitmap.width <= 1200 && bitmap.height <= 500 && signatureAspect >= 1.2;
        if (isSignature) result.signature = blob;
        else if (bitmap.width >= 80 && bitmap.height >= 80 && bitmap.width * bitmap.height <= 20000000) result.photos.push(blob);
        bitmap.close();
      }
      extracted.push(result);
    }
    return { pageCount, pages: extracted };
  } finally { doc.free(); }
};

function updatePageLink(state, url) {
  const link = state.container.closest('.source-view')?.querySelector('.source-heading a');
  if (link) link.href = url;
}

function correctRendererOverflow(doc) {
  const pageCount = doc.pageCount();
  const sections = doc.getSectionCount();
  const originalDefs = [];
  try {
    for (let section = 0; section < sections; section++) {
      const pageDef = JSON.parse(doc.getPageDef(section));
      originalDefs.push(pageDef);
      pageDef.height = Math.ceil(pageDef.height * 1.07);
      doc.setPageDef(section, JSON.stringify(pageDef));
    }
    if (doc.pageCount() < pageCount) return;
  } catch {
    // Keep the renderer's original pagination if the document has an
    // unsupported section definition.
  }
  for (let section = 0; section < originalDefs.length; section++) {
    try { doc.setPageDef(section, JSON.stringify(originalDefs[section])); } catch {}
  }
}

function updatePager(state, page) {
  const picker = document.querySelector('.source-picker .page-stepper');
  if (!picker) return;
  const input = picker.querySelector('input[aria-label="원본 페이지"]');
  const buttons = picker.querySelectorAll('button');
  if (input) {
    input.max = String(state.total);
    input.value = String(page);
  }
  if (buttons[0]) buttons[0].disabled = page <= 1;
  if (buttons[1]) buttons[1].disabled = page >= state.total;
}

function renderPage(state, requestedPage) {
  if (state.cancelled || !state.container.isConnected || state.container.dataset.sourceId !== state.id || !state.container.matches('.hwp-preview-placeholder') || !state.doc || !state.total) return;
  const page = Math.max(1, Math.min(state.total, Number(requestedPage) || 1));
  if (page === state.page && state.image.src) {
    state.image.hidden = false;
    state.status.hidden = true;
    updatePageLink(state, state.svgUrl || state.image.src);
    updatePager(state, page);
    return;
  }
  try {
    state.container.scrollTop = 0;
    const svg = state.doc.renderPageSvg(page - 1);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    if (state.svgUrl) URL.revokeObjectURL(state.svgUrl);
    state.svgUrl = url;
    state.page = page;
    state.image.alt = `원본 한글 문서 ${page}쪽`;
    state.image.src = url;
    state.image.hidden = false;
    state.status.hidden = true;
    state.container.dataset.page = String(page);
    updatePageLink(state, url);
    updatePager(state, page);
  } catch (error) {
    state.status.hidden = false;
    state.status.textContent = error instanceof Error ? error.message : '원본 쪽을 그리지 못했습니다.';
    state.image.hidden = true;
  }
}

function dispose(container) {
  const state = states.get(container);
  if (!state) return;
  state.cancelled = true;
  state.doc?.free();
  if (state.svgUrl) URL.revokeObjectURL(state.svgUrl);
  states.delete(container);
}

function mount(container) {
  const id = container.dataset.sourceId;
  if (!id) return;
  const page = Number(container.dataset.page) || 1;
  const current = states.get(container);
  if (current?.id === id) {
    // React can reuse this div for a date without a source, replacing the
    // renderer-owned image with placeholder text. Reattach the cached nodes.
    if (current.image.parentNode !== container || current.status.parentNode !== container) {
      container.replaceChildren(current.status, current.image);
    }
    renderPage(current, page);
    return;
  }
  dispose(container);

  const status = document.createElement('div');
  status.className = 'hwp-preview-status';
  status.textContent = '원본 한글 문서를 여는 중입니다.';
  const image = document.createElement('img');
  image.alt = '원본 한글 문서';
  image.hidden = true;
  container.replaceChildren(status, image);

  const state = { id, container, status, image, doc: null, total: 0, page: 0, svgUrl: '', cancelled: false };
  states.set(container, state);
  void (async () => {
    try {
      const file = await readStoredFile(id);
      const bytes = new Uint8Array(await file.arrayBuffer());
      await initializeRenderer();
      const doc = new HwpDocument(bytes);
      if (state.cancelled) {
        doc.free();
        return;
      }
      let total = doc.pageCount();
      if (!total) {
        doc.free();
        throw new Error('원본 문서의 쪽 수를 읽지 못했습니다.');
      }
      state.doc = doc;
      correctRendererOverflow(doc);
      total = doc.pageCount();
      state.total = total;
      renderPage(state, Number(container.dataset.page) || page);
    } catch (error) {
      if (state.cancelled) return;
      state.status.hidden = false;
      state.status.textContent = error instanceof Error ? error.message : '원본 한글 파일을 미리보기로 열지 못했습니다.';
      state.image.hidden = true;
    }
  })();
}

function scan(node) {
  if (node instanceof Element && node.matches('.hwp-preview-placeholder')) mount(node);
  if (node?.querySelectorAll) node.querySelectorAll('.hwp-preview-placeholder').forEach(mount);
}

function cleanup(node) {
  if (!(node instanceof Element) || node.isConnected) return;
  // The div may no longer carry the placeholder class after React reused it.
  for (const container of states.keys()) {
    if (container === node || node.contains(container)) dispose(container);
  }
}

function start() {
  scan(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') mount(mutation.target);
      else {
        if (mutation.target instanceof Element && mutation.target.matches('.hwp-preview-placeholder')) mount(mutation.target);
        mutation.addedNodes.forEach(scan);
        mutation.removedNodes.forEach(cleanup);
      }
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-source-id', 'data-page'],
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
