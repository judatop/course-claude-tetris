'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - light blue
  '#ffb74d', // L - orange
  '#f06292', // + - pink
  '#a1887f', // U - brown
  '#aed581', // Y - lime
  '#fff59d', // MONO - pale yellow
  '#7986cb', // HOLLOW - indigo
  '#78788c', // GARBAGE - gray
  '#5c6470', // FIXED - slate
  '#ffffff', // WILD - drawn as a rainbow gradient
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // + (pentomino)
  [[9,0,9],[9,9,9],[0,0,0]],                  // U (pentomino)
  [[0,0,0,0],[10,10,10,10],[0,10,0,0],[0,0,0,0]], // Y (pentomino)
  [[11]],                                      // MONO (reward after a Tetris)
  [[12,12,12],[12,0,12],[12,12,12]],          // HOLLOW (challenge piece)
];

const STANDARD = 7; // types 1..7 are the classic tetrominoes
const T_TYPE = 3;
const MONO = 11;
const HOLLOW = 12;
const GARBAGE = 13;
const FIXED = 14;
const WILD = 15;

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [400, 800, 1200, 1600];
const LINE_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];
const PERFECT_CLEAR_BONUS = 3000;
const WILD_BONUS = 50;

const POWERS = {
  bomb:    { glyph: '✹', name: 'BOMBA' },
  ray:     { glyph: '⚡', name: 'RAYO' },
  tint:    { glyph: '◈', name: 'TINTE' },
  gravity: { glyph: '⇓', name: 'GRAVEDAD' },
  freeze:  { glyph: '❄', name: 'CONGELAR' },
};
const POWER_EVERY = 5; // lines between power-ups
const FREEZE_MS = 5000;

const MODES = {
  classic:   { name: 'Clásico' },
  sprint:    { name: 'Sprint', lines: 40, timeLimit: 120000 },
  garbage:   { name: 'Basura', survive: 180000 },
  fixed:     { name: 'Bloques fijos' },
  invisible: { name: 'Invisible', lines: 20 },
  reverse:   { name: 'Inversión', lines: 30 },
};
const GARBAGE_EVERY = 10000;
const REVERSE_LEVEL = 3;

const ABILITY_NAMES = ['VISTA +5', 'INTERCAMBIO', 'CÁMARA LENTA', 'DESHACER', 'HOLD LIBRE'];
const PREVIEW_MS = 20000;
const SLOW_MS = 10000;
const SLOW_FACTOR = 2.5;
const KICKS = [0, -1, 1, -2, 2];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const queueCanvas = document.getElementById('queue-canvas');
const queueCtx = queueCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const modeEl = document.getElementById('mode-name');
const objectiveEl = document.getElementById('objective');
const timerLabel = document.getElementById('timer-label');
const timerEl = document.getElementById('timer');
const effectsEl = document.getElementById('effects');
const soundStateEl = document.getElementById('sound-state');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const themeBtn = document.getElementById('theme-btn');
const modeBtns = document.querySelectorAll('.menu-btn');
const abilityBtns = document.querySelectorAll('.ability-btn');
const views = {
  menu: document.getElementById('view-menu'),
  pause: document.getElementById('view-pause'),
  abilities: document.getElementById('view-abilities'),
  end: document.getElementById('view-end'),
};

let board, current, queue, hold, holdUsed, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let mode = 'classic', running = false, choosing = false;
let combo, b2b, energy, linesSincePower, lastMoveRotate, undoSnapshot;
let gameTime, garbageAccum, freezeUntil, slowUntil, previewUntil, previewActive, reverseAnnounced;
let popups = [], flashes = [];
let muted = false, audioCtx = null;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// ---- Piece generation ----

function rollType() {
  const r = Math.random();
  if (r < 0.06) return 8 + Math.floor(Math.random() * 3);
  if (r < 0.08 && level >= 3) return HOLLOW;
  return Math.floor(Math.random() * STANDARD) + 1;
}

function fillQueue() {
  while (queue.length < 5) queue.push({ type: rollType(), power: null });
}

// desc = { type, power } with the power cell relative to the unrotated shape
function makePiece(desc) {
  const shape = PIECES[desc.type].map(row => [...row]);
  return {
    type: desc.type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
    power: desc.power ? { ...desc.power } : null,
    desc,
  };
}

function grantPower() {
  const desc = queue.find(d => d.type <= STANDARD && !d.power);
  if (!desc) return;
  const kinds = Object.keys(POWERS);
  const cells = [];
  PIECES[desc.type].forEach((row, r) => row.forEach((v, c) => { if (v) cells.push({ r, c }); }));
  const cell = cells[Math.floor(Math.random() * cells.length)];
  desc.power = {
    kind: kinds[Math.floor(Math.random() * kinds.length)],
    r: cell.r,
    c: cell.c,
    dir: Math.random() < 0.5 ? 'row' : 'col',
  };
}

// ---- Movement ----

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

function tryRotate() {
  const ccw = mode === 'reverse' && level >= REVERSE_LEVEL;
  const rotated = ccw ? rotateCCW(current.shape) : rotateCW(current.shape);
  for (const kick of KICKS) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      if (current.power) {
        const n = rotated.length;
        const { r, c } = current.power;
        current.power.r = ccw ? n - 1 - c : c;
        current.power.c = ccw ? r : n - 1 - r;
      }
      lastMoveRotate = true;
      return;
    }
  }
}

function move(dx) {
  if (!collide(current.shape, current.x + dx, current.y)) {
    current.x += dx;
    lastMoveRotate = false;
  }
}

// Returns false if part of the piece locked above the board (lock out)
function merge() {
  let inside = true;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        if (current.y + r < 0) { inside = false; continue; }
        board[current.y + r][current.x + c] = current.shape[r][c];
      }
  return inside;
}

function isTSpin() {
  if (current.type !== T_TYPE || !lastMoveRotate) return false;
  let filled = 0;
  for (const [r, c] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
    const x = current.x + c, y = current.y + r;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) filled++;
  }
  return filled >= 3;
}

// ---- Power-ups ----

function applyPower(pr, pc, power) {
  switch (power.kind) {
    case 'bomb':
      for (let r = pr - 1; r <= pr + 1; r++)
        for (let c = pc - 1; c <= pc + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      addFlash(pc - 1, pr - 1, 3, 3);
      break;
    case 'ray':
      if (power.dir === 'row') {
        board[pr].fill(0);
        addFlash(0, pr, COLS, 1);
      } else {
        for (let r = 0; r < ROWS; r++) board[r][pc] = 0;
        addFlash(pc, 0, 1, ROWS);
      }
      break;
    case 'tint': {
      const counts = {};
      for (const row of board)
        for (const v of row)
          if (v && v <= HOLLOW) counts[v] = (counts[v] || 0) + 1;
      let best = 0, bestCount = 0;
      for (const [v, n] of Object.entries(counts))
        if (n > bestCount) { best = Number(v); bestCount = n; }
      for (const row of board)
        for (let c = 0; c < COLS; c++)
          if (best && row[c] === best) row[c] = WILD;
      addFlash(0, 0, COLS, ROWS);
      break;
    }
    case 'gravity':
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = ROWS - 1; r >= 0; r--) if (board[r][c]) col.push(board[r][c]);
        for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) board[r][c] = col[i] || 0;
      }
      addFlash(0, 0, COLS, ROWS);
      break;
    case 'freeze':
      freezeUntil = gameTime + FREEZE_MS;
      break;
  }
  addPopup(POWERS[power.kind].name, '#ffffff');
  sfx('power');
}

// ---- Line clears and scoring ----

function clearLines(tspin) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      addFlash(0, r - cleared, COLS, 1);
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    combo++;
    const difficult = cleared >= 4 || tspin;
    const isB2B = difficult && b2b;
    let base = tspin ? TSPIN_SCORES[Math.min(cleared, 3)] : LINE_SCORES[Math.min(cleared, 4)];
    if (isB2B) base *= 1.5;
    b2b = difficult;
    score += Math.round(base * level * combo);
    energy = Math.min(100, energy + cleared * 10 + (cleared >= 4 ? 10 : 0));

    addPopup((isB2B ? 'B2B ' : '') + (tspin ? 'T-SPIN ' : '') + LINE_NAMES[Math.min(cleared, 4)], '#4dd0e1');
    if (combo > 1) addPopup(`COMBO x${combo}`, '#ffd54f');

    // wildcards dissolve on the next clear
    let wild = 0;
    for (const row of board)
      for (let c = 0; c < COLS; c++)
        if (row[c] === WILD) { row[c] = 0; wild++; }
    if (wild) {
      score += wild * WILD_BONUS * level;
      addPopup(`COMODINES +${wild}`, '#ba68c8');
    }

    if (board.every(row => row.every(v => v === 0))) {
      score += PERFECT_CLEAR_BONUS * level;
      addPopup('PERFECT CLEAR', '#81c784');
      sfx('perfect');
    } else {
      sfx(difficult ? 'tetris' : 'clear', combo);
    }

    if (cleared >= 4) queue.unshift({ type: MONO, power: null });
    linesSincePower += cleared;
    if (linesSincePower >= POWER_EVERY) {
      linesSincePower -= POWER_EVERY;
      grantPower();
    }

    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (mode === 'reverse' && level >= REVERSE_LEVEL && !reverseAnnounced) {
      reverseAnnounced = true;
      addPopup('¡ROTACIÓN INVERTIDA!', '#e57373');
    }
  } else {
    combo = 0;
    if (tspin) {
      score += TSPIN_SCORES[0] * level;
      addPopup('T-SPIN', '#ba68c8');
      sfx('tspin');
    }
  }
  updateHUD();
  checkObjectives();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  if (gy > current.y) lastMoveRotate = false;
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastMoveRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  undoSnapshot = {
    board: board.map(row => [...row]),
    score, lines, level, dropInterval, combo, b2b, linesSincePower,
    queue: queue.map(d => ({ ...d })),
    hold,
    piece: current.desc,
  };
  const tspin = isTSpin();
  if (!merge()) {
    endGame(false);
    return;
  }
  if (current.power) applyPower(current.y + current.power.r, current.x + current.power.c, current.power);
  clearLines(tspin);
  if (gameOver) return;
  spawn();
}

function spawnPiece(desc) {
  current = makePiece(desc);
  lastMoveRotate = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame(false);
  }
}

function spawn() {
  spawnPiece(queue.shift());
  fillQueue();
  holdUsed = false;
  drawNext();
  drawHold();
}

function holdPiece() {
  if (holdUsed) return;
  const desc = current.desc;
  if (hold) {
    spawnPiece(hold);
  } else {
    spawnPiece(queue.shift());
    fillQueue();
    drawNext();
  }
  hold = desc;
  holdUsed = true;
  drawHold();
  sfx('hold');
}

// ---- Challenge modes ----

function seedFixedBlocks() {
  for (let r = ROWS - 8; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) board[r][c] = Math.random() < 0.35 ? FIXED : 0;
    if (board[r].every(v => v)) board[r][Math.floor(Math.random() * COLS)] = 0;
  }
  if (countFixed() === 0) board[ROWS - 1][0] = FIXED;
}

function countFixed() {
  let n = 0;
  for (const row of board)
    for (const v of row)
      if (v === FIXED) n++;
  return n;
}

function addGarbageRow() {
  if (board[0].some(v => v)) {
    endGame(false);
    return;
  }
  board.shift();
  const row = new Array(COLS).fill(GARBAGE);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  if (collide(current.shape, current.x, current.y)) {
    current.y--;
    if (collide(current.shape, current.x, current.y)) endGame(false);
  }
  sfx('garbage');
}

function checkObjectives() {
  if (gameOver || !running) return;
  const m = MODES[mode];
  if (m.lines && lines >= m.lines) endGame(true);
  else if (mode === 'fixed' && countFixed() === 0) endGame(true);
  else if (m.survive && gameTime >= m.survive) endGame(true);
  else if (m.timeLimit && gameTime >= m.timeLimit) endGame(false, 'TIEMPO AGOTADO');
}

function objectiveText() {
  const m = MODES[mode];
  if (m.lines) return `${lines}/${m.lines} líneas`;
  if (m.survive) return `Sobrevive ${formatTime(m.survive)}`;
  if (mode === 'fixed') return `Quedan ${countFixed()} bloques fijos`;
  return 'Partida libre';
}

// ---- Abilities ----

function openAbilities() {
  if (energy < 100) return;
  choosing = true;
  cancelAnimationFrame(animId);
  abilityBtns.forEach(btn => { btn.disabled = btn.dataset.ability === '3' && !undoSnapshot; });
  showOverlay('abilities');
}

function closeAbilities() {
  choosing = false;
  if (gameOver) return;
  showOverlay(null);
  lastTime = performance.now();
  loop(lastTime);
}

function useAbility(i) {
  if (i === 3 && !undoSnapshot) return;
  let ok = true;
  switch (i) {
    case 0: previewUntil = gameTime + PREVIEW_MS; break;
    case 1: ok = swapPiece(); break;
    case 2: slowUntil = gameTime + SLOW_MS; break;
    case 3: undoLast(); break;
    case 4: holdUsed = false; break;
  }
  if (ok) {
    energy = 0;
    addPopup(ABILITY_NAMES[i], '#ffd54f');
    sfx('ability');
  } else {
    addPopup('NO CABE', '#e57373');
  }
  updateHUD();
  drawNext();
  drawHold();
  closeAbilities();
}

function swapPiece() {
  let type;
  do { type = Math.floor(Math.random() * STANDARD) + 1; } while (type === current.type);
  const piece = makePiece({ type, power: null });
  for (const kick of KICKS) {
    if (!collide(piece.shape, current.x + kick, current.y)) {
      piece.x = current.x + kick;
      piece.y = current.y;
      current = piece;
      lastMoveRotate = false;
      return true;
    }
  }
  return false;
}

function undoLast() {
  const s = undoSnapshot;
  undoSnapshot = null;
  board = s.board;
  ({ score, lines, level, dropInterval, combo, b2b, linesSincePower, queue, hold } = s);
  spawnPiece(s.piece);
  holdUsed = false;
}

// ---- HUD ----

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function secondsLeft(until) {
  return `${Math.ceil((until - gameTime) / 1000)}s`;
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `x${combo}` : '—';
  energyFill.style.width = `${energy}%`;
  energyBar.classList.toggle('ready', energy >= 100);
  objectiveEl.textContent = objectiveText();
}

// Per-frame HUD: timer and active effects
function updateStatus() {
  const m = MODES[mode];
  const limit = m.timeLimit || m.survive;
  timerLabel.textContent = limit ? 'RESTANTE' : 'TIEMPO';
  timerEl.textContent = limit ? formatTime(Math.max(0, limit - gameTime) + 999) : formatTime(gameTime);

  const fx = [];
  if (gameTime < freezeUntil) fx.push(`❄ Congelado ${secondsLeft(freezeUntil)}`);
  if (gameTime < slowUntil) fx.push(`⏳ Lento ${secondsLeft(slowUntil)}`);
  if (gameTime < previewUntil) fx.push(`◉ Vista+ ${secondsLeft(previewUntil)}`);
  if (mode === 'reverse' && level >= REVERSE_LEVEL) fx.push('↺ Rotación invertida');
  const text = fx.join('\n') || '—';
  if (effectsEl.textContent !== text) effectsEl.textContent = text;
}

// ---- Rendering ----

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  if (colorIndex === WILD) {
    const g = context.createLinearGradient(x * size, y * size, (x + 1) * size, (y + 1) * size);
    const stops = ['#e57373', '#ffd54f', '#81c784', '#4dd0e1', '#ba68c8'];
    stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
    context.fillStyle = g;
  } else {
    context.fillStyle = COLORS[colorIndex];
  }
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (colorIndex === FIXED) {
    const p = size * 0.25;
    context.strokeStyle = 'rgba(0,0,0,0.4)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x * size + p, y * size + p);
    context.lineTo((x + 1) * size - p, (y + 1) * size - p);
    context.moveTo((x + 1) * size - p, y * size + p);
    context.lineTo(x * size + p, (y + 1) * size - p);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawGlyph(context, x, y, power, size) {
  const glyph = power.kind === 'ray' ? (power.dir === 'row' ? '↔' : '↕') : POWERS[power.kind].glyph;
  context.fillStyle = '#111';
  context.font = `bold ${Math.floor(size * 0.6)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(glyph, x * size + size / 2, y * size + size / 2 + 1);
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function addFlash(x, y, w, h) {
  flashes.push({ x, y, w, h, t0: performance.now() });
}

function addPopup(text, color) {
  popups.push({ text, color, t0: performance.now() });
}

function drawEffects() {
  const now = performance.now();
  flashes = flashes.filter(f => now - f.t0 < 200);
  ctx.fillStyle = '#ffffff';
  for (const f of flashes) {
    ctx.globalAlpha = 0.6 * (1 - (now - f.t0) / 200);
    ctx.fillRect(f.x * BLOCK, f.y * BLOCK, f.w * BLOCK, f.h * BLOCK);
  }

  popups = popups.filter(p => now - p.t0 < 1200);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  popups.forEach((p, i) => {
    const k = (now - p.t0) / 1200;
    const y = canvas.height / 2 - 60 + i * 28 - k * 40;
    ctx.globalAlpha = 1 - k;
    ctx.strokeText(p.text, canvas.width / 2, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, canvas.width / 2, y);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  const invisible = mode === 'invisible' && !gameOver;

  // board
  if (!invisible)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!current) return;

  // ghost
  if (!invisible) {
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  }

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.power)
    drawGlyph(ctx, current.x + current.power.c, current.y + current.power.r, current.power, BLOCK);

  drawEffects();
}

// Draws a piece centered in a 4×4 box whose top-left cell is (offX, offY)
function drawPiecePreview(context, desc, offX, offY, size) {
  const shape = PIECES[desc.type];
  const ox = offX + Math.floor((4 - shape[0].length) / 2);
  const oy = offY + Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, ox + c, oy + r, shape[r][c], size);
  if (desc.power) drawGlyph(context, ox + desc.power.c, oy + desc.power.r, desc.power, size);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPiecePreview(nextCtx, queue[0], 0, 0, 30);

  previewActive = gameTime < previewUntil;
  queueCanvas.classList.toggle('hidden', !previewActive);
  queueCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
  if (previewActive)
    queue.slice(1, 5).forEach((d, i) => drawPiecePreview(queueCtx, d, (i % 2) * 4, Math.floor(i / 2) * 4, 15));
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (hold) drawPiecePreview(holdCtx, hold, 0, 0, 30);
  holdCanvas.classList.toggle('locked', holdUsed);
}

// ---- Sound ----

function ensureAudio() {
  if (audioCtx || muted) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio no disponible */ }
}

function tone(freq, dur, type = 'square', delay = 0) {
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

function sfx(name, chain = 1) {
  if (muted || !audioCtx) return;
  const pitch = Math.pow(2, Math.min(chain - 1, 12) / 12); // rises with the combo
  switch (name) {
    case 'clear': tone(330 * pitch, 0.12); tone(495 * pitch, 0.12, 'square', 0.08); break;
    case 'tetris': [523, 659, 784, 1047].forEach((f, i) => tone(f * pitch, 0.12, 'square', i * 0.07)); break;
    case 'tspin': tone(392, 0.1, 'triangle'); tone(784, 0.15, 'triangle', 0.08); break;
    case 'perfect': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'triangle', i * 0.08)); break;
    case 'power': tone(220, 0.25, 'sawtooth'); tone(110, 0.3, 'sawtooth', 0.05); break;
    case 'hold': tone(600, 0.05, 'triangle'); break;
    case 'ability': tone(880, 0.1, 'sine'); tone(1320, 0.15, 'sine', 0.08); break;
    case 'garbage': tone(90, 0.15, 'sawtooth'); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.12)); break;
    case 'gameover': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', i * 0.15)); break;
  }
}

function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) { /* almacenamiento no disponible */ }
  if (!muted) ensureAudio();
  soundStateEl.textContent = muted ? 'off' : 'on';
}

function initialMute() {
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) { /* ignorar */ }
  soundStateEl.textContent = muted ? 'off' : 'on';
}

// ---- Game state ----

function showOverlay(view) {
  for (const [name, el] of Object.entries(views)) el.classList.toggle('hidden', name !== view);
  overlay.classList.toggle('hidden', !view);
}

function showMenu() {
  running = false;
  cancelAnimationFrame(animId);
  showOverlay('menu');
}

function endGame(win, reason = 'GAME OVER') {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = win ? '¡DESAFÍO SUPERADO!' : reason;
  overlayTitle.classList.toggle('success', win);
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Tiempo: ${formatTime(gameTime)}`;
  showOverlay('end');
  sfx(win ? 'win' : 'gameover');
  draw();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'light' ? 'Tema oscuro' : 'Tema claro';
  if (current) {
    draw();
    drawNext();
    drawHold();
  }
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', theme); } catch (e) { /* almacenamiento no disponible */ }
  applyTheme(theme);
}

function initialTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* ignorar */ }
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function togglePause() {
  if (!running || gameOver || choosing) return;
  paused = !paused;
  if (!paused) {
    showOverlay(null);
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showOverlay('pause');
  }
}

function loop(ts) {
  const dt = Math.max(0, Math.min(ts - lastTime, 250));
  lastTime = ts;
  gameTime += dt;

  // freeze stops gravity; slow stretches the interval
  if (gameTime < freezeUntil) dropAccum = 0;
  else dropAccum += dt;
  const interval = gameTime < slowUntil ? dropInterval * SLOW_FACTOR : dropInterval;
  if (dropAccum >= interval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastMoveRotate = false;
    } else {
      lockPiece();
    }
  }

  if (mode === 'garbage' && !gameOver) {
    garbageAccum += dt;
    if (garbageAccum >= GARBAGE_EVERY) {
      garbageAccum -= GARBAGE_EVERY;
      addGarbageRow();
    }
  }

  if (previewActive !== gameTime < previewUntil) drawNext();
  checkObjectives();
  updateStatus();
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init(newMode = mode) {
  mode = newMode;
  board = createBoard();
  if (mode === 'fixed') seedFixedBlocks();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  running = true;
  choosing = false;
  combo = 0;
  b2b = false;
  energy = 0;
  linesSincePower = 0;
  lastMoveRotate = false;
  undoSnapshot = null;
  gameTime = 0;
  garbageAccum = 0;
  freezeUntil = 0;
  slowUntil = 0;
  previewUntil = 0;
  reverseAnnounced = false;
  popups = [];
  flashes = [];
  hold = null;
  holdUsed = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  queue = [];
  fillQueue();
  modeEl.textContent = MODES[mode].name;
  spawn();
  updateHUD();
  updateStatus();
  showOverlay(null);
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  ensureAudio();
  if (e.code === 'KeyT') { toggleTheme(); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (choosing) {
    if (e.code === 'Escape') closeAbilities();
    else if (/^Digit[1-5]$/.test(e.code)) useAbility(Number(e.code.slice(5)) - 1);
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (!running || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      move(-1);
      break;
    case 'ArrowRight':
      move(1);
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
    case 'KeyE':
      openAbilities();
      break;
  }
  updateHUD();
});

modeBtns.forEach(btn => btn.addEventListener('click', () => {
  btn.blur();
  init(btn.dataset.mode);
}));
abilityBtns.forEach(btn => btn.addEventListener('click', () => {
  btn.blur();
  useAbility(Number(btn.dataset.ability));
}));
restartBtn.addEventListener('click', () => {
  restartBtn.blur();
  init();
});
menuBtn.addEventListener('click', () => {
  menuBtn.blur();
  showMenu();
});
themeBtn.addEventListener('click', () => {
  toggleTheme();
  themeBtn.blur();
});

initialMute();
applyTheme(initialTheme());
board = createBoard();
draw();
showMenu();
