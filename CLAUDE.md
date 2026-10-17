# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JS Tetris on HTML5 Canvas. No dependencies, no `package.json`, no build step, no linter, no test suite. Three source files: `index.html` (DOM + canvases + overlay), `style.css` (dark/retro theme), `game.js` (all logic). README and in-game UI text are in Spanish — keep user-facing strings in Spanish.

## Running

```bash
python3 -m http.server 8000   # then open http://localhost:8000
# or: open index.html
```

Verify changes by playing in the browser; there are no automated tests.

## Architecture (`game.js`)

- **Global mutable state**: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId` are module-level `let`s, (re)initialized in `init()`. `init()` is also the restart handler.
- **Board model**: `ROWS × COLS` matrix; `0` = empty, `1–7` = piece type. The value stored in `PIECES[type]` cells equals the type index, which is also the index into `COLORS` — so `merge()` copies shape values straight onto the board and rendering looks up `COLORS[value]`. Adding/reordering pieces requires keeping `PIECES`, `COLORS`, and the `* 7` in `randomPiece()` aligned.
- **Pieces** are square matrices; `current` is `{ type, shape, x, y }`. Rotation is `rotateCW` (transpose + reverse) with simple horizontal wall kicks `[0, -1, 1, -2, 2]` in `tryRotate` — not SRS.
- **`collide(shape, ox, oy)`** is the single collision primitive used for movement, rotation, gravity, ghost projection (`ghostY`), and game-over detection in `spawn()`. Cells above the board (`ny < 0`) are allowed.
- **Lock pipeline**: `lockPiece()` → `merge()` → `clearLines()` (scoring, level, `dropInterval = max(100, 1000 - (level-1)*90)`) → `spawn()` (game over if new piece collides).
- **Loop**: `requestAnimationFrame(loop)` accumulates `dt` into `dropAccum`; gravity step when `dropAccum >= dropInterval`. Pause/game over stop the loop via `cancelAnimationFrame(animId)`; resume calls `loop()` directly after resetting `lastTime`.
- **Rendering**: `draw()` redraws the full board each frame (grid, locked cells, ghost at `alpha 0.2`, current piece). `drawNext()` renders the preview on `#next-canvas` (4×4 cells of 30px) and is only called from `spawn()`. HUD DOM updates go through `updateHUD()`.

## Coupled constants

Changing `COLS`, `ROWS`, or `BLOCK` in `game.js` requires updating the `width`/`height` of `<canvas id="board">` in `index.html` (`COLS*BLOCK` × `ROWS*BLOCK`, currently 300×600). Key bindings are mirrored in the controls list in `index.html` and the README.
