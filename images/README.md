# Game thumbnails

Drop game thumbnail images here. The landing page (`index.html`) expects:

- `tic-tac-toe.png` — thumbnail for the Tic Tac Toe game
- `tetris.png` — thumbnail for the Tetris game
- `connect-4.png` — thumbnail for the Connect 4 game
- `mango.png` — thumbnail for the Mango game
- `pac-man.png` — thumbnail for the Pac-Man game
- `racing.png` — thumbnail for the Racing game
- `snakes-and-ladders.png` — thumbnail for the Snakes &amp; Ladders game

## App / web-app assets

- `banner.png` — wide 2:1 banner shown at the top of the landing page
- `poster.png` — near-square poster; source art for the square icons below
- `apple-touch-icon.png` (180×180) — iPhone home-screen icon
- `app-icon-192.png`, `app-icon-512.png` — PWA manifest icons
- `app-banner.jpg` — link-preview (og:image) banner

Square icons are `poster.png` padded on its dark background (so nothing is
cropped). Regenerate with Pillow if the source art changes.

Square images (e.g. 400×400) work best. Until an image is present, the card
shows an emoji placeholder automatically.
