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
images/
  tic-tac-toe.png        Game thumbnails (referenced by index.html)
  tetris.png
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
   `images/README.md`.

## Testing

No test runner. To sanity-check a game's JS without a browser, extract the
`<script>` and run it under Node with a minimal DOM/`canvas`/`localStorage`
stub to confirm it parses and initializes. Pure logic (e.g. the Tic Tac Toe
minimax bot) can be unit-tested in isolation the same way.

Prefer verifying real gameplay in a browser when possible.

## Hosting

GitHub Pages serves the repo root. `index.html` is the entry point; games are
at `/games/<game>.html`. No configuration or build is required.
