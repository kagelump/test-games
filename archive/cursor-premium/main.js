(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startButton = document.getElementById("start-button");
  const scoreEl = document.getElementById("score");
  const happinessEl = document.getElementById("happiness");
  const levelEl = document.getElementById("level");
  const statusLine = document.getElementById("status-line");
  const buyHelperButton = document.getElementById("buy-helper");
  const buyOvenButton = document.getElementById("buy-oven");
  const fpsOverlay = document.getElementById("fps-overlay");

  const W = canvas.width;
  const H = canvas.height;
  const YARN = { x: 980, y: 560, r: 155 };

  const state = {
    phase: "menu",
    score: 0,
    happiness: 100,
    level: 1,
    helperKittens: 0,
    milkEngines: 0,
    player: { x: 380, y: 740, vx: 0, vy: 0, speed: 620 },
    frenzyTimer: 0,
    frenzyCooldown: 0,
    particles: [],
    enemies: [],
    flash: 0,
    flashColor: "#ffffff",
    shake: 0,
    hitStop: 0,
    yarnPulse: 0,
    elapsed: 0,
    vacuumSpawnTimer: 0,
    nextVacuumIn: 9.5,
    clickCount: 0,
    fps: 60,
    showFps: false
  };

  const keys = Object.create(null);
  const touchActions = { up: false, down: false, left: false, right: false };
  let audioCtx = null;
  let musicNodes = null;
  let lastFrame = performance.now();
  let fpsSampleTime = 0;
  let fpsSampleFrames = 0;
  let animationHandle = 0;

  window.__gameLogs = [];
  function log(category, message, data) {
    window.__gameLogs.push({
      time: Number(performance.now().toFixed(2)),
      category,
      message,
      data: data || {}
    });
  }

  function updatePublicGameState() {
    window.gameState = {
      phase: state.phase,
      score: Math.floor(state.score),
      playerPos: { x: Number(state.player.x.toFixed(1)), y: Number(state.player.y.toFixed(1)) },
      entities: state.enemies.map((enemy) => ({
        type: enemy.type,
        x: Number(enemy.x.toFixed(1)),
        y: Number(enemy.y.toFixed(1)),
        hp: Number(enemy.hp.toFixed(1))
      })),
      fps: Math.round(state.fps)
    };
  }

  function updateHud() {
    scoreEl.textContent = String(Math.floor(state.score));
    happinessEl.textContent = String(Math.max(0, Math.floor(state.happiness)));
    levelEl.textContent = String(state.level);
    const frenzy = state.frenzyTimer > 0 ? "FRENZY!" : "Normal";
    statusLine.textContent = `Mode: ${frenzy} | Helpers: ${state.helperKittens} | Engines: ${state.milkEngines}`;
    buyHelperButton.textContent = `Adopt Helper Kitten (Q) — ${helperCost()}`;
    buyOvenButton.textContent = `Warm Milk Engine (E) — ${ovenCost()}`;
  }

  function helperCost() {
    return 50 + state.helperKittens * 40;
  }

  function ovenCost() {
    return 120 + state.milkEngines * 80;
  }

  function showOverlay(title, text, cta) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startButton.textContent = cta;
    overlay.classList.add("visible");
  }

  function hideOverlay() {
    overlay.classList.remove("visible");
  }

  function resetRun() {
    state.phase = "playing";
    state.score = 0;
    state.happiness = 100;
    state.level = 1;
    state.helperKittens = 0;
    state.milkEngines = 0;
    state.player.x = 380;
    state.player.y = 740;
    state.frenzyTimer = 0;
    state.frenzyCooldown = 0;
    state.particles.length = 0;
    state.enemies.length = 0;
    state.flash = 0;
    state.shake = 0;
    state.hitStop = 0;
    state.yarnPulse = 0;
    state.elapsed = 0;
    state.vacuumSpawnTimer = 0;
    state.nextVacuumIn = 8 + Math.random() * 5;
    state.clickCount = 0;
    hideOverlay();
    log("phase", "game_started");
  }

  function winGame() {
    if (state.phase !== "playing") return;
    state.phase = "won";
    state.flash = 0.9;
    state.flashColor = "#9eff9e";
    playSuccessSfx();
    showOverlay(
      "Whiskers Wins!",
      "You crowned Captain Whiskers with a mountain of treats. Tap start to chase a higher score.",
      "Play Again"
    );
    log("phase", "game_won", { score: Math.floor(state.score) });
  }

  function loseGame(reason) {
    if (state.phase !== "playing") return;
    state.phase = "lost";
    state.flash = 0.85;
    state.flashColor = "#ff6f6f";
    playFailSfx();
    showOverlay(
      "Sir Vacuum Triumphs...",
      "Whiskers lost all happiness. Protect your hoard and meow louder next run.",
      "Retry"
    );
    log("phase", "game_lost", { reason: reason || "unknown" });
  }

  function ensureAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startAmbientMusic();
  }

  function nowSec() {
    return audioCtx ? audioCtx.currentTime : 0;
  }

  function tone(freq, duration, gain, type, attack, release) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "triangle";
    osc.frequency.value = freq;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(audioCtx.destination);
    const t0 = nowSec();
    const a = attack || 0.01;
    const r = release || 0.08;
    g.gain.cancelScheduledValues(t0);
    g.gain.linearRampToValueAtTime(gain, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + r);
    osc.start(t0);
    osc.stop(t0 + duration + r + 0.01);
  }

  function playClickSfx(crit) {
    if (!audioCtx) return;
    tone(crit ? 760 : 540, 0.05, 0.06, "square", 0.005, 0.04);
    tone(crit ? 980 : 720, 0.03, 0.03, "triangle", 0.003, 0.03);
  }

  function playSuccessSfx() {
    if (!audioCtx) return;
    tone(440, 0.08, 0.08, "triangle", 0.006, 0.06);
    setTimeout(() => tone(660, 0.1, 0.07, "triangle", 0.006, 0.08), 70);
    setTimeout(() => tone(880, 0.12, 0.07, "triangle", 0.006, 0.1), 140);
  }

  function playFailSfx() {
    if (!audioCtx) return;
    tone(240, 0.1, 0.08, "sawtooth", 0.005, 0.08);
    setTimeout(() => tone(170, 0.14, 0.06, "sawtooth", 0.005, 0.08), 90);
  }

  function startAmbientMusic() {
    if (!audioCtx || musicNodes) return;
    const master = audioCtx.createGain();
    master.gain.value = 0.016;
    master.connect(audioCtx.destination);

    const drone = audioCtx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 146.83;
    drone.connect(master);
    drone.start();

    const pulse = audioCtx.createOscillator();
    const pulseGain = audioCtx.createGain();
    pulse.type = "triangle";
    pulse.frequency.value = 220;
    pulseGain.gain.value = 0.0001;
    pulse.connect(pulseGain);
    pulseGain.connect(master);
    pulse.start();

    let beat = 0;
    const pattern = [0.03, 0.0001, 0.018, 0.0001, 0.026, 0.0001];
    function schedulePulse() {
      if (!audioCtx || !musicNodes) return;
      const t = nowSec();
      const value = pattern[beat % pattern.length];
      pulseGain.gain.cancelScheduledValues(t);
      pulseGain.gain.linearRampToValueAtTime(value, t + 0.06);
      beat += 1;
      setTimeout(schedulePulse, 360);
    }
    musicNodes = { master, drone, pulse, pulseGain };
    schedulePulse();
  }

  function spawnParticle(x, y, color, amount) {
    for (let i = 0; i < amount; i += 1) {
      const speed = 70 + Math.random() * 250;
      const a = Math.random() * Math.PI * 2;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.45 + Math.random() * 0.45,
        color: color || "#ffd18a"
      });
    }
  }

  function spawnVacuumBot() {
    const hp = 16 + state.level * 4;
    const enemy = {
      type: "sir-vacuum",
      x: 1600 + Math.random() * 180,
      y: 600 + Math.random() * 280,
      vx: -110 - Math.random() * 70,
      hp,
      maxHp: hp,
      stealTick: 0
    };
    state.enemies.push(enemy);
    state.flash = 0.3;
    state.flashColor = "#ffda93";
    log("enemy", "vacuum_spawned", { hp: enemy.hp });
  }

  function scaleMouseToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * sx,
      y: (event.clientY - rect.top) * sy
    };
  }

  function onYarnClicked(x, y) {
    if (state.phase !== "playing") return;
    const dx = x - YARN.x;
    const dy = y - YARN.y;
    if (dx * dx + dy * dy > YARN.r * YARN.r) return;
    state.clickCount += 1;
    const crit = Math.random() < 0.16;
    const base = 1 + state.level * 0.35;
    const frenzyMul = state.frenzyTimer > 0 ? 2.2 : 1;
    const gain = base * frenzyMul * (crit ? 3 : 1);
    state.score += gain;
    state.yarnPulse = Math.min(1.35, state.yarnPulse + 0.27);
    spawnParticle(x, y, crit ? "#fff59f" : "#ffd18a", crit ? 26 : 12);
    playClickSfx(crit);
    if (crit) {
      state.hitStop = 0.045;
      state.shake = 7;
      state.flash = 0.42;
      state.flashColor = "#fff5a8";
      log("action", "critical_click", { gain: Number(gain.toFixed(2)) });
    } else {
      log("action", "yarn_click", { gain: Number(gain.toFixed(2)) });
    }
  }

  function hitEnemyAt(x, y) {
    if (state.phase !== "playing") return false;
    let hit = false;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      const ex = enemy.x - x;
      const ey = enemy.y - y;
      if (ex * ex + ey * ey <= 110 * 110) {
        const dmg = state.frenzyTimer > 0 ? 8 : 5;
        enemy.hp -= dmg;
        state.shake = 10;
        state.flash = 0.3;
        state.flashColor = "#ff9f80";
        spawnParticle(enemy.x, enemy.y, "#ffb08c", 18);
        log("combat", "vacuum_hit", { damage: dmg, hp: Number(enemy.hp.toFixed(2)) });
        hit = true;
        if (enemy.hp <= 0) {
          state.score += 25 + state.level * 6;
          state.happiness = Math.min(100, state.happiness + 9);
          spawnParticle(enemy.x, enemy.y, "#b3ffbf", 38);
          playSuccessSfx();
          state.enemies.splice(i, 1);
          log("combat", "vacuum_defeated", { score: Math.floor(state.score) });
        }
        break;
      }
    }
    return hit;
  }

  function activateFrenzy() {
    if (state.phase !== "playing") return;
    if (state.frenzyCooldown > 0) return;
    state.frenzyTimer = 6;
    state.frenzyCooldown = 16;
    state.flash = 0.35;
    state.flashColor = "#9fd2ff";
    spawnParticle(state.player.x, state.player.y, "#9fd2ff", 30);
    log("action", "frenzy_activated");
    playSuccessSfx();
  }

  function tryBuyHelper() {
    if (state.phase !== "playing") return;
    const cost = helperCost();
    if (state.score < cost) {
      playFailSfx();
      log("shop", "buy_helper_failed", { score: Math.floor(state.score), cost });
      return;
    }
    state.score -= cost;
    state.helperKittens += 1;
    log("shop", "buy_helper_success", { level: state.helperKittens });
    playSuccessSfx();
  }

  function tryBuyOven() {
    if (state.phase !== "playing") return;
    const cost = ovenCost();
    if (state.score < cost) {
      playFailSfx();
      log("shop", "buy_oven_failed", { score: Math.floor(state.score), cost });
      return;
    }
    state.score -= cost;
    state.milkEngines += 1;
    log("shop", "buy_oven_success", { level: state.milkEngines });
    playSuccessSfx();
  }

  function applyMovement(dt) {
    const left = keys.ArrowLeft || keys.a || keys.A || touchActions.left;
    const right = keys.ArrowRight || keys.d || keys.D || touchActions.right;
    const up = keys.ArrowUp || keys.w || keys.W || touchActions.up;
    const down = keys.ArrowDown || keys.s || keys.S || touchActions.down;
    state.player.vx = 0;
    state.player.vy = 0;
    if (left) state.player.vx -= state.player.speed;
    if (right) state.player.vx += state.player.speed;
    if (up) state.player.vy -= state.player.speed;
    if (down) state.player.vy += state.player.speed;

    if (state.player.vx !== 0 && state.player.vy !== 0) {
      state.player.vx *= 0.707;
      state.player.vy *= 0.707;
    }
    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;
    state.player.x = Math.min(W - 120, Math.max(120, state.player.x));
    state.player.y = Math.min(H - 120, Math.max(170, state.player.y));
  }

  function updatePlaying(dt) {
    if (state.hitStop > 0) {
      state.hitStop -= dt;
      return;
    }

    state.elapsed += dt;
    state.vacuumSpawnTimer += dt;

    if (state.vacuumSpawnTimer >= state.nextVacuumIn) {
      spawnVacuumBot();
      state.vacuumSpawnTimer = 0;
      state.nextVacuumIn = Math.max(5.5, 11 - state.level * 0.5 + Math.random() * 2.8);
    }

    applyMovement(dt);

    const passiveIncome = state.helperKittens * 2.2 + state.milkEngines * 4.5;
    state.score += passiveIncome * dt;

    const passiveMoodLoss = 1.6 + state.enemies.length * 2.3;
    state.happiness -= passiveMoodLoss * dt;

    if (state.frenzyTimer > 0) state.frenzyTimer -= dt;
    if (state.frenzyCooldown > 0) state.frenzyCooldown -= dt;
    if (state.flash > 0) state.flash -= dt * 1.5;
    state.shake = Math.max(0, state.shake - dt * 35);
    state.yarnPulse = Math.max(0, state.yarnPulse - dt * 3.5);

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.x += enemy.vx * dt;
      if (enemy.x < 990) {
        enemy.x = 990;
        enemy.vx = 0;
      }
      enemy.stealTick += dt;
      if (enemy.stealTick > 1.3) {
        enemy.stealTick = 0;
        state.score = Math.max(0, state.score - (6 + state.level));
        state.happiness -= 4.7;
        state.shake = 13;
        state.flash = 0.32;
        state.flashColor = "#ff7f7f";
        spawnParticle(YARN.x + Math.random() * 40 - 20, YARN.y + Math.random() * 40 - 20, "#ff9f80", 12);
        log("enemy", "vacuum_stole_treats", { score: Math.floor(state.score), happiness: Math.floor(state.happiness) });
      }
      if (enemy.hp <= 0) {
        state.enemies.splice(i, 1);
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + 20 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    state.level = 1 + Math.floor(state.score / 150) + state.helperKittens + state.milkEngines;

    if (state.happiness <= 0) {
      loseGame("happiness_zero");
    }

    if (state.score >= 700 && state.helperKittens >= 3 && state.milkEngines >= 2) {
      winGame();
    }
  }

  function drawBackground() {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#2f2450");
    grd.addColorStop(1, "#1b1530");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 24; i += 1) {
      const x = (i * 137 + Math.sin(state.elapsed * 0.4 + i) * 45 + 80) % W;
      const y = 130 + (i * 71) % (H - 220);
      ctx.fillStyle = "rgba(255, 214, 164, 0.08)";
      ctx.beginPath();
      ctx.arc(x, y, 8 + (i % 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawYarnCookie() {
    const pulse = 1 + Math.sin(state.elapsed * 8) * 0.014 + state.yarnPulse * 0.18;
    ctx.save();
    ctx.translate(YARN.x, YARN.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#d18b53";
    ctx.beginPath();
    ctx.arc(0, 0, YARN.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffe1b5";
    ctx.lineWidth = 5;
    for (let i = -130; i <= 130; i += 34) {
      ctx.beginPath();
      ctx.arc(i * 0.35, i * 0.2, YARN.r - Math.abs(i) * 0.2, 0.4, Math.PI * 1.8);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(-40, -50, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCat(x, y, scale) {
    const bob = Math.sin(state.elapsed * 8) * 3;
    const sx = scale || 1;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(sx, sx);

    ctx.fillStyle = "#f3b777";
    ctx.beginPath();
    ctx.ellipse(0, 34, 74, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f7c58d";
    ctx.beginPath();
    ctx.ellipse(0, 10, 62, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f3b777";
    ctx.beginPath();
    ctx.moveTo(-46, -18);
    ctx.lineTo(-78, -78);
    ctx.lineTo(-22, -42);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(46, -18);
    ctx.lineTo(78, -78);
    ctx.lineTo(22, -42);
    ctx.fill();

    ctx.fillStyle = "#5f3a23";
    ctx.beginPath();
    ctx.arc(-22, 4, 8, 0, Math.PI * 2);
    ctx.arc(22, 4, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2f1d14";
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-8, 26);
    ctx.lineTo(8, 26);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#8f4e26";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-9, 32);
    ctx.quadraticCurveTo(0, 38, 9, 32);
    ctx.stroke();

    ctx.strokeStyle = "#8b5f38";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const oy = 18 + i * 6;
      ctx.beginPath();
      ctx.moveTo(-20, oy);
      ctx.lineTo(-54, oy - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, oy);
      ctx.lineTo(54, oy - 4);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffdd6e";
    if (state.frenzyTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, -82, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3b2e16";
      ctx.font = "900 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", 0, -76);
    }
    ctx.restore();
  }

  function drawVacuum(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = "#7b86a6";
    ctx.beginPath();
    ctx.roundRect(-96, -58, 166, 116, 28);
    ctx.fill();
    ctx.fillStyle = "#4f5d81";
    ctx.beginPath();
    ctx.arc(-35, 0, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff938e";
    ctx.beginPath();
    ctx.arc(30, -16, 14, 0, Math.PI * 2);
    ctx.arc(58, -16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fce5e2";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, 14);
    ctx.quadraticCurveTo(44, 30, 70, 14);
    ctx.stroke();
    ctx.fillStyle = "#d8e3ff";
    ctx.fillRect(-24, -74, 106, 12);
    ctx.fillStyle = "#60d46e";
    const hpW = Math.max(0, (enemy.hp / enemy.maxHp) * 106);
    ctx.fillRect(-24, -74, hpW, 12);
    ctx.restore();
  }

  function drawParticles() {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color.replace(")", "");
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + alpha * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawLabels() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(805, 722, 360, 62);
    ctx.fillStyle = "#fff1c7";
    ctx.textAlign = "center";
    ctx.font = "700 30px sans-serif";
    ctx.fillText("Tap The Sacred Yarn", 985, 762);
  }

  function draw() {
    const shakeX = state.shake > 0 ? (Math.random() * 2 - 1) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() * 2 - 1) * state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawYarnCookie();
    drawCat(state.player.x, state.player.y, 1);
    for (let i = 0; i < state.helperKittens; i += 1) {
      const hx = 220 + (i % 4) * 120;
      const hy = 280 + Math.floor(i / 4) * 110;
      drawCat(hx, hy, 0.55);
    }
    for (let i = 0; i < state.enemies.length; i += 1) {
      drawVacuum(state.enemies[i]);
    }
    drawParticles();
    drawLabels();

    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = state.flashColor;
      ctx.globalAlpha = Math.min(0.35, state.flash);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - lastFrame) / 1000);
    lastFrame = now;

    fpsSampleTime += dt;
    fpsSampleFrames += 1;
    if (fpsSampleTime >= 0.35) {
      state.fps = fpsSampleFrames / fpsSampleTime;
      fpsSampleFrames = 0;
      fpsSampleTime = 0;
      fpsOverlay.textContent = `FPS: ${Math.round(state.fps)}`;
    }

    if (state.phase === "playing") {
      updatePlaying(dt);
    } else {
      if (state.flash > 0) state.flash -= dt * 1.1;
      state.yarnPulse = Math.max(0, state.yarnPulse - dt * 2);
    }

    draw();
    updateHud();
    updatePublicGameState();
    animationHandle = requestAnimationFrame(tick);
  }

  function primaryActionFromPointer(event) {
    ensureAudioContext();
    const point = scaleMouseToCanvas(event);
    const enemyHit = hitEnemyAt(point.x, point.y);
    if (!enemyHit) onYarnClicked(point.x, point.y);
  }

  canvas.addEventListener("pointerdown", primaryActionFromPointer);

  document.addEventListener("keydown", (event) => {
    keys[event.key] = true;
    if (event.key === " ") {
      event.preventDefault();
      activateFrenzy();
    } else if (event.key === "q" || event.key === "Q") {
      tryBuyHelper();
    } else if (event.key === "e" || event.key === "E") {
      tryBuyOven();
    } else if (event.key === "`" || event.key === "~") {
      state.showFps = !state.showFps;
      fpsOverlay.classList.toggle("visible", state.showFps);
      log("ui", "fps_toggled", { show: state.showFps });
    }
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });

  startButton.addEventListener("click", () => {
    ensureAudioContext();
    if (state.phase === "menu" || state.phase === "won" || state.phase === "lost") {
      resetRun();
    }
  });

  buyHelperButton.addEventListener("click", () => {
    ensureAudioContext();
    tryBuyHelper();
  });

  buyOvenButton.addEventListener("click", () => {
    ensureAudioContext();
    tryBuyOven();
  });

  function setTouchAction(action, active) {
    if (action === "pounce" && active) {
      ensureAudioContext();
      activateFrenzy();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(touchActions, action)) {
      touchActions[action] = active;
    }
  }

  const touchButtons = Array.from(document.querySelectorAll(".touch-pad button"));
  touchButtons.forEach((button) => {
    const action = button.getAttribute("data-action");
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setTouchAction(action, true);
    });
    button.addEventListener("pointerup", () => setTouchAction(action, false));
    button.addEventListener("pointercancel", () => setTouchAction(action, false));
    button.addEventListener("pointerleave", () => setTouchAction(action, false));
  });

  // DEV_CHEATS_START
  window.devCheats = {
    skipToWin() {
      state.score = 999;
      state.helperKittens = Math.max(3, state.helperKittens);
      state.milkEngines = Math.max(2, state.milkEngines);
      winGame();
      log("cheat", "skip_to_win");
    },
    skipToLose() {
      state.happiness = 0;
      loseGame("dev_cheat");
      log("cheat", "skip_to_lose");
    },
    setLevel(level) {
      const l = Math.max(1, Number(level) || 1);
      state.level = l;
      state.score = Math.max(state.score, (l - 1) * 150);
      log("cheat", "set_level", { level: l });
    },
    spawnEnemy() {
      spawnVacuumBot();
      log("cheat", "spawn_enemy");
    }
  };
  // DEV_CHEATS_END

  showOverlay(
    "Captain Whiskers: Yarn Hoard",
    "Click the giant yarn to farm treats, buy helpers with Q/E, and defeat Sir Vacuum before happiness runs out.",
    "Press Start"
  );
  log("phase", "menu_loaded");
  updateHud();
  updatePublicGameState();
  animationHandle = requestAnimationFrame(tick);

  window.addEventListener("beforeunload", () => {
    if (animationHandle) cancelAnimationFrame(animationHandle);
  });
})();
