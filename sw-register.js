/*
 * Alisha Arcade — shared service-worker registration + update UI.
 * Included by every page as <script src="[../]sw-register.js"></script>.
 *
 * Update UX:
 *  - New version found DURING this session  -> a non-blocking "Update available"
 *    bar at the top (update whenever you like).
 *  - A version was already waiting AT STARTUP (you skipped it last time)
 *    -> a blocking modal that asks you to update before doing anything, with a
 *    "Not now" escape that drops back to the gentle bar.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  // Resolve the worker URL relative to THIS script (which lives at the root),
  // so it works the same from root pages and from /games/ pages.
  var swUrl;
  try { swUrl = new URL('service-worker.js', document.currentScript.src).href; }
  catch (e) { swUrl = 'service-worker.js'; }

  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function activate(worker, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  // Non-blocking top bar — used when a new version turns up mid-session.
  function showUpdateBar(worker) {
    if (document.getElementById('sw-update-bar') || document.getElementById('sw-update-modal')) return;
    var bar = document.createElement('button');
    bar.id = 'sw-update-bar';
    bar.type = 'button';
    bar.textContent = '🔄 Update available — tap to update';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;border:none;cursor:pointer;' +
      'padding:calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px;' +
      'font:700 0.9rem system-ui,-apple-system,sans-serif;color:#1a1206;' +
      'background:linear-gradient(90deg,#fbbf24,#f59e0b);box-shadow:0 2px 14px rgba(0,0,0,0.4);';
    bar.addEventListener('click', function () { activate(worker, bar); });
    document.body.appendChild(bar);
  }

  // Blocking modal — used when an update was pending from a previous session,
  // so the user is asked up front before doing anything.
  function showUpdateModal(worker) {
    if (document.getElementById('sw-update-modal')) return;
    var existingBar = document.getElementById('sw-update-bar');
    if (existingBar) existingBar.remove();

    var overlay = document.createElement('div');
    overlay.id = 'sw-update-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
      'justify-content:center;padding:24px;background:rgba(0,0,0,0.72);' +
      'font-family:system-ui,-apple-system,sans-serif;';

    var card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;color:#e2e8f0;border-radius:16px;padding:24px;max-width:340px;' +
      'width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
    card.innerHTML =
      '<div style="font-size:2rem;margin-bottom:8px;">🔄</div>' +
      '<h2 style="font-size:1.25rem;margin-bottom:8px;">Update ready</h2>' +
      '<p style="color:#94a3b8;font-size:0.92rem;line-height:1.5;margin-bottom:18px;">' +
      'A new version of Alisha Arcade is ready. Update now to get the latest.</p>';

    var updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.textContent = 'Update now';
    updateBtn.style.cssText = 'width:100%;padding:12px;border:none;border-radius:12px;cursor:pointer;' +
      'font-weight:700;font-size:0.95rem;color:#1a1206;background:linear-gradient(90deg,#fbbf24,#f59e0b);';
    updateBtn.addEventListener('click', function () { activate(worker, updateBtn); });

    var laterBtn = document.createElement('button');
    laterBtn.type = 'button';
    laterBtn.textContent = 'Not now';
    laterBtn.style.cssText = 'width:100%;padding:10px;margin-top:8px;border:none;border-radius:12px;cursor:pointer;' +
      'font-weight:600;font-size:0.9rem;color:#94a3b8;background:transparent;';
    laterBtn.addEventListener('click', function () {
      overlay.remove();
      showUpdateBar(worker); // keep a gentle bar so they can still update later
    });

    card.appendChild(updateBtn);
    card.appendChild(laterBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function start() {
    navigator.serviceWorker.register(swUrl).then(function (reg) {
      // Already waiting at startup => the user skipped it last time => ask first.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateModal(reg.waiting);
      }
      // A new version appears during this session => gentle top bar.
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBar(nw);
          }
        });
      });
      reg.update(); // check for a new version at startup
    }).catch(function () { /* ignore */ });
  }

  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start);
})();
