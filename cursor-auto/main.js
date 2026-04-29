(function () {
  'use strict';

  // Quiet console during normal play (no stray logs / noise)
  console.log = function () {};
  console.debug = function () {};
  console.info = function () {};

  const DESIGN_W = 1920;
  const DESIGN_H = 1080;
  const WIN_TARGET = 7200;
  const BASE_DRAIN = 2.65;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudDom = document.getElementById('hud-dom');

  const logs = [];
  function log(category, message, data) {
    logs.push({ t: performance.now(), category, message, data });
    if (logs.length > 240) logs.shift();
  }

  const imgs = {
    cookie: new Image(),
    dog: new Image(),
    bg: new Image(),
    helper: new Image(),
    fish: new Image(),
  };

  imgs.cookie.src = 'assets/player_cookie.png';
  imgs.dog.src = 'assets/enemy_dog.png';
  imgs.bg.src = 'assets/bg_room.png';
  imgs.helper.src = 'assets/helper_cat.png';
  imgs.fish.src = 'assets/fish_treat.png';

  let assetsReady = false;
  Promise.all(
    Object.values(imgs).map(
      (img) =>
        new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('asset:' + img.src));
        })
    )
  ).then(() => {
    assetsReady = true;
    log('game', 'assets_loaded', {});
  });

  /** Game phases */
  let phase = 'menu';

  let treats = 0;
  let treatsLifetime = 0;
  let happiness = 100;

  /** Cookie anchor + WASD nudge offset */
  const cookieBase = { x: DESIGN_W * 0.42, y: DESIGN_H * 0.52 };
  let cookieNudge = { x: 0, y: 0 };

  window.gameState = {
    phase: 'menu',
    score: 0,
    playerPos: { x: cookieBase.x, y: cookieBase.y },
    entities: [],
    fps: 60,
  };

  let pawsLevel = 0;
  let chefLevel = 0;
  let cozyLevel = 0;
  let bellLevel = 0;

  /** Timing */
  let lastT = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let smoothedFps = 60;
  let dogSpawnTimer = 6;

  /** Juice */
  let shake = 0;
  let squash = 0;
  let hitStopMs = 0;
  let flashColor = null;
  let flashT = 0;

  /** Entities */
  /** @type {{ x:number,y:number,vx:number,w:number,h:number, stole:boolean, cooldown:number }[]} */
  const dogs = [];

  /** @type {{ x:number,y:number,vx:number,vy:number,life:number,hue:number }[]} */
  const particles = [];

  /** Dog steal cadence */
  let ambientGainNode = null;
  let audioStarted = false;
  let audioCtx = null;

  function treatsPerClick() {
    let base = 1 + pawsLevel;
    const crit = bellLevel > 0 && Math.random() < 0.08 + bellLevel * 0.02;
    if (crit) base *= 2;
    return Math.max(1, Math.floor(base));
  }

  function autoTreatsPerSec() {
    return chefLevel * 2.2 + cozyLevel * 0.4;
  }

  function happinessDrainRate() {
    let r = BASE_DRAIN;
    r *= Math.pow(0.88, cozyLevel);
    return Math.max(0.35, r);
  }

  function upgradeCost(kind, levelOwned) {
    const bases = { paws: 22, chef: 95, cozy: 380, bell: 900 };
    return Math.floor(bases[kind] * Math.pow(1.17, levelOwned));
  }

  const btnMenuStart = { x: 760, y: 560, w: 400, h: 96 };
  const btnRestart = { x: 760, y: 780, w: 400, h: 96 };

  /** Upgrade button rects (canvas coords) */
  function upgradeRects() {
    const left = 1240;
    let y = 220;
    const list = [
      { kind: 'paws', key: '1', level: () => pawsLevel },
      { kind: 'chef', key: '2', level: () => chefLevel },
      { kind: 'cozy', key: '3', level: () => cozyLevel },
      { kind: 'bell', key: '4', level: () => bellLevel },
    ];
    return list.map((u, i) => ({
      ...u,
      x: left,
      y: y + i * 112,
      w: 620,
      h: 96,
    }));
  }

  function cookieCenter() {
    return {
      x: cookieBase.x + cookieNudge.x,
      y: cookieBase.y + cookieNudge.y,
    };
  }

  function cookieRadius() {
    return 190;
  }

  let keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (phase === 'menu' && e.code === 'Space') startPlay();
    if ((phase === 'won' || phase === 'lost') && e.code === 'KeyR') restartFromEnd();
    if (e.code === 'Backquote') showFps = !showFps;
    if (phase === 'playing') {
      if (e.code === 'Digit1') tryPurchase('paws');
      if (e.code === 'Digit2') tryPurchase('chef');
      if (e.code === 'Digit3') tryPurchase('cozy');
      if (e.code === 'Digit4') tryPurchase('bell');
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  let showFps = false;

  function startPlay() {
    if (!assetsReady) return;
    phase = 'playing';
    treats = 0;
    treatsLifetime = 0;
    happiness = 100;
    cookieNudge = { x: 0, y: 0 };
    pawsLevel = 0;
    chefLevel = 0;
    cozyLevel = 0;
    bellLevel = 0;
    dogs.length = 0;
    particles.length = 0;
    dogSpawnTimer = 4;
    shake = 0;
    squash = 0;
    hitStopMs = 0;
    log('game', 'phase', { phase: 'playing' });
    hudDom.textContent = 'Playing';
    startAudioAmbient();
  }

  function restartFromEnd() {
    phase = 'menu';
    log('game', 'phase', { phase: 'menu' });
    hudDom.textContent = 'Menu';
  }

  function enterWin() {
    if (phase !== 'playing') return;
    phase = 'won';
    log('game', 'phase', { phase: 'won' });
    hudDom.textContent = 'You won!';
    playSfx('win');
    flashColor = 'rgba(255,240,180,0.55)';
    flashT = 0.35;
  }

  function enterLose() {
    if (phase !== 'playing') return;
    phase = 'lost';
    log('game', 'phase', { phase: 'lost' });
    hudDom.textContent = 'Cat feels neglected!';
    playSfx('lose');
    flashColor = 'rgba(120,80,160,0.45)';
    flashT = 0.4;
    shake = 22;
  }

  function tryPurchase(kind) {
    let lvl = 0;
    if (kind === 'paws') lvl = pawsLevel;
    if (kind === 'chef') lvl = chefLevel;
    if (kind === 'cozy') lvl = cozyLevel;
    if (kind === 'bell') lvl = bellLevel;
    const cost = upgradeCost(kind, lvl);
    if (treats >= cost) {
      treats -= cost;
      if (kind === 'paws') pawsLevel++;
      if (kind === 'chef') chefLevel++;
      if (kind === 'cozy') cozyLevel++;
      if (kind === 'bell') bellLevel++;
      squash = Math.min(0.14, squash + 0.06);
      log('upgrade', 'purchase', { kind, cost });
      playSfx('buy');
    }
  }

  function spawnDog(forceX) {
    dogs.push({
      x: typeof forceX === 'number' ? forceX : DESIGN_W + 160,
      y: 760 + Math.sin(treatsLifetime * 0.001) * 28,
      vx: -260 - Math.random() * 90,
      w: 140,
      h: 110,
      stole: false,
      cooldown: 0,
    });
    log('game', 'dog_spawn', {});
  }

  function burstParticles(cx, cy, n, hue) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 330;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.35,
        hue,
      });
    }
  }

  function playSfx(kind) {
    if (!audioCtx) return;
    const ac = audioCtx;
    const now = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);
    g.gain.value = 0;

    if (kind === 'click') {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(660, now);
      o.frequency.exponentialRampToValueAtTime(980, now + 0.06);
      o.connect(g);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      o.start(now);
      o.stop(now + 0.1);
    } else if (kind === 'buy') {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, now);
      o.frequency.linearRampToValueAtTime(740, now + 0.08);
      o.connect(g);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      o.start(now);
      o.stop(now + 0.15);
    } else if (kind === 'steal') {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, now);
      o.frequency.linearRampToValueAtTime(140, now + 0.15);
      o.connect(g);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.start(now);
      o.stop(now + 0.2);
    } else if (kind === 'win') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        const t0 = now + i * 0.06;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
        o.start(t0);
        o.stop(t0 + 0.6);
      });
    } else if (kind === 'lose') {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(360, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.45);
      o.connect(g);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      o.start(now);
      o.stop(now + 0.5);
    }
  }

  function startAudioAmbient() {
    if (!audioCtx) return;
    if (ambientGainNode) return;
    const ac = audioCtx;
    const master = ac.createGain();
    master.gain.value = 0.045;
    master.connect(ac.destination);

    const chord = [196, 246.94, 293.66];
    chord.forEach((freq) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const gg = ac.createGain();
      gg.gain.value = 0.33;
      o.connect(gg);
      gg.connect(master);
      o.start();
    });

    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    ambientGainNode = master;
  }

  function ensureAudio() {
    if (audioStarted) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioStarted = true;
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      ensureAudio();
      const p = screenToDesign(e.clientX, e.clientY);
      handlePointer(p.x, p.y);
    },
    { passive: true }
  );

  function screenToDesign(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = (clientX - r.left) / r.width;
    const sy = (clientY - r.top) / r.height;
    return { x: sx * DESIGN_W, y: sy * DESIGN_H };
  }

  function handlePointer(x, y) {
    if (phase === 'menu') {
      if (inside(x, y, btnMenuStart)) startPlay();
      return;
    }
    if (phase === 'won' || phase === 'lost') {
      if (inside(x, y, btnRestart)) restartFromEnd();
      return;
    }

    const cc = cookieCenter();
    const dx = x - cc.x;
    const dy = y - cc.y;
    if (dx * dx + dy * dy <= cookieRadius() * cookieRadius()) {
      const gain = treatsPerClick();
      treats += gain;
      treatsLifetime += gain;
      happiness = Math.min(100, happiness + 3.4 + cozyLevel * 0.2);
      squash = 0.18;
      shake = Math.min(14, shake + 5);
      burstParticles(cc.x, cc.y - 30, 14, 38);
      playSfx('click');
      log('game', 'tap_cookie', { gain });
      if (treats >= WIN_TARGET) enterWin();
      return;
    }

    for (const ur of upgradeRects()) {
      if (inside(x, y, ur)) tryPurchase(ur.kind);
    }
  }

  function inside(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function resizeCanvasCss() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);
    canvas.style.width = DESIGN_W * scale + 'px';
    canvas.style.height = DESIGN_H * scale + 'px';
  }

  window.addEventListener('resize', resizeCanvasCss);
  resizeCanvasCss();

  document.querySelectorAll('#touch-bar button').forEach((btn) => {
    btn.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        ensureAudio();
        if (phase !== 'playing') return;
        const d = btn.getAttribute('data-dir');
        const amt = 52;
        if (d === 'w') cookieNudge.y -= amt;
        if (d === 's') cookieNudge.y += amt;
        if (d === 'a') cookieNudge.x -= amt;
        if (d === 'd') cookieNudge.x += amt;
        const lim = 110;
        cookieNudge.x = Math.max(-lim, Math.min(lim, cookieNudge.x));
        cookieNudge.y = Math.max(-lim, Math.min(lim, cookieNudge.y));
        log('game', 'touch_nudge', { d });
      },
      { passive: false }
    );
  });

  function syncGameState() {
    const cc = cookieCenter();
    window.gameState = {
      phase,
      score: Math.floor(treats),
      playerPos: { x: cc.x, y: cc.y },
      entities: dogs.slice(0, 12).map((d, i) => ({
        type: 'dog',
        id: i,
        x: d.x,
        y: d.y,
      })),
      fps: smoothedFps,
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!assetsReady) {
      drawLoading();
      syncGameState();
      return;
    }

    let dt = Math.min(0.045, (now - lastT) / 1000);
    lastT = now;

    if (hitStopMs > 0) {
      hitStopMs -= dt * 1000;
      if (hitStopMs <= 0) hitStopMs = 0;
    }

    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      smoothedFps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }

    if (phase === 'playing') {
      const simDt = hitStopMs > 0 ? dt * 0.22 : dt;

      /** Passive treats */
      const rate = autoTreatsPerSec();
      const add = rate * simDt;
      treats += add;
      treatsLifetime += add;

      if (treats >= WIN_TARGET) {
        enterWin();
      } else {
        happiness -= happinessDrainRate() * simDt;
        if (happiness <= 0) {
          happiness = 0;
          enterLose();
        }
      }

      if (phase === 'playing') {
        /** WASD nudge cookie */
        const spd = 420 * simDt;
        if (keys['KeyW']) cookieNudge.y -= spd;
        if (keys['KeyS']) cookieNudge.y += spd;
        if (keys['KeyA']) cookieNudge.x -= spd;
        if (keys['KeyD']) cookieNudge.x += spd;
        const lim = 110;
        cookieNudge.x = Math.max(-lim, Math.min(lim, cookieNudge.x));
        cookieNudge.y = Math.max(-lim, Math.min(lim, cookieNudge.y));

        /** Spawn dogs */
        dogSpawnTimer -= simDt;
        if (dogSpawnTimer <= 0) {
          spawnDog();
          dogSpawnTimer = 14 + Math.random() * 8;
        }

        /** Move dogs + steal */
        const cc = cookieCenter();
        const R = cookieRadius() + 90;
        for (const d of dogs) {
          d.x += d.vx * simDt;
          d.cooldown -= simDt;
          const dx = d.x - cc.x;
          const dy = d.y + d.h * 0.35 - cc.y;
          if (dx * dx + dy * dy < R * R && d.cooldown <= 0) {
            const steal = Math.min(treats, 28 + Math.floor(Math.random() * 34));
            treats = Math.max(0, treats - steal);
            shake = 26;
            hitStopMs = 70;
            burstParticles(cc.x + 120, cc.y, 10, 300);
            playSfx('steal');
            flashColor = 'rgba(255,130,180,0.35)';
            flashT = 0.22;
            d.cooldown = 0.85;
            log('game', 'dog_steal', { steal });
          }
        }
        for (let i = dogs.length - 1; i >= 0; i--) {
          if (dogs[i].x < -260) dogs.splice(i, 1);
        }

        /** Particles */
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= simDt;
          p.x += p.vx * simDt;
          p.y += p.vy * simDt;
          p.vy += 540 * simDt;
          if (p.life <= 0) particles.splice(i, 1);
        }

        /** Juice decay */
        shake *= Math.pow(0.82, simDt * 60);
        squash = squash * Math.pow(0.72, simDt * 60);
      }
      if (flashT > 0) flashT -= dt;
    }

    drawScene(dt);
    syncGameState();
  }

  function drawLoading() {
    ctx.save();
    ctx.fillStyle = '#1b1628';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    ctx.fillStyle = '#f4eedd';
    ctx.font = 'bold 52px system-ui,sans-serif';
    ctx.fillText('Summoning treats…', 720, 520);
    ctx.restore();
  }

  function drawScene(dt) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);

    const sh = (Math.random() - 0.5) * 2 * shake;
    ctx.translate(DESIGN_W / 2 + sh, DESIGN_H / 2 + sh * 0.35);
    ctx.translate(-DESIGN_W / 2, -DESIGN_H / 2);

    /** Background cover */
    const iw = imgs.bg.width;
    const ih = imgs.bg.height;
    const s = Math.max(DESIGN_W / iw, DESIGN_H / ih);
    const bw = iw * s;
    const bh = ih * s;
    ctx.drawImage(imgs.bg, (DESIGN_W - bw) / 2, (DESIGN_H - bh) / 2, bw, bh);

    /** Side vignette */
    const vg = ctx.createRadialGradient(
      DESIGN_W * 0.48,
      DESIGN_H * 0.45,
      DESIGN_H * 0.12,
      DESIGN_W * 0.48,
      DESIGN_H * 0.45,
      DESIGN_H * 0.85
    );
    vg.addColorStop(0, 'rgba(24,18,38,0)');
    vg.addColorStop(1, 'rgba(12,8,18,0.58)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    if (phase === 'menu') {
      drawMenuOverlay();
      ctx.restore();
      if (showFps) drawFpsOverlay();
      return;
    }

    /** Playing / overlay states draw cookie area */
    const cc = cookieCenter();

    /** Dogs behind cookie slightly */
    for (const d of dogs) {
      ctx.drawImage(imgs.dog, d.x, d.y, d.w, d.h);
    }

    /** Cookie squash */
    const sc = 1 - Math.min(0.22, squash);
    ctx.save();
    ctx.translate(cc.x, cc.y);
    ctx.scale(1, sc);
    ctx.translate(-cc.x, -cc.y);
    const cw = 430;
    ctx.drawImage(imgs.cookie, cc.x - cw / 2, cc.y - cw / 2, cw, cw);
    ctx.restore();

    /** Particles */
    for (const p of particles) {
      ctx.fillStyle = `hsla(${p.hue},90%,68%,${Math.max(0, p.life * 1.8)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7 + p.life * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    /** Treat meter ring */
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(20,12,30,0.55)';
    ctx.beginPath();
    ctx.arc(cc.x, cc.y - 10, 246, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffb86b';
    ctx.beginPath();
    ctx.arc(
      cc.x,
      cc.y - 10,
      246,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.min(1, treats / WIN_TARGET) * Math.PI * 2 || 0)
    );
    ctx.stroke();

    /** HUD top */
    ctx.fillStyle = 'rgba(255,248,236,0.98)';
    ctx.font = 'bold 46px system-ui,sans-serif';
    ctx.fillText('Purr points', 72, 92);
    ctx.font = 'bold 60px system-ui,sans-serif';
    ctx.fillText(`${Math.floor(treats)} / ${WIN_TARGET}`, 72, 154);

    ctx.drawImage(imgs.fish, 48, 172, 72, 72);
    ctx.font = 'bold 38px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,228,200,0.95)';
    ctx.fillText(`Happiness ${happiness.toFixed(0)}%`, 140, 226);

    ctx.font = '600 28px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(230,220,255,0.9)';
    ctx.fillText('Chef helpers boost idle treats · Cozy slows sadness · Bell adds sparkly crit taps', 72, DESIGN_H - 58);

    /** Helper portrait stack */
    ctx.drawImage(imgs.helper, DESIGN_W - 240, 72, 168, 168);

    /** Upgrade panel */
    ctx.fillStyle = 'rgba(22,14,36,0.55)';
    ctx.fillRect(1210, 160, 658, 760);
    ctx.fillStyle = '#fff7ea';
    ctx.font = '800 44px system-ui,sans-serif';
    ctx.fillText('Treat upgrades', 1260, 222);

    upgradeRects().forEach((ur, idx) => {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,230,200,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRect(ctx, ur.x, ur.y, ur.w, ur.h, 18);
      ctx.fill();
      ctx.stroke();

      const names = {
        paws: 'Butter paws — stronger taps',
        chef: 'Chef kitty — idle treats/sec',
        cozy: 'Blanket fort — slower sadness',
        bell: 'Golden bell — sparkly crit luck',
      };
      const lvl = ur.level();
      const cost = upgradeCost(ur.kind, lvl);
      ctx.fillStyle = '#fffdf8';
      ctx.font = '700 30px system-ui,sans-serif';
      ctx.fillText(names[ur.kind], ur.x + 24, ur.y + 40);
      ctx.font = '600 26px system-ui,sans-serif';
      ctx.fillStyle = treats >= cost ? '#ffe9c9' : '#bba49c';
      ctx.fillText(`Lvl ${lvl} · Next ${cost} treats · Key ${ur.key}`, ur.x + 24, ur.y + 76);
    });

    /** Control hints */
    ctx.fillStyle = 'rgba(240,230,255,0.92)';
    ctx.font = '600 28px system-ui,sans-serif';
    ctx.fillText('Controls: tap yarn cookie · WASD nudge · Keys 1–4 buy upgrades · Space starts · ~ FPS', 72, DESIGN_H - 18);

    /** Phase overlays */
    if (phase === 'won') drawEndOverlay(true);
    if (phase === 'lost') drawEndOverlay(false);

    ctx.restore();

    if (flashT > 0 && flashColor) {
      ctx.save();
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
      ctx.restore();
    }

    if (showFps) drawFpsOverlay();
  }

  function roundRect(ctx2, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx2.moveTo(x + rr, y);
    ctx2.arcTo(x + w, y, x + w, y + h, rr);
    ctx2.arcTo(x + w, y + h, x, y + h, rr);
    ctx2.arcTo(x, y + h, x, y, rr);
    ctx2.arcTo(x, y, x + w, y, rr);
    ctx2.closePath();
  }

  function drawMenuOverlay() {
    ctx.fillStyle = 'rgba(12,8,18,0.55)';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    const cx = DESIGN_W / 2;
    ctx.fillStyle = '#fff9ee';
    ctx.font = '900 88px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CATNIP COOKIE', cx, 320);
    ctx.font = '700 46px system-ui,sans-serif';
    ctx.fillStyle = '#ffd9aa';
    ctx.fillText('Treat Tapper — keep happiness high, earn treats, shoo treat thieves', cx, 392);

    ctx.drawImage(imgs.cookie, cx - 220, 400, 440, 440);

    ctx.fillStyle = 'rgba(255,248,236,0.96)';
    ctx.strokeStyle = 'rgba(255,210,160,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    roundRect(ctx, btnMenuStart.x, btnMenuStart.y, btnMenuStart.w, btnMenuStart.h, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2438';
    ctx.font = '800 52px system-ui,sans-serif';
    ctx.fillText('START — SPACE / TAP', cx, btnMenuStart.y + 64);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(240,230,255,0.92)';
    ctx.font = '600 30px system-ui,sans-serif';
    ctx.fillText('Goal: reach treat goal · Sadness wins if happiness hits 0%', 96, DESIGN_H - 92);
    ctx.fillText('Enemy dogs swipe treats — keep tapping & upgrading!', 96, DESIGN_H - 54);
  }

  function drawEndOverlay(win) {
    ctx.fillStyle = 'rgba(12,8,18,0.62)';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    ctx.fillStyle = '#fff8ee';
    ctx.font = '900 84px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(win ? 'Royal Feast unlocked!' : 'Your cat noticed…', DESIGN_W / 2, 420);
    ctx.font = '700 40px system-ui,sans-serif';
    ctx.fillStyle = '#ffd7bc';
    ctx.fillText(
      win ? `Treat bank: ${Math.floor(treats)} / ${WIN_TARGET}` : 'Happiness hit zero — give more chin scritches next time.',
      DESIGN_W / 2,
      492
    );

    ctx.fillStyle = 'rgba(255,248,236,0.96)';
    ctx.strokeStyle = 'rgba(255,210,160,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    roundRect(ctx, btnRestart.x, btnRestart.y, btnRestart.w, btnRestart.h, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2438';
    ctx.font = '800 46px system-ui,sans-serif';
    ctx.fillText('MENU — TAP / R', DESIGN_W / 2, btnRestart.y + 60);
    ctx.textAlign = 'left';
  }

  function drawFpsOverlay() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(DESIGN_W - 220, 26, 190, 52);
    ctx.fillStyle = '#bfffcf';
    ctx.font = '600 28px ui-monospace, monospace';
    ctx.fillText(`${smoothedFps} FPS`, DESIGN_W - 198, 62);
    ctx.restore();
  }

  requestAnimationFrame(frame);

  /* <DEV_CHEATS_BEGIN> */
  window.devCheats = {
    skipToWin() {
      ensureAudio();
      treats = WIN_TARGET;
      happiness = 100;
      phase = 'playing';
      enterWin();
    },
    skipToLose() {
      ensureAudio();
      happiness = 0;
      phase = 'playing';
      enterLose();
    },
    setLevel(n) {
      const lv = Math.max(0, Math.floor(Number(n) || 0));
      pawsLevel = lv;
      chefLevel = lv;
      cozyLevel = lv;
      bellLevel = lv;
      treats += lv * 500;
      log('game', 'dev_set_level', { lv });
    },
    spawnEnemy() {
      ensureAudio();
      if (phase !== 'playing') return;
      spawnDog(cookieCenter().x + 420);
    },
  };
  /* <DEV_CHEATS_END> */
})();
