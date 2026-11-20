/* install.js - "Install app" shortcut button + service worker registration.
   Works on Chrome/Edge/Android (native prompt) and iOS Safari (Add to Home Screen guide). */
(function () {
  var C = {"name": "Habit & Sleep & Water Tracker", "acc": "#4f7cff", "txt": "#ffffff", "bg": "#111827", "fg": "#ffffff"};
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;
  var KEY = 'pwa-install-dismissed', DAY = 864e5;
  try { var t = +localStorage.getItem(KEY); if (t && Date.now() - t < 7 * DAY) return; } catch (e) {}
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null, wrap = null;

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '.pwa-install{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:2px;' +
      'background:' + C.acc + ';color:' + C.txt + ';border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.35);font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.pwa-install button{all:unset;cursor:pointer;color:inherit;font:inherit}' +
      '.pwa-install .go{display:flex;align-items:center;gap:8px;padding:12px 8px 12px 16px;border-radius:999px 0 0 999px}' +
      '.pwa-install .x{padding:12px 14px 12px 8px;opacity:.7;border-radius:0 999px 999px 0}' +
      '.pwa-install button:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
      '.pwa-sheet{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}' +
      '.pwa-sheet div{background:' + C.bg + ';color:' + C.fg + ';width:min(420px,100%);border-radius:18px 18px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom,0px));font:15px/1.5 system-ui,-apple-system,sans-serif}' +
      '.pwa-sheet h3{margin:0 0 8px;font-size:18px}.pwa-sheet ol{margin:0 0 16px;padding-left:20px}' +
      '.pwa-sheet button{all:unset;cursor:pointer;background:' + C.acc + ';color:' + C.txt + ';padding:10px 18px;border-radius:999px;font-weight:600}';
    document.head.appendChild(s);
  }
  function hide(remember) {
    if (wrap) { wrap.remove(); wrap = null; }
    if (remember) { try { localStorage.setItem(KEY, Date.now()); } catch (e) {} }
  }
  function show() {
    if (wrap || document.querySelector('.pwa-install')) return;
    css();
    wrap = document.createElement('div');
    wrap.className = 'pwa-install';
    wrap.innerHTML = '<button class="go" type="button" aria-label="Install ' + C.name + ' as an app">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg>Install app</button>' +
      '<button class="x" type="button" aria-label="Dismiss">&times;</button>';
    wrap.querySelector('.go').onclick = onInstall;
    wrap.querySelector('.x').onclick = function () { hide(true); };
    document.body.appendChild(wrap);
  }
  function onInstall() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; hide(false); });
    } else if (isIOS) {
      var o = document.createElement('div');
      o.className = 'pwa-sheet';
      o.innerHTML = '<div role="dialog" aria-label="Install instructions"><h3>Install ' + C.name + '</h3><ol>' +
        '<li>Tap the <b>Share</b> button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol><button type="button">Got it</button></div>';
      o.onclick = function (e) { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); };
      document.body.appendChild(o);
    }
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  });
  window.addEventListener('appinstalled', function () { hide(false); });
  if (isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  }
  // Manual hook: any element with [data-install] triggers the install flow.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-install]')) onInstall();
  });
})();
