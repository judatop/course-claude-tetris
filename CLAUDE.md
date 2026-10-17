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

- **Global mutable state**: board/piece state (`board`, `current`, `queue`, `hold`, `holdUsed`), scoring (`score`, `lines`, `level`, `combo`, `b2b`, `energy`), timers (`gameTime`, `freezeUntil`, `slowUntil`, `previewUntil`, `garbageAccum`), and flags (`paused`, `gameOver`, `running`, `choosing`) are module-level `let`s, (re)initialized in `init(mode)`. `init()` with no argument restarts the current `mode`. On load the game shows the mode menu (`showMenu()`), not a running game.
- **Board model**: `ROWS × COLS` matrix; `0` = empty. Cell values: `1–7` tetrominoes, `8–10` pentominoes (+, U, Y), `11` MONO, `12` HOLLOW, and board-only `13` GARBAGE, `14` FIXED, `15` WILD (rainbow, drawn specially in `drawBlock`). The value stored in `PIECES[type]` cells equals the type index, which is also the index into `COLORS`. Keep `PIECES`, `COLORS`, the named constants, and `rollType()` aligned.
- **Pieces**: `queue` holds descriptors `{ type, power }`, where `power` = `{ kind, r, c, dir }` is relative to the unrotated shape. `makePiece(desc)` builds `current` = `{ type, shape, x, y, power, desc }`. `current.power` rotates with the shape in `tryRotate`; `desc` is what Hold and undo keep. Rotation is `rotateCW` (or `rotateCCW` in reverse mode at level ≥ 3) with horizontal kicks `KICKS` — not SRS.
- **`collide(shape, ox, oy)`** is the single collision primitive used for movement, rotation, gravity, ghost projection (`ghostY`), swap, garbage push, and game-over detection in `spawnPiece()`. Cells above the board (`ny < 0`) are allowed. `merge()` returns false on lock-out above the board.
- **Lock pipeline**: `lockPiece()` runs these steps in order:
  1. Save `undoSnapshot`.
  2. `isTSpin()`, before merging.
  3. `merge()`.
  4. `applyPower()`, if the piece has a power.
  5. `clearLines(tspin)`: combo/B2B/T-spin/perfect-clear scoring, energy, wildcard dissolve, MONO reward, power-up grant every `POWER_EVERY` lines, level/`dropInterval`, then `checkObjectives()`.
  6. `spawn()`, which resets `holdUsed`.
- **Loop**: `requestAnimationFrame(loop)` clamps `dt`, accumulates `gameTime` (all ability/power timers and mode clocks use it, so pause doesn't consume them) and `dropAccum` (zeroed while frozen; interval ×`SLOW_FACTOR` while slowed). Pause, the ability chooser, and game over stop the loop via `cancelAnimationFrame(animId)`; resume calls `loop()` directly after resetting `lastTime`.
- **Overlay**: `showOverlay(view)` switches between `menu` / `pause` / `abilities` / `end`; `null` hides it.
- **Rendering**: `draw()` redraws the full board each frame (grid, locked cells, ghost at `alpha 0.2`, current piece + power glyph, then `drawEffects()` for flashes and popups). Invisible mode hides locked cells and the ghost until game over. `drawNext()` / `drawHold()` use `drawPiecePreview()`. HUD DOM updates go through `updateHUD()`; per-frame timer/effects go through `updateStatus()`. Sound is WebAudio oscillators in `sfx()`, with mute persisted in `localStorage`.

## Coupled constants

Changing `COLS`, `ROWS`, or `BLOCK` in `game.js` requires updating the `width`/`height` of `<canvas id="board">` in `index.html` (`COLS*BLOCK` × `ROWS*BLOCK`, currently 300×600). Key bindings are mirrored in the controls list in `index.html` and the README. Abilities are indexed 0–4 in `useAbility()`, `ABILITY_NAMES`, and the `data-ability` buttons in `index.html`. Modes are keyed the same in `MODES` and the `data-mode` buttons.
