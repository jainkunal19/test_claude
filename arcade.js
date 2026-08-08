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

  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  var Arcade = {
    getCoins: function () {
      try { return num(localStorage.getItem(COINS_KEY)); } catch (e) { return 0; }
    },
    // Earned points accumulate across all games (spendable in the Shop).
    addCoins: function (n) {
      n = Math.round(n) || 0;
      if (n <= 0) return;
      try { localStorage.setItem(COINS_KEY, String(Arcade.getCoins() + n)); } catch (e) { /* ignore */ }
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
