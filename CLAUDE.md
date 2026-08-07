# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Alisha Arcade** — a small collection of browser games hosted as a static
site on GitHub Pages. There is no backend, build step, framework, or package
manager. Everything is plain HTML/CSS/JS served directly.

## Structure

```
index.html               Landing page — grid of game cards (the arcade)
games/
  tic-tac-toe.html       Tic Tac Toe (1-player vs bot + 2-player)
  tetris.html            Tetris
  connect-4.html         Connect 4 (1-player vs bot + 2-player)
  mango.html             Mango — pineapple laser-shooter (canvas arcade)
  pac-man.html           Pac-Man (maze, pellets, ghost AI)
images/
  tic-tac-toe.png        Game thumbnails (referenced by index.html)
  tetris.png
  connect-4.png
  mango.png
  pac-man.png
  README.md              Notes on thumbnail conventions
README.md
```

Each game is a **single self-contained `.html` file** — its CSS lives in a
`<style>` block and its JS in a `<script>` block in the same file. There are
no shared/external assets (no CSS/JS files, no CDNs). Keep it that way so each
page works standalone on GitHub Pages.

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
  (🥭, heals one heart, capped at 10), chosen by weighted random.
  **Pac-Man** stores its maze as an array of equal-length strings (`#` wall,
  `.` dot, `o` power pellet, `P` pac start, `H` ghost home); before changing
  the maze, re-validate that all rows are the same length and every pellet is
  reachable from `P` by flood fill. Entities move by tweening between tile
  centers (turns commit only at a center); ghosts chase by minimizing Manhattan
  distance to Pac and flee randomly while frightened (after a power pellet).
- **Info menu (every game).** Each game has an `ⓘ Info` button
  (`.info-btn`, floated right just after the back link) that opens a `.modal`
  / `.modal-card` overlay with two things: a static **How to Play** section
  (`.how-to`) describing the rules and controls, and a **Highest Score** read
  from `localStorage`. Reuse the shared modal CSS block and the small JS
  helper (`getHigh()` / `maybeUpdateHigh(v)`) — key storage per game as
  `<game>-highscore`. Call `maybeUpdateHigh(...)` wherever a run's result is
  known: the numeric score at game over for action games (Tetris, Mango,
  Pac-Man), or the best win tally (`Math.max(...)` of the score counters) for
  turn-based games (Tic Tac Toe, Connect 4). The modal reads the stored value
  when opened and is dismissed by its Close button or a tap on the backdrop.

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
4. Add the **Info menu** (see Conventions): copy the shared `.info-btn` /
   `.modal` CSS, the button + modal markup, and the `getHigh()` /
   `maybeUpdateHigh()` helper, then write a game-specific How-to-Play blurb,
   use the `<game>-highscore` storage key, and call `maybeUpdateHigh(...)` at
   the game's result point. Every game ships with this.

## Testing

No test runner. To sanity-check a game's JS without a browser, extract the
`<script>` and run it under Node with a minimal DOM/`canvas`/`localStorage`
stub to confirm it parses and initializes. Pure logic (e.g. the Tic Tac Toe
minimax bot) can be unit-tested in isolation the same way.

Prefer verifying real gameplay in a browser when possible.

## Hosting

GitHub Pages serves the repo root. `index.html` is the entry point; games are
at `/games/<game>.html`. No configuration or build is required.
