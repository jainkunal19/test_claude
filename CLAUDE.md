# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Alisha Arcade** — a small collection of browser games hosted as a static
site on GitHub Pages. There is no backend, build step, framework, or package
manager. Everything is plain HTML/CSS/JS served directly.

## Structure

```
index.html               Landing page — game grid + coin total + Shop link
shop.html                Shop — spend arcade coins on accessories (scaffold)
games/
  tic-tac-toe.html       Tic Tac Toe (1-player vs bot + 2-player)
  tetris.html            Tetris
  connect-4.html         Connect 4 (1-player vs bot + 2-player)
  mango.html             Mango — pineapple laser-shooter (canvas arcade)
  pac-man.html           Pac-Man (maze, pellets, ghost AI)
  racing.html            Racing (top-down race vs bot cars, placement scoring)
  snakes-and-ladders.html  Snakes & Ladders (dice race vs bot + 2-player, animated)
  blackjack.html         Blackjack (vs House/dealer bot; guided + unguided modes)
  math-runner.html       Math Runner (kids' math endless runner, monster-guarded answers)
arcade.js                Shared helpers: coin wallet, high scores, Info menu, sound FX
sw-register.js           Shared service-worker registration + update UI
images/
  tic-tac-toe.png        Game thumbnails (referenced by index.html)
  tetris.png
  connect-4.png
  mango.png
  pac-man.png
  README.md              Notes on thumbnail conventions
README.md
```

Each game is a **single `.html` file** — its CSS lives in a `<style>` block and
its game logic in a `<script>` block in the same file. The only shared code is
two small root scripts every page includes: **`arcade.js`** (coin wallet, high
scores, Info-menu wiring, and shared Web Audio sound effects `Arcade.sound`
with an arcade-wide mute — `window.Arcade`) and **`sw-register.js`** (offline
service-worker registration + update UI). No CDNs; CSS stays per-page. Games
reference the shared scripts with `../arcade.js` / `../sw-register.js` (root
pages drop the `../`), and both are precached by the service worker so offline
still works.

## Conventions

- **Design tokens.** Games share a dark theme via CSS variables in `:root`
  (`--bg`, `--panel`, `--cell`, `--accent`, `--text`, plus per-game accents
  like `--x-color`). Reuse these names when adding a game so the look stays
  consistent.
- **Back link.** Every game page has `<a class="back-link" href="../index.html">`
  back to the arcade.
- **Titles.** Game `<title>` is `"<Game> · Alisha Arcade"`.
- **Responsive & mobile.** Pages must fit on one screen without horizontal
  scroll and be playable on touch devices. Use `touch-action: manipulation`
  on buttons and lock the viewport (`maximum-scale=1.0, user-scalable=no`) to
  prevent double-tap zoom. Where a game needs input, offer both keyboard and
  on-screen controls and let the user choose (see Tetris' control toggle,
  which auto-detects touch via `navigator.maxTouchPoints`).
  **Viewport height.** Size the outer page layout (the `body`) with **`svh`**
  (small viewport height), never bare `100vh`. On iOS `100vh` is the *large*
  toolbar-hidden height — taller than what's on screen — so a centered panel
  gets pushed down and its bottom hides under the browser toolbar (fine in the
  standalone web-app, broken in Safari/Chrome). Use
  `min-height: 100vh; min-height: 100svh;` so it fills the actually-visible area
  consistently across browsers and the installed web-app.
  **Board sizing.** Prefer the shared **`Arcade.fitBoard(boxEl, { maxWidth })`**
  helper over a hand-tuned `calc(100svh - NNpx)` CSS formula: it measures the
  *actual* chrome (`panel.offsetHeight − board.offsetHeight`) and the true
  usable height (`visualViewport.height`), then sizes the board to the largest
  aspect-preserving box that fits — filling the screen consistently across
  devices and re-fitting on resize/orientation. Keep a `width: min(100%, CAP)`
  CSS fallback for first paint. Currently **piloted on Math Runner**; roll out
  to the other boards after sign-off.
- **1-player vs bot pattern.** Turn-based games (Tic Tac Toe, Connect 4)
  share a UI convention: a `.mode-select` toggle (`1 Player` / `2 Players`)
  and, in 1-player mode, a `.difficulty` toggle (`Easy` / `Medium` / `Hard`).
  The human moves first; the bot takes the second mark/color. During the
  bot's turn, set an `inputLocked` flag and show a "Bot is thinking…" status,
  then move after a short `setTimeout` so it feels natural. Scoreboard labels
  swap between "You/Bot" (1P) and the two player names (2P). Bots are
  difficulty-scaled minimax: Easy = random, Medium = mostly optimal with some
  randomness, Hard = full/deep search (Tic Tac Toe is unbeatable; Connect 4
  uses depth-limited alpha-beta with a positional heuristic).
- **Canvas action games** (Tetris, Mango) share a loop: a `requestAnimationFrame`
  update/draw cycle with delta-time (guard the first frame so `lastTime`
  isn't 0), difficulty that ramps by level, and Start / Game Over overlays
  layered over the `<canvas>` with a "Play Again" button. Keep the canvas at a
  fixed internal resolution and scale it with CSS (`height: min(px, vh)`); when
  mapping pointer input to canvas coords, divide by `getBoundingClientRect()`
  size. **Mango** is a pineapple laser-shooter: pineapples fall and the player
  taps/clicks to fire a laser (pointer input works for mouse and touch alike);
  10 hearts, −½ heart per pineapple that reaches the ground, game over at 0;
  types are regular pineapple (100), golden pineapple (1000), and a mango
  (🥭, heals one heart, capped at 10), chosen by weighted random. Spread guns
  bought from the Shop (`mango-ak47`, `mango-fire-blaster`) replace the single
  shot with a 60° cone that clears every pineapple in the arc; a weapon picker
  above the board appears when more than one gun is owned.
  **Pac-Man** stores its maze as an array of equal-length strings (`#` wall,
  `.` dot, `o` power pellet, `P` pac start, `H` ghost home); before changing
  the maze, re-validate that all rows are the same length and every pellet is
  reachable from `P` by flood fill. Entities move by tweening between tile
  centers (turns commit only at a center); ghosts chase by minimizing Manhattan
  distance to Pac and flee randomly while frightened (after a power pellet).
  **Racing** is a top-down racer: the player's car steers within the road
  (drag or ← →, ↑/↓ throttle) while bot cars race alongside; the camera follows
  the player's `progress` (world units == px), and cars are drawn relative to
  it. Touching any car crashes (game over). Crossing the finish scores by
  placement (1st = 1000, 2nd = 700, 3rd = 500, else 100) and advances a
  level that adds traffic plus `big` (slow, wide) and `aggressive` (swerve into
  the player) bot types; score accumulates across levels.
  **Snakes & Ladders** is a dice race on a 10×10 boustrophedon board (cell 1
  bottom-left) with the classic Milton-Bradley `LADDERS`/`SNAKES` maps. It has
  **no difficulty levels** — just `1 Player` (vs bot) / `2 Players` via the
  shared `.mode-select`. Each roll animates the token hopping square-by-square
  (a `sin` hop arc), then resolves a ladder climb or snake slide as an extra
  animation waypoint; you must land **exactly** on 100 (overshoot = no move) and
  a **6** grants another turn. The static board + numbers + ladders are
  pre-rendered to an offscreen canvas once; snakes are drawn live every frame
  with a time-based sine wiggle (animated). A win pays a flat **1000** (human
  wins only in 1P, either player in 2P), feeding `addCoins` and
  `maybeUpdateHigh` (`best win count × 1000`). It uses the shared
  **`Arcade.sound`** effects (dice `roll`, `step`, ladder `up`, snake `down`,
  `chime`/`buzz`, `win`/`lose`) with a 🔊/🔇 header toggle; audio is unlocked on
  the first user gesture (Start/roll).
  **Blackjack** is a single-hand card game vs the **House** (dealer bot): a full
  52-card deck (`buildDeck`/`shuffle`, reshuffled when low), `handValue` scores
  Aces as 1 or 11 (soft/hard), the dealer hides a hole card and hits until 17,
  and closest to 21 without busting wins (two-card 21 = Blackjack, pays 1.5×).
  Cards are **realistic**: number cards are HTML/CSS (corner indices + standard
  pip layouts from the `PIPS` table, lower-half pips rotated), the Ace shows a
  big center pip, and each **court card (J/Q/K) is a real per-suit image**
  (`images/court-<rank>-<suit>.png`, all 12) filling the card; a striped card
  back hides the dealer hole card. The shared `.mode-select` picks **Guided** vs **Unguided** (not 1P/2P):
  guided shows a basic-strategy hint (`suggest()` → hit/stand + reason,
  highlighting the recommended button) and pays **10** per win; unguided gives
  no help and pays **100** (`winValue()`), Blackjack `×1.5`. A win feeds
  `addCoins` and a per-session score into `maybeUpdateHigh`; switching mode
  resets the session (score/wins).
  **Math Runner** is a 3-lane endless runner for math practice: each gate poses
  a problem with one answer per lane, each guarded by a monster. The runner
  halts at every gate for a configurable *thinking time* (`timeLimit`), and
  tapping an answer commits it. A right pick slays the guard (+1 coin); a wrong
  one gets the runner bitten (−½ heart) and starts an **answer review** — the
  runner `vanished`es, the world freezes, and the correct lane stays ringed
  green with a banner for `reviewTime` seconds (settings: 3/5/8s or Off,
  default 5) before he pops back in and runs on. Both durations live in the
  `mathrunner-settings` localStorage blob alongside the per-operation
  enable/level flags. Every **`LAP_TARGET` (20) correct answers** completes a
  **lap**: once armed, a checkered finish line + a refreshment booth spawn ahead
  (after any pending gates clear and with new gates paused); crossing the line
  fires `Arcade.sound.applause()`, then the runner halts at the booth for a
  `LAP_BREAK` (5s) rest before `finishLap()` bumps the lap counter and resumes.
- **Info menu (every game).** Each game has an `ⓘ Info` button
  (`.info-btn`, floated right just after the back link) that opens a `.modal`
  / `.modal-card` overlay with two things: a static **How to Play** section
  (`.how-to`) describing the rules and controls, and a **Highest Score** read
  from `localStorage`. Reuse the shared modal CSS block, set a per-game key
  (`const HS_KEY = '<game>-highscore'`) and wire the modal with one line —
  `Arcade.initInfoMenu(HS_KEY)` (from `arcade.js`). Record results with
  `Arcade.maybeUpdateHigh(HS_KEY, v)` wherever a run's result is known: the
  numeric score at game over for action games (Tetris, Mango, Pac-Man), or the
  per-win value × the win count (`Math.max(...)` of the win counters ×
  `winValue()`) for turn-based games (Tic Tac Toe, Connect 4). A win's value is
  **difficulty-scaled** in 1-player mode — Easy **100**, Medium **1000**, Hard
  **2000** — and a flat **1000** in 2-player mode; a shared `winValue()` helper
  returns it and feeds both `addCoins` and `maybeUpdateHigh`. The modal reads the stored value when opened
  and is dismissed by its Close button or a tap on the backdrop.
  **High scores are user data.** They live in `localStorage` (separate from the
  service-worker cache, which never touches them) and persist across app/SW
  version updates. Never rename a `<game>-highscore` key and never call
  `localStorage.clear()`/`removeItem` on one — that would orphan a player's
  best. `maybeUpdateHigh` must stay raise-only (write only when the new value
  beats the stored one), so an update can never lower or reset a score.
- **Arcade wallet & Shop.** Points earned in every game accumulate into one
  global coin balance in `localStorage` under `arcade-coins` (separate from the
  per-game high scores, and — like them — never cleared by updates). Games call
  the shared `Arcade.addCoins(n)` helper when points are earned: the final score
  at game over (Tetris, Mango, Pac-Man), each placement award (Racing), or the
  difficulty-scaled `winValue()` per **human** win (Tic Tac Toe, Connect 4 —
  Easy 100 / Medium 1000 / Hard 2000 vs bot, 1000 in 2-player; guarded by
  `gameMode === 2 || winner === HUMAN` so bot wins don't pay). The landing page
  shows the total top-right and links to `shop.html`, which reads the same
  balance. New games must call `Arcade.addCoins(...)` wherever they award points.
- **Shop purchases & accessories.** Real purchases go through `Arcade.buy(id,
  cost)` → `'ok'|'owned'|'insufficient'` (spends from `arcade-coins`, records
  the id in the `arcade-owned` JSON list); check ownership with
  `Arcade.owns(id)`. Shop cards with `data-id`/`data-price` are wired up
  automatically in `shop.html`. Games read their accessories at start with
  `Arcade.owns(id)` and apply the effect. Example: Racing's `racing-front-bumper`
  / `racing-left-bumper` / `racing-right-bumper` (20000 each, bought separately) —
  each bumper absorbs a hit on its own side (`impactDir` classifies
  front/left/right/rear) without crashing, and is drawn on the car. Mango's
  `mango-ak47` / `mango-fire-blaster` (20000 each) are spread guns — each turns
  the tap-to-shoot into a 60° cone that clears the whole arc. Shop cards carry a
  one-line `.desc` blurb describing the item. Never clear `arcade-owned` or
  `arcade-coins` on an update.
- **Player name.** `Arcade.getName()` / `Arcade.setName()` store an optional
  name (`arcade-player-name`), set via the ⚙️ settings dialog on the landing
  page. Games that address the human as "You"/"Player 1" (Tic Tac Toe, Connect
  4) use it in the scoreboard labels, turn status, and win messages, falling
  back to the defaults ("You" in 1P, "Player X"/"Red" in 2P) when it's unset.
- **Sound effects.** `arcade.js` exposes **`Arcade.sound`** — a small Web Audio
  engine (all tones/noise generated at runtime, no audio files, so it works
  offline). Reusable presets any game calls: `roll`, `step`, `up`, `down`
  (a scary snake-bite/damage growl), `chime`, `buzz`, `coin`, `click`, `pop`,
  `zap`, `drop`, `crash` (a car-collision impact), `win` (an exciting rising run
  into a chord + sparkle), `lose`; plus primitives `tone(opts)` / `burst(opts)`
  / `seq(freqs, opts)` for custom sounds, and **`engine()`** which returns a
  looping engine-hum controller (`setSpeed(0..1)` revs it, `stop()` fades it
  out — Racing uses it). Everything routes through a master gain, so muting
  silences even ongoing sounds like the engine. Every effect is a safe no-op
  when muted or when Web Audio is unavailable. **Call `Arcade.sound.ensure()` from a user gesture** (Start
  button / first tap) so mobile browsers allow playback, then call the presets
  at event points (move/drop, hit, win, lose, game over). Mute is **arcade-wide**
  (`Arcade.sound.setMuted/isMuted/toggle`, persisted under `arcade-muted`):
  toggled from the landing page's ⚙️ settings dialog, and Snake & Ladders also
  has an in-game 🔊/🔇 header button. New games should wire these in.

## Adding a new game

1. Create `games/<game>.html` following an existing game as a template
   (copy the `:root` tokens, back link, and title pattern).
2. Add a card to the grid in `index.html`. Copy the commented-out card
   template near the bottom of the `<main class="games-grid">` block:
   ```html
   <a class="game-card" href="games/<game>.html">
     <div class="thumb">
       <img src="images/<game>.png" alt="<Game>"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <span class="placeholder" style="display:none;">🎮</span>
     </div>
     <span class="game-name"><Game></span>
   </a>
   ```
   The whole card (thumbnail **and** name) is one link. The `onerror`
   placeholder shows an emoji until a real thumbnail is added.
3. Drop a square thumbnail at `images/<game>.png` (~400×400) and list it in
   `images/README.md`. Cards reference `.png`; if given another format (e.g.
   `.webp`), convert it to PNG rather than changing the reference — there's no
   `convert`/`ffmpeg` here, so use Pillow (`pip install Pillow`, then
   `Image.open(src).convert('RGBA').save(dst, 'PNG')`).
4. Include the shared scripts: `<script src="../arcade.js"></script>` in
   `<head>` and `<script src="../sw-register.js"></script>` before `</body>`.
5. Add the **Info menu** (see Conventions): copy the shared `.info-btn` /
   `.modal` CSS and the button + modal markup, then write a game-specific
   How-to-Play blurb, set `const HS_KEY = '<game>-highscore'`, call
   `Arcade.initInfoMenu(HS_KEY)`, and record results with
   `Arcade.maybeUpdateHigh(HS_KEY, ...)` / `Arcade.addCoins(...)` at the game's
   result point. Every game ships with this.

## Testing

No test runner. To sanity-check a game's JS without a browser, extract the
`<script>` and run it under Node with a minimal DOM/`canvas`/`localStorage`
stub to confirm it parses and initializes. Pure logic (e.g. the Tic Tac Toe
minimax bot) can be unit-tested in isolation the same way.

Prefer verifying real gameplay in a browser when possible.

## Installable web app (PWA / offline)

The site is an installable web app: `manifest.json` + Apple/PWA meta tags in
every page's `<head>`, square icons in `images/` (`apple-touch-icon.png`,
`app-icon-192/512.png`), and a root **`service-worker.js`** that pre-caches the
whole app for offline play. Each page registers the worker with a small inline
`<script>` (root path from `index.html`, `../service-worker.js` from games).

**Version strategy (important).** Each version keeps its own cache bucket named
by `CACHE_VERSION`; on activate it deletes all other buckets, so a new version
fully replaces the old one. **Whenever you add or change any cached file (a
game/shop page, an image, the manifest), you MUST bump `CACHE_VERSION` in
`service-worker.js` and add any new file to its `ASSETS` precache list** —
otherwise clients keep serving the stale copy.

**How much to bump.** Use a minor increment for small fixes and a major
increment only for substantial changes. The version is `vMAJOR[.MINOR]`
(e.g. `alisha-arcade-v13`, `alisha-arcade-v13.1`): tweaks like a style nudge,
copy change, or bug fix bump the minor part (`v13` → `v13.1` → `v13.2`); a new
game, new feature, or other significant work bumps the major part and drops the
minor (`v13.x` → `v14`). Any bump still fully replaces the cache — the
major/minor split is just so the version number reflects the size of the change.

Updates are **user-triggered** (all handled by `sw-register.js`, shared by every
page). Each page checks for a new version at startup (`registration.update()`),
with two UX paths:
- A new version found **during this session** → a non-blocking **"Update
  available"** bar at the top (update whenever you like).
- A version already **waiting at startup** (skipped last time) → a **blocking
  modal** that asks the user to update before doing anything, with a "Not now"
  escape that drops back to the gentle bar.

Either action posts `{type:'SKIP_WAITING'}` to the waiting worker (which calls
`self.skipWaiting()`); the resulting `controllerchange` reloads onto the new
version. First install and same-version navigation never prompt (guarded by
`navigator.serviceWorker.controller`). All the update UI is built in JS, so it
needs no per-page HTML/CSS.

## Hosting

GitHub Pages serves the repo root. `index.html` is the entry point; games are
at `/games/<game>.html`. No configuration or build is required.
