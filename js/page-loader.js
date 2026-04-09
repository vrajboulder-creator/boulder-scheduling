// ─── HTML PARTIAL LOADER ───
// Fetches HTML partials and injects them into placeholder elements.
// Uses a cache so each partial is only fetched once.

const _partialCache = {};

async function loadPartial(url) {
  if (_partialCache[url]) return _partialCache[url];
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load partial: ${url} (${resp.status})`);
  const html = await resp.text();
  _partialCache[url] = html;
  return html;
}

async function injectPartial(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = await loadPartial(url);
}

// Load all shell partials, then boot the app
async function loadShell() {
  await Promise.all([
    injectPartial('#shell-sidebar', 'partials/sidebar.html'),
    injectPartial('#shell-header', 'partials/header.html'),
    injectPartial('#shell-detail', 'partials/detail-panel.html'),
    injectPartial('#shell-modal', 'partials/modal.html'),
  ]);
  // Now that DOM is populated, boot the app
  bootApp();
}
