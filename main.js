/* ============================================================
   FLAPPY BIRD — NEON WINGS EDITION
   Main Game Engine v2 — with sound, difficulty, and polish
   ============================================================ */

// ---- DOM ----
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const medalContainer = document.getElementById('medal-container');
const medalEl = document.getElementById('medal');
const medalLabelEl = document.getElementById('medal-label');

// ---- Audio (Web Audio API) ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playTone(freq, dur, type = 'square', vol = 0.12) {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function sfxFlap() { playTone(520, 0.08, 'triangle', 0.15); }
function sfxScore() { playTone(880, 0.1, 'sine', 0.12); setTimeout(() => playTone(1100, 0.12, 'sine', 0.1), 80); }
function sfxHit() { playTone(120, 0.25, 'sawtooth', 0.18); }
function sfxDie() { playTone(200, 0.4, 'sawtooth', 0.12); setTimeout(() => playTone(80, 0.5, 'sawtooth', 0.1), 200); }

// ---- Constants ----
const GRAVITY = 0.48;
const FLAP_FORCE = -7.8;
const PIPE_WIDTH = 68;
const BASE_PIPE_GAP = 165;
const BASE_PIPE_SPEED = 2.8;
const PIPE_SPAWN_INTERVAL = 1600;
const BIRD_SIZE = 28;
const GROUND_HEIGHT = 80;
const STAR_COUNT = 80;

// ---- State ----
let gameState = 'idle';
let bird = {};
let pipes = [];
let particles = [];
let stars = [];
let trailParticles = [];
let floatingTexts = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappy-best') || '0');
let lastPipeSpawn = 0;
let frameCount = 0;
let screenShake = 0;
let flashAlpha = 0;
let isNewBest = false;

// Dynamic difficulty
function getPipeGap() { return Math.max(120, BASE_PIPE_GAP - score * 1.5); }
function getPipeSpeed() { return Math.min(5.5, BASE_PIPE_SPEED + score * 0.06); }

// ---- Canvas ----
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateStars();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---- Stars ----
function generateStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.85,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.01,
    });
  }
}

// ---- Cityscape (parallax buildings) ----
const buildings = [];
function generateBuildings() {
  buildings.length = 0;
  let x = 0;
  while (x < canvas.width + 200) {
    const w = 30 + Math.random() * 50;
    const h = 40 + Math.random() * 120;
    buildings.push({ x, w, h, windows: Math.floor(Math.random() * 6) + 2, speed: 0.3 + Math.random() * 0.3 });
    x += w + 5 + Math.random() * 20;
  }
}
generateBuildings();

// ---- Bird ----
function resetBird() {
  bird = { x: canvas.width * 0.3, y: canvas.height * 0.45, vy: 0, rotation: 0, wingAngle: 0, wingDir: 1, flapCooldown: 0, alive: true };
}

function flapBird() {
  if (!bird.alive) return;
  bird.vy = FLAP_FORCE;
  bird.flapCooldown = 8;
  sfxFlap();
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: bird.x - 10, y: bird.y + 5,
      vx: (Math.random() - 0.7) * 3, vy: Math.random() * 2 + 1,
      size: Math.random() * 4 + 2, life: 1, decay: Math.random() * 0.03 + 0.02,
      color: `hsla(${45 + Math.random() * 20}, 100%, 70%, `,
    });
  }
}

// ---- Pipes ----
function spawnPipe() {
  const gap = getPipeGap();
  const minY = 80;
  const maxY = canvas.height - GROUND_HEIGHT - gap - 80;
  const gapY = Math.random() * (maxY - minY) + minY;
  pipes.push({ x: canvas.width + PIPE_WIDTH, gapTop: gapY, gapBottom: gapY + gap, scored: false, glowPhase: Math.random() * Math.PI * 2 });
}

// ---- Particles ----
function spawnExplosion(x, y) {
  const colors = ['#00f0ff', '#ff2d95', '#ffd700', '#ff6b6b', '#6effff', '#39ff14'];
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.3;
    const speed = Math.random() * 6 + 2;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: Math.random() * 5 + 2, life: 1, decay: Math.random() * 0.015 + 0.01, isHex: true, hexColor: colors[Math.floor(Math.random() * colors.length)] });
  }
}

function spawnScoreParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    particles.push({ x, y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, size: Math.random() * 3 + 1, life: 1, decay: 0.025, color: 'hsla(180, 100%, 70%, ' });
  }
}

// ---- Floating text ("+1") ----
function spawnFloatingText(x, y, text) {
  floatingTexts.push({ x, y, text, life: 1, decay: 0.018 });
}

// ---- Collision ----
function checkCollision() {
  const r = BIRD_SIZE * 0.4;
  if (bird.y + r > canvas.height - GROUND_HEIGHT || bird.y - r < 0) return true;
  for (const pipe of pipes) {
    if (bird.x + r > pipe.x && bird.x - r < pipe.x + PIPE_WIDTH) {
      if (bird.y - r < pipe.gapTop || bird.y + r > pipe.gapBottom) return true;
    }
  }
  return false;
}

// ---- Score ----
function checkScore() {
  for (const pipe of pipes) {
    if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.scored = true;
      score++;
      scoreDisplay.textContent = score;
      sfxScore();
      spawnScoreParticles(bird.x, bird.y - 30);
      spawnFloatingText(bird.x, bird.y - 40, '+1');
    }
  }
}

// ---- Update ----
function update() {
  frameCount++;
  if (gameState === 'playing') {
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rotation = Math.min(Math.max(bird.vy * 3, -30), 70);
    bird.flapCooldown = Math.max(0, bird.flapCooldown - 1);
    bird.wingAngle += 0.3 * bird.wingDir;
    if (Math.abs(bird.wingAngle) > 1) bird.wingDir *= -1;

    if (frameCount % 2 === 0) {
      trailParticles.push({ x: bird.x - 12, y: bird.y, size: Math.random() * 3 + 1, life: 1, decay: 0.04 });
    }

    const now = performance.now();
    if (now - lastPipeSpawn > PIPE_SPAWN_INTERVAL) { spawnPipe(); lastPipeSpawn = now; }

    const speed = getPipeSpeed();
    for (const pipe of pipes) { pipe.x -= speed; pipe.glowPhase += 0.02; }
    pipes = pipes.filter(p => p.x > -PIPE_WIDTH - 10);

    // Move buildings
    for (const b of buildings) {
      b.x -= b.speed;
      if (b.x + b.w < -10) b.x = canvas.width + Math.random() * 100;
    }

    if (checkCollision()) die();
    checkScore();
  }

  particles = particles.filter(p => { p.x += p.vx || 0; p.y += p.vy || 0; if (p.vy !== undefined) p.vy += 0.05; p.life -= p.decay; return p.life > 0; });
  trailParticles = trailParticles.filter(p => { p.life -= p.decay; return p.life > 0; });
  floatingTexts = floatingTexts.filter(ft => { ft.y -= 1.2; ft.life -= ft.decay; return ft.life > 0; });

  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.5) screenShake = 0;
  if (flashAlpha > 0) flashAlpha -= 0.05;
}

function die() {
  gameState = 'dead';
  bird.alive = false;
  screenShake = 15;
  flashAlpha = 0.8;
  sfxHit();
  setTimeout(sfxDie, 150);
  spawnExplosion(bird.x, bird.y);
  isNewBest = score > bestScore;
  if (isNewBest) { bestScore = score; localStorage.setItem('flappy-best', bestScore.toString()); }
  setTimeout(showGameOver, 800);
}

function showGameOver() {
  hud.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;

  const newBestBadge = document.getElementById('new-best-badge');
  if (newBestBadge) newBestBadge.classList.toggle('hidden', !isNewBest);

  if (score >= 40) { setMedal('platinum', '💎', 'PLATINUM'); }
  else if (score >= 20) { setMedal('gold', '🥇', 'GOLD'); }
  else if (score >= 10) { setMedal('silver', '🥈', 'SILVER'); }
  else if (score >= 5) { setMedal('bronze', '🥉', 'BRONZE'); }
  else { medalContainer.classList.add('hidden'); }
}

function setMedal(cls, emoji, label) {
  medalContainer.classList.remove('hidden');
  medalEl.className = 'medal ' + cls;
  medalEl.textContent = emoji;
  medalLabelEl.textContent = label;
}

// ---- Drawing ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

  drawBackground();
  drawStars();
  drawCityscape();
  drawPipes();
  drawGround();
  drawTrail();
  drawParticles();
  drawFloatingTexts();
  drawBird();
  drawFlash();

  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#070b1a');
  grad.addColorStop(0.4, '#0f1635');
  grad.addColorStop(0.7, '#1a1040');
  grad.addColorStop(1, '#2d1b4e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Aurora bands
  const t = frameCount;
  const ay = canvas.height * 0.3;
  const ag = ctx.createLinearGradient(0, ay - 60, 0, ay + 60);
  ag.addColorStop(0, 'rgba(0,240,255,0)');
  ag.addColorStop(0.5, `rgba(0,240,255,${0.03 + Math.sin(t * 0.01) * 0.02})`);
  ag.addColorStop(1, 'rgba(0,240,255,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(0, ay - 60, canvas.width, 120);

  const by = canvas.height * 0.5;
  const bg = ctx.createLinearGradient(0, by - 40, 0, by + 40);
  bg.addColorStop(0, 'rgba(255,45,149,0)');
  bg.addColorStop(0.5, `rgba(255,45,149,${0.02 + Math.sin(t * 0.015 + 2) * 0.015})`);
  bg.addColorStop(1, 'rgba(255,45,149,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, by - 40, canvas.width, 80);
}

function drawStars() {
  for (const s of stars) {
    s.twinkle += s.twinkleSpeed;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(s.twinkle) * 0.3})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    if (gameState === 'playing') { s.x -= s.speed; if (s.x < -5) s.x = canvas.width + 5; }
  }
}

function drawCityscape() {
  const gy = canvas.height - GROUND_HEIGHT;
  for (const b of buildings) {
    ctx.fillStyle = 'rgba(10,15,35,0.7)';
    ctx.fillRect(b.x, gy - b.h, b.w, b.h);
    // Window lights
    ctx.fillStyle = 'rgba(0,240,255,0.15)';
    const ws = 6, gap = 8;
    for (let wy = gy - b.h + 10; wy < gy - 10; wy += gap + ws) {
      for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += gap + ws) {
        if (Math.random() > 0.3) ctx.fillRect(wx, wy, ws, ws);
      }
    }
  }
}

function drawPipes() {
  for (const pipe of pipes) {
    const glow = 0.3 + Math.sin(pipe.glowPhase) * 0.15;
    drawPipe(pipe.x, 0, PIPE_WIDTH, pipe.gapTop, 'top', glow);
    drawPipe(pipe.x, pipe.gapBottom, PIPE_WIDTH, canvas.height - GROUND_HEIGHT - pipe.gapBottom, 'bottom', glow);
  }
}

function drawPipe(x, y, w, h, type, glow) {
  if (h <= 0) return;
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, 'rgba(0,200,180,0.6)');
  grad.addColorStop(0.5, 'rgba(0,255,220,0.9)');
  grad.addColorStop(1, 'rgba(0,180,160,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Cap
  const capH = 20, capW = w + 12, capX = x - 6;
  const capY = type === 'top' ? y + h - capH : y;
  ctx.beginPath();
  const cr = 6;
  ctx.moveTo(capX + cr, capY);
  ctx.lineTo(capX + capW - cr, capY);
  ctx.quadraticCurveTo(capX + capW, capY, capX + capW, capY + cr);
  ctx.lineTo(capX + capW, capY + capH - cr);
  ctx.quadraticCurveTo(capX + capW, capY + capH, capX + capW - cr, capY + capH);
  ctx.lineTo(capX + cr, capY + capH);
  ctx.quadraticCurveTo(capX, capY + capH, capX, capY + capH - cr);
  ctx.lineTo(capX, capY + cr);
  ctx.quadraticCurveTo(capX, capY, capX + cr, capY);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = `rgba(0,255,200,${glow})`;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = `rgba(0,255,220,${glow + 0.2})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 8, y, 4, h);
}

function drawGround() {
  const gy = canvas.height - GROUND_HEIGHT;
  const grad = ctx.createLinearGradient(0, gy, 0, canvas.height);
  grad.addColorStop(0, '#1a2040');
  grad.addColorStop(1, '#0a0d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, gy, canvas.width, GROUND_HEIGHT);

  ctx.shadowColor = 'rgba(0,240,255,0.5)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(0,240,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(0,240,255,0.06)';
  ctx.lineWidth = 1;
  const gs = 30;
  const off = gameState === 'playing' ? (frameCount * getPipeSpeed()) % gs : 0;
  for (let x = -off; x < canvas.width; x += gs) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 20, canvas.height); ctx.stroke(); }
  for (let y2 = gy + gs; y2 < canvas.height; y2 += gs) { ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(canvas.width, y2); ctx.stroke(); }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate((bird.rotation * Math.PI) / 180);
  const s = BIRD_SIZE;

  ctx.shadowColor = 'rgba(255,200,0,0.5)';
  ctx.shadowBlur = 20;

  const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
  bodyGrad.addColorStop(0, '#ffe066');
  bodyGrad.addColorStop(0.6, '#ffb300');
  bodyGrad.addColorStop(1, '#e68a00');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Wing
  ctx.save(); ctx.translate(-5, 5); ctx.rotate(bird.wingAngle * 0.5);
  const wg = ctx.createLinearGradient(-15, 0, 0, 15);
  wg.addColorStop(0, '#ffa000'); wg.addColorStop(1, '#ff6f00');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.ellipse(-8, 0, 14, 8, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.2, s * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(s * 0.42, -s * 0.18, s * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(s * 0.48, -s * 0.28, s * 0.06, 0, Math.PI * 2); ctx.fill();

  // Beak
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.moveTo(s * 0.6, 0); ctx.lineTo(s * 1.1, s * 0.1); ctx.lineTo(s * 0.6, s * 0.3); ctx.closePath(); ctx.fill();

  ctx.restore();
}

function drawTrail() {
  for (const p of trailParticles) {
    ctx.fillStyle = `rgba(255,200,50,${p.life * 0.3})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    if (p.isHex) {
      ctx.globalAlpha = p.life; ctx.fillStyle = p.hexColor;
    } else {
      ctx.fillStyle = p.color + p.life + ')';
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.life;
    ctx.font = '700 20px Orbitron, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = 'rgba(0,240,255,0.6)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function drawFlash() {
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ---- Game Loop ----
function gameLoop() {
  update();
  draw();

  if (gameState === 'idle') {
    bird.y = canvas.height * 0.45 + Math.sin(frameCount * 0.04) * 15;
    bird.wingAngle += 0.15 * bird.wingDir;
    if (Math.abs(bird.wingAngle) > 1) bird.wingDir *= -1;
  }

  if (gameState === 'dead' && bird.y < canvas.height - GROUND_HEIGHT - 20) {
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rotation = Math.min(bird.rotation + 4, 90);
    if (bird.y >= canvas.height - GROUND_HEIGHT - 20) { bird.y = canvas.height - GROUND_HEIGHT - 20; bird.vy = 0; }
  }

  requestAnimationFrame(gameLoop);
}

// ---- Input ----
function handleFlap(e) {
  if (e) e.preventDefault();
  if (gameState === 'playing') flapBird();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleFlap(); }
});
canvas.addEventListener('mousedown', handleFlap);
canvas.addEventListener('touchstart', handleFlap, { passive: false });

// ---- Game Control ----
function startGame() {
  ensureAudio();
  gameState = 'playing';
  resetBird();
  pipes = []; particles = []; trailParticles = []; floatingTexts = [];
  score = 0; isNewBest = false;
  scoreDisplay.textContent = '0';
  lastPipeSpawn = performance.now();
  screenShake = 0; flashAlpha = 0;
  generateBuildings();

  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  setTimeout(spawnPipe, 1200);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// ---- Init ----
resetBird();
gameLoop();
