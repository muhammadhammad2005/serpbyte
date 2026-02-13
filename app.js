const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const scoreEl = document.getElementById("score");
const statusTextEl = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");
const startOverlayEl = document.getElementById("startOverlay");
const playBtn = document.getElementById("playBtn");
const gameStageEl = document.querySelector(".game-stage");
const directionButtons = document.querySelectorAll(".dir-btn");

const cellSize = 24;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
const stepDurationMs = 95;

let score = 0;
let snake = [];
let previousSnake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let gameOver = false;
let gameStarted = false;
let elapsedMs = 0;
let lastTimestamp = 0;
let wallFlashEndTime = 0;
let selfBiteEffect = null;

const backgroundLayer = document.createElement("canvas");
backgroundLayer.width = canvas.width;
backgroundLayer.height = canvas.height;
const bgCtx = backgroundLayer.getContext("2d", { alpha: false });

function buildGrassBackground() {
  const w = backgroundLayer.width;
  const h = backgroundLayer.height;
  bgCtx.clearRect(0, 0, w, h);
  const light = "#245c2f";
  const dark = "#1a4725";
  const colsCount = Math.ceil(w / cellSize);
  const rowsCount = Math.ceil(h / cellSize);

  for (let row = 0; row < rowsCount; row += 1) {
    for (let col = 0; col < colsCount; col += 1) {
      bgCtx.fillStyle = (row + col) % 2 === 0 ? light : dark;
      bgCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }

  bgCtx.strokeStyle = "rgba(118, 186, 106, 0.16)";
  bgCtx.lineWidth = 1;
  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const bladeHeight = 4 + Math.random() * 8;
    bgCtx.beginPath();
    bgCtx.moveTo(x, y);
    bgCtx.quadraticCurveTo(x + 1.4, y - bladeHeight * 0.45, x + (Math.random() - 0.5) * 2, y - bladeHeight);
    bgCtx.stroke();
  }
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
  scoreEl.textContent = String(score);
  const isMobileView = window.matchMedia("(max-width: 520px)").matches;
  if (!gameStarted) {
    statusTextEl.textContent = "Press Play to start.";
  } else if (isMobileView) {
    statusTextEl.textContent = "Swipe or use touch buttons.";
  } else {
    statusTextEl.textContent = "Use arrow keys to play.";
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

  if (!isOppositeDirection(newDir)) {
    nextDirection = newDir;
  }
}

function moveSnake() {
  if (gameOver || !gameStarted) {
    return;
  }

  direction = nextDirection;
  syncPreviousSnake();

  const currentHead = snake[0];
  const newHead = {
    x: currentHead.x + direction.x,
    y: currentHead.y + direction.y,
  };

  const hitWall = newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows;
  const hitSelf = snake.some((part) => part.x === newHead.x && part.y === newHead.y);

  if (hitWall) {
    wallFlashEndTime = performance.now() + 420;
    gameOver = true;
    gameOverSound.play();
    statusTextEl.textContent = "Game over. Press Restart.";
    return;
  }

  if (hitSelf) {
    const now = performance.now();
    selfBiteEffect = {
      x: (newHead.x + 0.5) * cellSize,
      y: (newHead.y + 0.5) * cellSize,
      startTime: now,
      endTime: now + 900,
    };
    gameOver = true;
    gameOverSound.play();
    statusTextEl.textContent = "Game over. Press Restart.";
    return;
  }

  snake.unshift(newHead);

  const ateFood = newHead.x === food.x && newHead.y === food.y;
  if (ateFood) {
    score += 10;
    scoreEl.textContent = String(score);
    eatSound.play();
    spawnFood();
  } else {
    snake.pop();
  }
}

function drawFood() {
  const cx = food.x * cellSize + cellSize / 2;
  const cy = food.y * cellSize + cellSize / 2;
  const r = cellSize * 0.32;

  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.7);
  glow.addColorStop(0, "rgba(251, 113, 133, 0.95)");
  glow.addColorStop(1, "rgba(251, 113, 133, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, r);
  core.addColorStop(0, "#ffd1dd");
  core.addColorStop(1, "#fb7185");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
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

function traceSmoothPath(points) {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) * 0.5;
    const midY = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
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

  ctx.strokeStyle = "#4f5b2a";
  ctx.lineWidth = cellSize * 0.72;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  const fill = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  fill.addColorStop(0, "#6f7e3e");
  fill.addColorStop(0.6, "#5e6f34");
  fill.addColorStop(1, "#495727");
  ctx.strokeStyle = fill;
  ctx.lineWidth = cellSize * 0.56;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();

  ctx.strokeStyle = "rgba(222, 206, 148, 0.3)";
  ctx.lineWidth = cellSize * 0.2;
  ctx.beginPath();
  traceSmoothPath(points);
  ctx.stroke();
  ctx.restore();
}

function drawHead(points) {
  if (points.length === 0) {
    return;
  }

  const head = points[0];
  const neck = points[1] || { x: head.x - direction.x, y: head.y - direction.y };
  const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
  const headRadius = cellSize * 0.34;
  const foodCenterX = food.x * cellSize + cellSize / 2;
  const foodCenterY = food.y * cellSize + cellSize / 2;
  const foodDistance = Math.hypot(foodCenterX - head.x, foodCenterY - head.y);
  const nearFactor = Math.max(0, 1 - foodDistance / (cellSize * 6));
  const mouthOpen = 0.14 + nearFactor * 0.18;
  const eyeOffsetY = headRadius * 0.38;
  const eyeOffsetX = headRadius * 0.15;
  const eyeR = headRadius * 0.2;
  const pupilR = eyeR * 0.55;
  const look = nearFactor * 0.2 + 0.2;
  const pupilLookX = look * 0.55;

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  const headFill = ctx.createRadialGradient(-headRadius * 0.25, -headRadius * 0.3, headRadius * 0.2, 0, 0, headRadius * 1.2);
  headFill.addColorStop(0, "#7f8d4b");
  headFill.addColorStop(1, "#4f5b2a");
  ctx.fillStyle = headFill;
  ctx.beginPath();
  ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Round eyes.
  ctx.fillStyle = "#eef2f6";
  ctx.beginPath();
  ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(eyeOffsetX + pupilLookX, -eyeOffsetY, pupilR, 0, Math.PI * 2);
  ctx.arc(eyeOffsetX + pupilLookX, eyeOffsetY, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1f2810";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, headRadius * 0.86, -mouthOpen, mouthOpen);
  ctx.stroke();

  ctx.restore();
}

function drawSnake(alpha) {
  const points = getSnakePoints(alpha);
  drawSnakeBody(points);
  drawHead(points);
}

function getSelfBiteState(nowMs) {
  if (!selfBiteEffect) {
    return null;
  }
  if (nowMs >= selfBiteEffect.endTime) {
    return null;
  }

  const total = selfBiteEffect.endTime - selfBiteEffect.startTime;
  const progress = Math.min(1, Math.max(0, (nowMs - selfBiteEffect.startTime) / total));

  return { ...selfBiteEffect, progress };
}

function drawSelfBiteEffect(nowMs) {
  const bite = getSelfBiteState(nowMs);
  if (!bite) {
    return;
  }

  const cutRadius = cellSize * (0.18 + 0.15 * bite.progress);
  const ringAlpha = 1 - bite.progress;

  // Cut out a chunk so it looks like the body was bitten.
  ctx.save();
  ctx.beginPath();
  ctx.arc(bite.x, bite.y, cutRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(backgroundLayer, 0, 0);
  ctx.restore();

  // Dark bite edge.
  ctx.save();
  ctx.strokeStyle = `rgba(58, 22, 22, ${0.75 * ringAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bite.x, bite.y, cutRadius + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Small debris around the bite to sell impact.
  ctx.save();
  const particles = 7;
  for (let i = 0; i < particles; i += 1) {
    const angle = (Math.PI * 2 * i) / particles + bite.progress * 1.8;
    const dist = cutRadius + 2 + bite.progress * 8;
    const px = bite.x + Math.cos(angle) * dist;
    const py = bite.y + Math.sin(angle) * dist;
    ctx.fillStyle = `rgba(73, 87, 39, ${0.65 * ringAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
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
  drawFood();
  drawSnake(alpha);
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
  draw(smoothStep(alpha), timestamp);
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

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dirMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    setDirectionFromInput(dirMap[button.dataset.dir]);
  });
});

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

playBtn.addEventListener("click", () => {
  gameStarted = true;
  startOverlayEl.classList.add("is-hidden");
  resetGame();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

buildGrassBackground();
resetGame();
requestAnimationFrame(gameLoop);
