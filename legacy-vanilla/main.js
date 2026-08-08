// Marmor — a Color-Lines-style marble puzzle
// Vanilla JS, no build step required.

const SIZE = 9;
const COLORS = 7;
const LINE_MIN = 5;
const SPAWN_COUNT = 3;

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const nextPreviewEl = document.getElementById("next-preview");
const gameoverEl = document.getElementById("gameover");
const gameoverScoreEl = document.getElementById("gameover-score");

const BEST_KEY = "marmor.bestScore";

function safeGetBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

function safeSetBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage unavailable (e.g. restricted file:// context) — best score
    // just won't persist across reloads. Not fatal.
  }
}

/** @type {(number|null)[][]} */
let grid = [];
let selected = null; // {r,c}
let score = 0;
let best = safeGetBest();
let nextQueue = [];
let busy = false; // true while an animation is playing
let cellEls = [];

function init() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  score = 0;
  selected = null;
  busy = false;
  nextQueue = randomColors(SPAWN_COUNT);
  buildBoardDom();
  updateScore();
  bestEl.textContent = String(best);
  gameoverEl.classList.add("hidden");
  spawnBalls(5, true);
  renderNextPreview();
}

function buildBoardDom() {
  boardEl.innerHTML = "";
  cellEls = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
      row.push(cell);
    }
    cellEls.push(row);
  }
}

function randomColors(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * COLORS));
}

function emptyCells() {
  const out = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === null) out.push({ r, c });
  return out;
}

function renderNextPreview() {
  nextPreviewEl.innerHTML = "";
  for (const color of nextQueue) {
    const m = document.createElement("div");
    m.className = `marble c${color}`;
    nextPreviewEl.appendChild(m);
  }
}

function renderCell(r, c) {
  const cell = cellEls[r][c];
  cell.innerHTML = "";
  const color = grid[r][c];
  if (color !== null) {
    const marble = document.createElement("div");
    marble.className = `marble c${color}`;
    cell.appendChild(marble);
  }
}

function renderAll() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) renderCell(r, c);
}

/** Spawn `count` balls from the current preview queue (topping up with fresh
 * random colors if the queue is short), then check for any lines the new
 * balls complete. Returns true if the game is now over (board full). */
function spawnBalls(count, isInitial = false) {
  const free = emptyCells();
  const toPlace = Math.min(count, free.length);
  const placed = [];

  for (let i = 0; i < toPlace; i++) {
    const idx = Math.floor(Math.random() * free.length);
    const { r, c } = free.splice(idx, 1)[0];
    const color = isInitial
      ? Math.floor(Math.random() * COLORS)
      : nextQueue[i] ?? Math.floor(Math.random() * COLORS);
    grid[r][c] = color;
    placed.push({ r, c });
  }

  renderAll();
  placed.forEach(({ r, c }) => bump(r, c));

  if (!isInitial) {
    nextQueue = randomColors(SPAWN_COUNT);
    renderNextPreview();
  }

  // Balls that land already forming a line clear immediately (classic rule).
  const matched = new Set();
  for (const { r, c } of placed) {
    findLinesThrough(r, c).forEach((cell) => matched.add(`${cell.r},${cell.c}`));
  }

  if (matched.size > 0) {
    const cells = [...matched].map((k) => {
      const [r, c] = k.split(",").map(Number);
      return { r, c };
    });
    clearCells(cells);
  }

  if (emptyCells().length === 0) {
    endGame();
    return true;
  }
  return false;
}

function bump(r, c) {
  const marble = cellEls[r][c].querySelector(".marble");
  if (marble) marble.classList.add("spawned");
}

/** BFS shortest path between two cells through empty cells only (4-directional). */
function findPath(from, to) {
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const prev = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const queue = [from];
  visited[from.r][from.c] = true;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    const cur = queue.shift();
    if (cur.r === to.r && cur.c === to.c) break;
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (visited[nr][nc]) continue;
      if (grid[nr][nc] !== null) continue;
      visited[nr][nc] = true;
      prev[nr][nc] = cur;
      queue.push({ r: nr, c: nc });
    }
  }

  if (!visited[to.r][to.c]) return null;

  const path = [];
  let cur = to;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur.r][cur.c];
  }
  return path;
}

/** Returns the set of cells forming a line of >= LINE_MIN through (r, c),
 * across all four directions (—, |, \, /), unioned. */
function findLinesThrough(r, c) {
  const color = grid[r][c];
  if (color === null) return [];
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  const result = new Map();

  for (const [dr, dc] of directions) {
    const line = [{ r, c }];
    let nr = r + dr,
      nc = c + dc;
    while (inBounds(nr, nc) && grid[nr][nc] === color) {
      line.push({ r: nr, c: nc });
      nr += dr;
      nc += dc;
    }
    nr = r - dr;
    nc = c - dc;
    while (inBounds(nr, nc) && grid[nr][nc] === color) {
      line.unshift({ r: nr, c: nc });
      nr -= dr;
      nc -= dc;
    }
    if (line.length >= LINE_MIN) {
      for (const cell of line) result.set(`${cell.r},${cell.c}`, cell);
    }
  }

  return [...result.values()];
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function clearCells(cells) {
  for (const { r, c } of cells) {
    const marble = cellEls[r][c].querySelector(".marble");
    if (marble) marble.classList.add("popping");
  }
  const points = scoreForClear(cells.length);
  score += points;
  updateScore();

  setTimeout(() => {
    for (const { r, c } of cells) grid[r][c] = null;
    renderAll();
  }, 260);
}

function scoreForClear(n) {
  // Base 2 points per marble, escalating bonus for longer lines.
  return n * 2 + Math.max(0, n - LINE_MIN) * 3;
}

function updateScore() {
  scoreEl.textContent = String(score);
  if (score > best) {
    best = score;
    bestEl.textContent = String(best);
    safeSetBest(best);
  }
}

async function onCellClick(r, c) {
  if (busy) return;

  const occupied = grid[r][c] !== null;

  if (selected && !occupied) {
    const path = findPath(selected, { r, c });
    clearSelection();
    if (!path) return; // no reachable route — ignore click
    await animateMove(path);
    return;
  }

  if (occupied) {
    clearSelection();
    selected = { r, c };
    cellEls[r][c].classList.add("selected");
    return;
  }

  clearSelection();
}

function clearSelection() {
  if (selected) cellEls[selected.r][selected.c].classList.remove("selected");
  selected = null;
}

async function animateMove(path) {
  busy = true;
  const from = path[0];
  const to = path[path.length - 1];
  const color = grid[from.r][from.c];

  grid[from.r][from.c] = null;
  renderCell(from.r, from.c);

  // Step the marble along the path for a simple glide feel.
  for (let i = 1; i < path.length; i++) {
    const step = path[i];
    cellEls[step.r][step.c].innerHTML = "";
    const marble = document.createElement("div");
    marble.className = `marble c${color} moving`;
    cellEls[step.r][step.c].appendChild(marble);
    await sleep(path.length > 12 ? 12 : 28);
    if (i !== path.length - 1) cellEls[step.r][step.c].innerHTML = "";
  }

  grid[to.r][to.c] = color;
  renderCell(to.r, to.c);

  const lineMatches = findLinesThrough(to.r, to.c);
  if (lineMatches.length > 0) {
    clearCells(lineMatches);
    busy = false;
    return;
  }

  busy = false;
  spawnBalls(SPAWN_COUNT);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function endGame() {
  gameoverScoreEl.textContent = `You scored ${score} points.`;
  gameoverEl.classList.remove("hidden");
}

document.getElementById("new-game-btn").addEventListener("click", init);
document.getElementById("restart-btn").addEventListener("click", init);

init();
