/*
 * Alisha Arcade — shared helpers used by every page.
 * Included as <script src="[../]arcade.js"></script> (before the page script).
 *
 * Exposes window.Arcade:
 *   getCoins()                     -> current global coin balance
 *   addCoins(n)                    -> add earned points to the wallet
 *   getHigh(key)                   -> a game's stored high score
 *   maybeUpdateHigh(key, v)        -> raise-only high-score write
 *   initInfoMenu(hsKey)            -> wire the shared ⓘ Info modal
 *
 * All of it is localStorage-backed and never clears user data.
 */
(function (global) {
  var COINS_KEY = 'arcade-coins';
  var NAME_KEY = 'arcade-player-name';
  var OWNED_KEY = 'arcade-owned';

  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  var Arcade = {
    // Player's chosen name (set on the arcade landing page). '' if unset.
    getName: function () {
      try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch (e) { return ''; }
    },
    setName: function (v) {
      v = (v || '').trim().slice(0, 20);
      try {
        if (v) localStorage.setItem(NAME_KEY, v);
        else localStorage.removeItem(NAME_KEY);
      } catch (e) { /* ignore */ }
    },
    getCoins: function () {
      try { return num(localStorage.getItem(COINS_KEY)); } catch (e) { return 0; }
    },
    // Earned points accumulate across all games (spendable in the Shop).
    addCoins: function (n) {
      n = Math.round(n) || 0;
      if (n <= 0) return;
      try { localStorage.setItem(COINS_KEY, String(Arcade.getCoins() + n)); } catch (e) { /* ignore */ }
    },
    // Spend from the wallet (clamped at 0).
    spendCoins: function (n) {
      n = Math.round(n) || 0;
      if (n <= 0) return;
      try { localStorage.setItem(COINS_KEY, String(Math.max(0, Arcade.getCoins() - n))); } catch (e) { /* ignore */ }
    },
    // Owned shop items (accessories), stored as a JSON array of item ids.
    getOwned: function () {
      try { var v = JSON.parse(localStorage.getItem(OWNED_KEY)); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    },
    owns: function (id) { return Arcade.getOwned().indexOf(id) !== -1; },
    // Attempt a purchase. Returns 'ok' | 'owned' | 'insufficient'.
    buy: function (id, cost) {
      if (Arcade.owns(id)) return 'owned';
      if (Arcade.getCoins() < cost) return 'insufficient';
      Arcade.spendCoins(cost);
      var owned = Arcade.getOwned();
      owned.push(id);
      try { localStorage.setItem(OWNED_KEY, JSON.stringify(owned)); } catch (e) { /* ignore */ }
      return 'ok';
    },
    getHigh: function (key) {
      try { return num(localStorage.getItem(key)); } catch (e) { return 0; }
    },
    // Raise-only: never lowers or resets a stored best.
    maybeUpdateHigh: function (key, v) {
      if (v > Arcade.getHigh(key)) {
        try { localStorage.setItem(key, String(v)); } catch (e) { /* ignore */ }
      }
    },
    // Wire the shared Info modal (expects #infoBtn, #infoModal, #infoClose,
    // #highScore in the page). Shows the game's high score when opened.
    initInfoMenu: function (hsKey) {
      var infoBtn = document.getElementById('infoBtn');
      var infoModal = document.getElementById('infoModal');
      var infoClose = document.getElementById('infoClose');
      var highScoreEl = document.getElementById('highScore');
      if (!infoBtn || !infoModal) return;
      infoBtn.addEventListener('click', function () {
        if (highScoreEl) highScoreEl.textContent = Arcade.getHigh(hsKey);
        infoModal.classList.add('show');
      });
      if (infoClose) infoClose.addEventListener('click', function () { infoModal.classList.remove('show'); });
      infoModal.addEventListener('click', function (e) {
        if (e.target === infoModal) infoModal.classList.remove('show');
      });
    }
  };

  global.Arcade = Arcade;
})(window);
