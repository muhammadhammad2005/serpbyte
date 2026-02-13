const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const scoreEl = document.getElementById("score");
const appleCountEl = document.getElementById("appleCount");
const statusTextEl = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");
const difficultySelect = document.getElementById("difficultySelect");
const startOverlayEl = document.getElementById("startOverlay");
const playBtn = document.getElementById("playBtn");
const gameStageEl = document.querySelector(".game-stage");
const wheelBase = document.getElementById("wheelBase");
const wheelKnob = document.getElementById("wheelKnob");

const cellSize = 24;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
const difficultySpeeds = {
  low: 130,
  medium: 95,
  high: 70,
};
let stepDurationMs = difficultySpeeds.medium;

let score = 0;
let appleCount = 0;
let snake = [];
let previousSnake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let gameOver = false;
let gameStarted = false;
let awaitingFirstMove = true;
let elapsedMs = 0;
let lastTimestamp = 0;
let wallFlashEndTime = 0;
let selfBiteEffect = null;
let filteredHeadAngle = null;
let renderPointsCache = [];

const snakePalette = {
  headBase: "#1d4cc2",
  headShadow: "#12378f",
  headHighlight: "#6f9cff",
  bodyTop: "#2c66dd",
  bodyMid: "#1d4fcb",
  bodyBottom: "#133b9a",
  bellyCore: "#7da8ff",
  bellyEdge: "#4f7cdd",
  hoodLight: "rgba(122, 159, 255, 0.24)",
  hoodDark: "rgba(24, 69, 165, 0.28)",
  tailBase: "#143f9f",
  tailHighlight: "#3f73e2",
};

const backgroundLayer = document.createElement("canvas");
backgroundLayer.width = canvas.width;
backgroundLayer.height = canvas.height;
const bgCtx = backgroundLayer.getContext("2d", { alpha: false });
const appleSprite = createAppleSprite(256);

function buildGrassBackground() {
  const w = backgroundLayer.width;
  const h = backgroundLayer.height;
  bgCtx.clearRect(0, 0, w, h);
  const light = "#a9cd5a";
  const dark = "#a3c752";

  const colsCount = Math.ceil(w / cellSize);
  const rowsCount = Math.ceil(h / cellSize);

  for (let row = 0; row < rowsCount; row += 1) {
    for (let col = 0; col < colsCount; col += 1) {
      bgCtx.fillStyle = (row + col) % 2 === 0 ? light : dark;
      bgCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }
}

function createAppleSprite(size) {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const sctx = sprite.getContext("2d");
  const c = size / 2;
  const r = size * 0.34;

  sctx.save();
  sctx.translate(c, c + size * 0.02);

  const bodyGradient = sctx.createRadialGradient(-r * 0.28, -r * 0.34, r * 0.2, 0, 0, r * 1.12);
  bodyGradient.addColorStop(0, "#ff9468");
  bodyGradient.addColorStop(0.35, "#f46a37");
  bodyGradient.addColorStop(0.7, "#d64922");
  bodyGradient.addColorStop(1, "#98290f");
  sctx.fillStyle = bodyGradient;
  sctx.beginPath();
  sctx.moveTo(0, -r * 1.02);
  sctx.bezierCurveTo(r * 0.94, -r * 0.95, r * 1.2, r * 0.1, r * 0.22, r * 1.06);
  sctx.bezierCurveTo(r * 0.05, r * 1.2, -r * 0.05, r * 1.2, -r * 0.22, r * 1.06);
  sctx.bezierCurveTo(-r * 1.2, r * 0.1, -r * 0.94, -r * 0.95, 0, -r * 1.02);
  sctx.fill();

  const ridgeGradient = sctx.createLinearGradient(0, -r, 0, r);
  ridgeGradient.addColorStop(0, "rgba(255, 213, 170, 0.42)");
  ridgeGradient.addColorStop(1, "rgba(255, 213, 170, 0)");
  sctx.strokeStyle = ridgeGradient;
  sctx.lineWidth = size * 0.025;
  sctx.beginPath();
  sctx.moveTo(-r * 0.1, -r * 0.78);
  sctx.quadraticCurveTo(r * 0.03, 0, -r * 0.16, r * 0.84);
  sctx.stroke();

  sctx.globalAlpha = 0.22;
  sctx.fillStyle = "#ffd3b5";
  for (let i = 0; i < 9; i += 1) {
    const a = (Math.PI * 2 * i) / 9;
    sctx.beginPath();
    sctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.45, r * 0.05, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.globalAlpha = 1;

  sctx.fillStyle = "rgba(255, 245, 236, 0.75)";
  sctx.beginPath();
  sctx.ellipse(-r * 0.35, -r * 0.32, r * 0.24, r * 0.19, -0.35, 0, Math.PI * 2);
  sctx.fill();
  sctx.beginPath();
  sctx.ellipse(-r * 0.18, -r * 0.52, r * 0.11, r * 0.07, -0.35, 0, Math.PI * 2);
  sctx.fill();

  sctx.strokeStyle = "#6f492a";
  sctx.lineWidth = size * 0.028;
  sctx.lineCap = "round";
  sctx.beginPath();
  sctx.moveTo(0, -r * 1.02);
  sctx.quadraticCurveTo(r * 0.04, -r * 1.37, r * 0.23, -r * 1.55);
  sctx.stroke();

  const leafGradient = sctx.createLinearGradient(r * 0.22, -r * 1.5, r * 0.72, -r * 1.18);
  leafGradient.addColorStop(0, "#9af86a");
  leafGradient.addColorStop(0.55, "#56c645");
  leafGradient.addColorStop(1, "#2f8f33");
  sctx.fillStyle = leafGradient;
  sctx.beginPath();
  sctx.ellipse(r * 0.52, -r * 1.28, r * 0.28, r * 0.16, -0.45, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = "rgba(32, 99, 38, 0.65)";
  sctx.lineWidth = size * 0.012;
  sctx.beginPath();
  sctx.moveTo(r * 0.35, -r * 1.31);
  sctx.quadraticCurveTo(r * 0.52, -r * 1.34, r * 0.69, -r * 1.21);
  sctx.stroke();

  sctx.restore();
  return sprite;
}

function createSafeSoundEffect(src, poolSize = 1, volume = 1) {
  const players = [];
  let available = true;

  for (let i = 0; i < poolSize; i += 1) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    audio.addEventListener("error", () => {
      available = false;
    });
    players.push(audio);
  }

  let cursor = 0;

  return {
    play() {
      if (!available || players.length === 0) {
        return;
      }
      const audio = players[cursor];
      cursor = (cursor + 1) % players.length;

      try {
        if (audio.ended || audio.paused) {
          audio.currentTime = 0;
        }
        const result = audio.play();
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      } catch (_error) {
        // Ignore audio errors so gameplay is never blocked.
      }
    },
  };
}

const eatSound = createSafeSoundEffect("assets/eat.mp3", 5, 0.65);
const gameOverSound = createSafeSoundEffect("assets/game-over.mp3", 1, 0.7);

function syncPreviousSnake() {
  if (previousSnake.length > snake.length) {
    previousSnake.length = snake.length;
  }

  for (let i = 0; i < snake.length; i += 1) {
    const segment = snake[i];
    if (!previousSnake[i]) {
      previousSnake[i] = { x: segment.x, y: segment.y };
    } else {
      previousSnake[i].x = segment.x;
      previousSnake[i].y = segment.y;
    }
  }
}

function resetGame() {
  score = 0;
  appleCount = 0;
  snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  previousSnake = [];
  syncPreviousSnake();
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  gameOver = false;
  elapsedMs = 0;
  lastTimestamp = 0;
  wallFlashEndTime = 0;
  selfBiteEffect = null;
  filteredHeadAngle = null;
  renderPointsCache = [];
  awaitingFirstMove = true;
  scoreEl.textContent = String(score);
  appleCountEl.textContent = String(appleCount);
  const isMobileView = window.matchMedia("(max-width: 520px)").matches;
  if (!gameStarted) {
    statusTextEl.textContent = "Press Play to start.";
  } else if (isMobileView) {
    statusTextEl.textContent = "Use wheel or swipe to move.";
  } else {
    statusTextEl.textContent = "Press an arrow key to move.";
  }
  spawnFood();
}

function spawnFood() {
  let validPosition = false;

  while (!validPosition) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);

    validPosition = !snake.some((part) => part.x === x && part.y === y);
    if (validPosition) {
      food = { x, y };
    }
  }
}

function isOppositeDirection(newDir) {
  return direction.x + newDir.x === 0 && direction.y + newDir.y === 0;
}

function setDirectionFromInput(newDir) {
  if (!newDir || gameOver || !gameStarted) {
    return;
  }

  if (awaitingFirstMove) {
    direction = newDir;
    nextDirection = newDir;
    awaitingFirstMove = false;
    elapsedMs = 0;
    statusTextEl.textContent = "";
    return;
  }

  if (!isOppositeDirection(newDir)) {
    nextDirection = newDir;
  }
}

function applyDifficulty(level) {
  const next = difficultySpeeds[level] ?? difficultySpeeds.medium;
  stepDurationMs = next;
}

function moveSnake() {
  if (gameOver || !gameStarted || awaitingFirstMove) {
    return;
  }

  direction = nextDirection;
  syncPreviousSnake();

  const currentHead = snake[0];
  const previousLength = snake.length;
  const newHead = {
    x: currentHead.x + direction.x,
    y: currentHead.y + direction.y,
  };

  const hitWall = newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows;
  const selfCollisionIndex = snake.findIndex((part) => part.x === newHead.x && part.y === newHead.y);
  const hitSelf = selfCollisionIndex !== -1;

  if (hitWall) {
    wallFlashEndTime = performance.now() + 420;
    gameOver = true;
    gameOverSound.play();
    statusTextEl.textContent = "Game over. Press Restart.";
    return;
  }

  if (hitSelf) {
    const now = performance.now();
    const biteX = (newHead.x + 0.5) * cellSize;
    const biteY = (newHead.y + 0.5) * cellSize;
    const removedVisualPath = [{ x: biteX, y: biteY }];
    const removedSegmentsForVisual = snake.slice(selfCollisionIndex);
    for (let i = 0; i < removedSegmentsForVisual.length; i += 1) {
      const part = removedSegmentsForVisual[i];
      const px = (part.x + 0.5) * cellSize;
      const py = (part.y + 0.5) * cellSize;
      const prev = removedVisualPath[removedVisualPath.length - 1];
      if (!prev || Math.hypot(px - prev.x, py - prev.y) > 0.25) {
        removedVisualPath.push({ x: px, y: py });
      }
    }
    const smoothedRemovedPath = limitPathPoints(smoothSnakePoints(densifySnakePoints(removedVisualPath)), 120);

    selfBiteEffect = {
      x: biteX,
      y: biteY,
      path: smoothedRemovedPath,
      angle: Math.atan2(newHead.y - currentHead.y, newHead.x - currentHead.x),
      startTime: now,
      endTime: now + 760,
    };

    // Self-bite mechanic: keep only the front part up to the bite point.
    snake.unshift(newHead);
    const keepCount = Math.max(2, selfCollisionIndex + 1);
    const removedCount = Math.max(0, previousLength - keepCount);
    snake.length = keepCount;

    if (removedCount > 0) {
      score = Math.max(0, score - removedCount * 10);
      scoreEl.textContent = String(score);
      statusTextEl.textContent = `Self bite! -${removedCount * 10}`;
    }
    return;
  }

  snake.unshift(newHead);

  const ateFood = newHead.x === food.x && newHead.y === food.y;
  if (ateFood) {
    score += 10;
    appleCount += 1;
    scoreEl.textContent = String(score);
    appleCountEl.textContent = String(appleCount);
    eatSound.play();
    spawnFood();
  } else {
    snake.pop();
  }
}

function drawFood(nowMs) {
  const cx = food.x * cellSize + cellSize / 2;
  const cy = food.y * cellSize + cellSize / 2;
  const t = nowMs * 0.0045;
  const bob = Math.sin(t) * 1.4;
  const pulse = 0.97 + 0.06 * Math.sin(t * 1.18);
  const sway = Math.sin(t * 0.9) * 0.08;
  const drawSize = cellSize * 1.28;

  ctx.save();
  ctx.translate(cx, cy + bob);

  ctx.fillStyle = "rgba(28, 54, 20, 0.26)";
  ctx.beginPath();
  ctx.ellipse(0, cellSize * 0.28, drawSize * 0.35, drawSize * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(sway);
  ctx.scale(pulse, pulse);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(appleSprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

  ctx.restore();
}

function getSnakePoints(alpha) {
  const rawPoints = new Array(snake.length);
  const half = cellSize / 2;
  for (let i = 0; i < snake.length; i += 1) {
    const current = snake[i];
    const prev = previousSnake[i] || current;
    rawPoints[i] = {
      x: (prev.x + (current.x - prev.x) * alpha) * cellSize + half,
      y: (prev.y + (current.y - prev.y) * alpha) * cellSize + half,
    };
  }

  const maxVisualPoints = 180;
  if (rawPoints.length <= maxVisualPoints) {
    return rawPoints;
  }

  const reduced = [];
  const step = Math.ceil(rawPoints.length / maxVisualPoints);
  for (let i = 0; i < rawPoints.length; i += step) {
    reduced.push(rawPoints[i]);
  }
  const tail = rawPoints[rawPoints.length - 1];
  if (reduced[reduced.length - 1] !== tail) {
    reduced.push(tail);
  }
  return reduced;
}

function smoothSnakePoints(points) {
  if (points.length < 3) {
    return points;
  }

  let current = points;
  const passes = 2;

  for (let pass = 0; pass < passes; pass += 1) {
    const smoothed = new Array(current.length);
    smoothed[0] = current[0];
    smoothed[current.length - 1] = current[current.length - 1];

    for (let i = 1; i < current.length - 1; i += 1) {
      const a = current[i - 1];
      const b = current[i];
      const c = current[i + 1];
      smoothed[i] = {
        x: a.x * 0.22 + b.x * 0.56 + c.x * 0.22,
        y: a.y * 0.22 + b.y * 0.56 + c.y * 0.22,
      };
    }
    current = smoothed;
  }

  return current;
}

function densifySnakePoints(points) {
  if (points.length < 2) {
    return points;
  }

  const dense = [];
  const maxPoints = 360;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    dense.push(a);

    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const subdivisions = Math.min(3, Math.max(1, Math.floor(dist / (cellSize * 0.46))));

    for (let s = 1; s <= subdivisions; s += 1) {
      const t = s / (subdivisions + 1);
      dense.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
      if (dense.length >= maxPoints - 1) {
        break;
      }
    }

    if (dense.length >= maxPoints - 1) {
      break;
    }
  }

  dense.push(points[points.length - 1]);
  return dense;
}

function limitPathPoints(points, maxPoints) {
  if (points.length <= maxPoints || maxPoints < 2) {
    return points;
  }

  const limited = new Array(maxPoints);
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    limited[i] = points[Math.round(i * step)];
  }
  return limited;
}

function getRenderPoints(alpha) {
  return smoothSnakePoints(densifySnakePoints(getSnakePoints(alpha)));
}

function stabilizeRenderPoints(points) {
  if (points.length === 0) {
    renderPointsCache = [];
    return points;
  }

  if (renderPointsCache.length !== points.length) {
    renderPointsCache = points.map((p) => ({ x: p.x, y: p.y }));
    return renderPointsCache;
  }

  const follow = 0.52;
  for (let i = 0; i < points.length; i += 1) {
    const cache = renderPointsCache[i];
    const target = points[i];
    cache.x += (target.x - cache.x) * follow;
    cache.y += (target.y - cache.y) * follow;
  }

  return renderPointsCache;
}

function lerpAngle(from, to, factor) {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * factor;
}

function traceSmoothPath(points) {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    return;
  }
  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  const tension = 0.84;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

function drawSnakeBody(points) {
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Deep contour for a denser, more realistic tube.
  ctx.strokeStyle = snakePalette.bodyBottom;
  ctx.lineWidth = cellSize * 0.64;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  // Main body fill.
  const bodyGradient = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  bodyGradient.addColorStop(0, snakePalette.bodyTop);
  bodyGradient.addColorStop(0.3, "#2a5fd8");
  bodyGradient.addColorStop(0.62, snakePalette.bodyMid);
  bodyGradient.addColorStop(1, snakePalette.bodyBottom);
  ctx.strokeStyle = bodyGradient;
  ctx.lineWidth = cellSize * 0.52;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  // Top highlight stripe.
  ctx.strokeStyle = "rgba(202, 223, 255, 0.46)";
  ctx.lineWidth = cellSize * 0.1;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  // Belly stripe for 3D volume.
  ctx.strokeStyle = snakePalette.bellyCore;
  ctx.lineWidth = cellSize * 0.13;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  // Belly separators.
  ctx.strokeStyle = snakePalette.bellyEdge;
  ctx.lineWidth = 1;
  const stride = Math.max(2, Math.floor(points.length / 24));
  for (let i = 2; i < points.length - 1; i += stride) {
    const p = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const half = cellSize * 0.12;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * half, p.y - ny * half);
    ctx.lineTo(p.x + nx * half, p.y + ny * half);
    ctx.stroke();
  }
  ctx.restore();

  // Rear taper pass so the bottom half transitions into a slimmer real tail.
  const taperStart = Math.max(1, Math.floor(points.length * 0.62));
  const taperCount = points.length - taperStart - 1;
  if (taperCount > 2) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = taperStart; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const t = (i - taperStart) / taperCount;

      ctx.strokeStyle = snakePalette.bodyBottom;
      ctx.lineWidth = cellSize * (0.56 - t * 0.32);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = snakePalette.bodyMid;
      ctx.lineWidth = cellSize * (0.44 - t * 0.26);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(203, 224, 255, 0.36)";
      ctx.lineWidth = cellSize * (0.08 - t * 0.05);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTailTip(points) {
  if (points.length < 2) {
    return;
  }
  const tip = points[points.length - 1];
  const prev = points[points.length - 2];
  const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const tailLen = cellSize * 1.26;
  const tailWidth = cellSize * 0.1;

  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);

  const tailFill = ctx.createLinearGradient(-tailLen * 0.2, 0, tailLen, 0);
  tailFill.addColorStop(0, snakePalette.tailHighlight);
  tailFill.addColorStop(1, snakePalette.tailBase);
  ctx.fillStyle = tailFill;
  ctx.beginPath();
  ctx.moveTo(-tailLen * 0.16, -tailWidth);
  ctx.quadraticCurveTo(tailLen * 0.42, -tailWidth * 0.8, tailLen * 0.92, -tailWidth * 0.28);
  ctx.quadraticCurveTo(tailLen * 1.06, -tailWidth * 0.14, tailLen * 1.14, 0);
  ctx.quadraticCurveTo(tailLen * 1.04, tailWidth * 0.16, tailLen * 0.86, tailWidth * 0.42);
  ctx.quadraticCurveTo(tailLen * 0.42, tailWidth * 0.84, -tailLen * 0.16, tailWidth);
  ctx.quadraticCurveTo(tailLen * 0.08, 0, -tailLen * 0.16, -tailWidth);
  ctx.fill();

  ctx.strokeStyle = "rgba(20, 74, 42, 0.58)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tailLen * 0.04, 0);
  ctx.quadraticCurveTo(tailLen * 0.54, -tailWidth * 0.16, tailLen * 0.98, -tailWidth * 0.06);
  ctx.stroke();
  ctx.restore();
}

function drawHead(points, nowMs) {
  if (points.length === 0) {
    return;
  }

  const head = points[0];
  const neck = points[1] || { x: head.x - direction.x, y: head.y - direction.y };
  const targetAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
  if (filteredHeadAngle === null) {
    filteredHeadAngle = targetAngle;
  } else {
    filteredHeadAngle = lerpAngle(filteredHeadAngle, targetAngle, 0.12);
  }
  const angle = filteredHeadAngle;
  const headRadius = cellSize * 0.39;

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  const headGradient = ctx.createLinearGradient(-headRadius * 1.25, -headRadius * 0.6, headRadius * 1.1, headRadius * 0.6);
  headGradient.addColorStop(0, snakePalette.headHighlight);
  headGradient.addColorStop(0.45, snakePalette.headBase);
  headGradient.addColorStop(1, snakePalette.headShadow);
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 1.34, 0);
  ctx.quadraticCurveTo(-headRadius * 0.74, -headRadius * 0.86, headRadius * 0.46, -headRadius * 0.58);
  ctx.quadraticCurveTo(headRadius * 1.06, -headRadius * 0.24, headRadius * 1.12, 0);
  ctx.quadraticCurveTo(headRadius * 1.06, headRadius * 0.24, headRadius * 0.46, headRadius * 0.58);
  ctx.quadraticCurveTo(-headRadius * 0.74, headRadius * 0.86, -headRadius * 1.34, 0);
  ctx.fill();

  // Subtle top ridge.
  ctx.strokeStyle = "rgba(214, 247, 206, 0.58)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.62, -headRadius * 0.45);
  ctx.quadraticCurveTo(headRadius * 0.24, -headRadius * 0.5, headRadius * 0.86, -headRadius * 0.18);
  ctx.stroke();

  // Jaw plate and scale seams for a realistic eye-less head profile.
  ctx.fillStyle = "rgba(175, 204, 255, 0.3)";
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.64, 0);
  ctx.quadraticCurveTo(-headRadius * 0.08, -headRadius * 0.4, headRadius * 0.74, -headRadius * 0.24);
  ctx.quadraticCurveTo(headRadius * 0.62, 0, headRadius * 0.74, headRadius * 0.24);
  ctx.quadraticCurveTo(-headRadius * 0.08, headRadius * 0.4, -headRadius * 0.64, 0);
  ctx.fill();

  ctx.strokeStyle = "rgba(16, 43, 110, 0.5)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.55, 0);
  ctx.quadraticCurveTo(headRadius * 0.08, -headRadius * 0.24, headRadius * 0.74, -headRadius * 0.15);
  ctx.moveTo(-headRadius * 0.55, 0);
  ctx.quadraticCurveTo(headRadius * 0.08, headRadius * 0.24, headRadius * 0.74, headRadius * 0.15);
  ctx.stroke();

  // Emoji-like eyes (big white eyes with dark pupils).
  const eyeX = headRadius * 0.05;
  const eyeY = headRadius * 0.33;
  const eyeR = headRadius * 0.26;
  const toFoodX = food.x * cellSize + cellSize / 2 - head.x;
  const toFoodY = food.y * cellSize + cellSize / 2 - head.y;
  const localX = Math.cos(-angle) * toFoodX - Math.sin(-angle) * toFoodY;
  const localY = Math.sin(-angle) * toFoodX + Math.cos(-angle) * toFoodY;
  const lookLen = Math.hypot(localX, localY) || 1;
  const lookX = (localX / lookLen) * eyeR * 0.26;
  const lookY = (localY / lookLen) * eyeR * 0.2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeX, eyeY, eyeR * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d5fbf";
  ctx.beginPath();
  ctx.arc(eyeX + lookX * 0.72, -eyeY + lookY, eyeR * 0.47, 0, Math.PI * 2);
  ctx.arc(eyeX + lookX * 0.72, eyeY + lookY, eyeR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0d1629";
  ctx.beginPath();
  ctx.arc(eyeX + lookX, -eyeY + lookY, eyeR * 0.24, 0, Math.PI * 2);
  ctx.arc(eyeX + lookX, eyeY + lookY, eyeR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.arc(eyeX - eyeR * 0.25, -eyeY - eyeR * 0.25, eyeR * 0.17, 0, Math.PI * 2);
  ctx.arc(eyeX - eyeR * 0.25, eyeY - eyeR * 0.25, eyeR * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils only; mouth and tongue intentionally removed.
  ctx.fillStyle = "rgba(34, 73, 45, 0.66)";
  ctx.beginPath();
  ctx.arc(headRadius * 0.9, -headRadius * 0.12, 1.5, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.9, headRadius * 0.12, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Subtle forked tongue flick outside the mouth area.
  const flickCycle = nowMs % 1500;
  const flickPhase = flickCycle < 260 ? Math.sin((flickCycle / 260) * Math.PI) : 0;
  if (flickPhase > 0.08) {
    const baseX = headRadius * 1.08;
    const tongueLen = headRadius * (0.85 + 1.65 * flickPhase);
    const fork = headRadius * (0.12 + 0.2 * flickPhase);

    ctx.strokeStyle = "#b74a56";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, 0);
    ctx.lineTo(baseX + tongueLen, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX + tongueLen, 0);
    ctx.lineTo(baseX + tongueLen + headRadius * 0.18, -fork);
    ctx.moveTo(baseX + tongueLen, 0);
    ctx.lineTo(baseX + tongueLen + headRadius * 0.18, fork);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSnake(alpha, nowMs) {
  const points = stabilizeRenderPoints(getRenderPoints(alpha));
  drawSnakeBody(points);
  drawTailTip(points);
  drawHead(points, nowMs);
}

function getSelfBiteState(nowMs) {
  if (!selfBiteEffect) {
    return null;
  }
  if (nowMs >= selfBiteEffect.endTime) {
    selfBiteEffect = null;
    return null;
  }

  const total = selfBiteEffect.endTime - selfBiteEffect.startTime;
  const progress = Math.min(1, Math.max(0, (nowMs - selfBiteEffect.startTime) / total));

  return { ...selfBiteEffect, progress };
}

function drawSelfBiteEffect(nowMs) {
  const bite = getSelfBiteState(nowMs);
  if (!bite || !bite.path || bite.path.length < 2) {
    return;
  }

  const progress = smoothStep(bite.progress);
  const path = bite.path;
  const transformed = new Array(path.length);
  const pathLen = path.length - 1;

  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    const t = pathLen === 0 ? 0 : i / pathLen;
    // Near-bite segments collapse first, tail follows later.
    const localPull = Math.min(1, progress * (0.52 + (1 - t) * 1.02));
    const easedPull = smoothStep(localPull);
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(pathLen, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const wobble = Math.sin((1 - t) * Math.PI * 2.4 + progress * 9.2) * cellSize * 0.02 * (1 - progress) * (1 - t);
    transformed[i] = {
      x: p.x + (bite.x - p.x) * easedPull + nx * wobble,
      y: p.y + (bite.y - p.y) * easedPull + ny * wobble,
    };
  }

  const alpha = 1 - progress * 0.9;
  const widthOuter = Math.max(1.15, cellSize * (0.4 - progress * 0.22));
  const widthInner = Math.max(0.85, cellSize * (0.28 - progress * 0.16));

  // Draw the removed section as a shrinking body piece being swallowed.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = snakePalette.bodyBottom;
  ctx.lineWidth = widthOuter;
  ctx.beginPath();
  traceSmoothPath(transformed);
  ctx.stroke();

  const pullGradient = ctx.createLinearGradient(bite.x, bite.y, transformed[transformed.length - 1].x, transformed[transformed.length - 1].y);
  pullGradient.addColorStop(0, "rgba(95, 148, 242, 0.95)");
  pullGradient.addColorStop(1, "rgba(44, 105, 225, 0.85)");
  ctx.strokeStyle = pullGradient;
  ctx.lineWidth = widthInner;
  ctx.beginPath();
  traceSmoothPath(transformed);
  ctx.stroke();

  ctx.strokeStyle = "rgba(211, 231, 255, 0.5)";
  ctx.lineWidth = Math.max(0.6, cellSize * (0.06 - progress * 0.03));
  ctx.beginPath();
  traceSmoothPath(transformed);
  ctx.stroke();
  ctx.restore();

  // Subtle bite clamp marks near the mouth for a natural chewing feel.
  const chewPulse = Math.sin(progress * Math.PI);
  const jawOpen = cellSize * (0.12 + chewPulse * 0.06);
  ctx.save();
  ctx.translate(bite.x, bite.y);
  ctx.rotate(bite.angle ?? filteredHeadAngle ?? 0);
  ctx.strokeStyle = `rgba(52, 26, 26, ${0.65 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cellSize * 0.05, -jawOpen);
  ctx.quadraticCurveTo(cellSize * 0.23, -jawOpen * 0.35, cellSize * 0.35, -jawOpen * 0.08);
  ctx.moveTo(cellSize * 0.05, jawOpen);
  ctx.quadraticCurveTo(cellSize * 0.23, jawOpen * 0.35, cellSize * 0.35, jawOpen * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawWallFlash(nowMs) {
  if (nowMs >= wallFlashEndTime) {
    return;
  }

  const duration = 420;
  const alpha = Math.max(0, (wallFlashEndTime - nowMs) / duration);

  ctx.save();
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 * alpha})`;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = `rgba(239, 68, 68, ${0.2 * alpha})`;
  ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
  ctx.fillRect(0, 0, 8, canvas.height);
  ctx.fillRect(canvas.width - 8, 0, 8, canvas.height);
  ctx.restore();
}

function draw(alpha, nowMs) {
  ctx.drawImage(backgroundLayer, 0, 0);
  drawFood(nowMs);
  const points = stabilizeRenderPoints(getRenderPoints(alpha));
  drawSnakeBody(points);
  drawTailTip(points);
  drawHead(points, nowMs);
  drawSelfBiteEffect(nowMs);
  drawWallFlash(nowMs);
}

function gameLoop(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const delta = Math.min(timestamp - lastTimestamp, 40);
  lastTimestamp = timestamp;
  elapsedMs += delta;

  while (elapsedMs >= stepDurationMs) {
    moveSnake();
    elapsedMs -= stepDurationMs;
  }

  const alpha = Math.min(elapsedMs / stepDurationMs, 1);
  draw(alpha, timestamp);
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const newDir = keyMap[event.key];
  if (!newDir) {
    return;
  }

  event.preventDefault();
  setDirectionFromInput(newDir);
});

difficultySelect.addEventListener("change", () => {
  applyDifficulty(difficultySelect.value);
});

let wheelDragging = false;
let wheelCenterX = 0;
let wheelCenterY = 0;
const wheelRadius = 34;

function setWheelCenter() {
  const rect = wheelBase.getBoundingClientRect();
  wheelCenterX = rect.left + rect.width / 2;
  wheelCenterY = rect.top + rect.height / 2;
}

function resetWheelKnob() {
  wheelKnob.style.transform = "translate(-50%, -50%)";
}

function updateWheelPosition(clientX, clientY) {
  const dx = clientX - wheelCenterX;
  const dy = clientY - wheelCenterY;
  const distance = Math.hypot(dx, dy);
  const limited = Math.min(distance, wheelRadius);
  const angle = Math.atan2(dy, dx);
  const x = Math.cos(angle) * limited;
  const y = Math.sin(angle) * limited;
  wheelKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

  if (distance < 14) {
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirectionFromInput(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    setDirectionFromInput(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
}

let touchStartX = 0;
let touchStartY = 0;

gameStageEl.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 0) {
      return;
    }
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  },
  { passive: true }
);

gameStageEl.addEventListener(
  "touchmove",
  (event) => {
    if (!gameStarted) {
      return;
    }
    event.preventDefault();
  },
  { passive: false }
);

gameStageEl.addEventListener(
  "touchend",
  (event) => {
    if (event.changedTouches.length === 0) {
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const threshold = 22;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      setDirectionFromInput(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      setDirectionFromInput(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }
  },
  { passive: true }
);

wheelBase.addEventListener("touchstart", (event) => {
  if (event.touches.length === 0) {
    return;
  }
  wheelDragging = true;
  setWheelCenter();
  updateWheelPosition(event.touches[0].clientX, event.touches[0].clientY);
});

wheelBase.addEventListener(
  "touchmove",
  (event) => {
    if (!wheelDragging || event.touches.length === 0) {
      return;
    }
    event.preventDefault();
    updateWheelPosition(event.touches[0].clientX, event.touches[0].clientY);
  },
  { passive: false }
);

wheelBase.addEventListener("touchend", () => {
  wheelDragging = false;
  resetWheelKnob();
});

wheelBase.addEventListener("touchcancel", () => {
  wheelDragging = false;
  resetWheelKnob();
});

playBtn.addEventListener("click", () => {
  gameStarted = true;
  startOverlayEl.classList.add("is-hidden");
  resetGame();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

buildGrassBackground();
applyDifficulty(difficultySelect.value);
resetGame();
requestAnimationFrame(gameLoop);
