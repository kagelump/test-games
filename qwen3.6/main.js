// Cat Cookie Bakery - idle clicker game
// No frameworks, pure Canvas2D

(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  // --- Utils ---
  const log = function (category, message, data) {
    try {
      window._gameLogEntries = window._gameLogEntries || [];
      window._gameLogEntries.push({ category, message, data: data || {}, ts: performance.now() });
    } catch (e) { }
  };

  const easeOutBack = function (t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const easeOutCubic = function (t) {
    return 1 - Math.pow(1 - t, 3);
  };

  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  const randRange = function (a, b) { return a + Math.random() * (b - a); };
  const randInt = function (a, b) { return Math.floor(randRange(a, b + 1)); };

  // --- Audio Engine (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playClickSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    // Bright "pop" sound for clicking
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(filter).connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  function playUpgradeSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const notes = [523, 659, 784];
    notes.forEach(function (freq, i) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.08, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.2);
    });
  }

  function playWinSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [523, 659, 784, 1047].forEach(function (freq, i) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0.12, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.4);
    });
  }

  function playLoseSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [400, 300, 200, 150].forEach(function (freq, i) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t + i * 0.15);
      gain.gain.setValueAtTime(0.06, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.3);
    });
  }

  function playMysteryRevealSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    // Magical shimmer
    [1047, 1319, 1568].forEach(function (freq, i) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      gain.gain.setValueAtTime(0.08, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.5);
    });
  }

  // Ambient music loop
  let bgMusicInterval = null;
  function startBgMusic() {
    if (bgMusicInterval || !audioCtx) return;
    const melody = [392, 440, 494, 523, 494, 440, 392, 349];
    let idx = 0;
    function playNoteLoop() {
      if (!audioCtx || game.state.phase !== "playing") {
        bgMusicInterval = null;
        return;
      }
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(melody[idx % melody.length], t);
      gain.gain.setValueAtTime(0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
      idx++;
    }
    playNoteLoop();
    bgMusicInterval = setInterval(playNoteLoop, 400);
  }
  function stopBgMusic() {
    if (bgMusicInterval) {
      clearInterval(bgMusicInterval);
      bgMusicInterval = null;
    }
  }

  // --- Assets ---
  const assets = {
    loaded: 0,
    total: 0,
    player_cat: null,
    enemy_cat: null,
    mystery_cat1: null,
    mystery_cat2: null,
    bg_bakery: null,
    cookie_loaf: null,
    cookie_muffin: null,
  };

  const assetFiles = [
    "player_cat", "enemy_cat", "mystery_cat1", "mystery_cat2",
    "bg_bakery", "cookie_loaf", "cookie_muffin"
  ];

  function loadAssets(callback) {
    assets.total = assetFiles.length;
    assetFiles.forEach(function (name) {
      const img = new Image();
      img.onload = function () {
        assets[name] = img;
        assets.loaded++;
        if (assets.loaded >= assets.total) callback();
      };
      img.onerror = function () {
        assets.loaded++;
        if (assets.loaded >= assets.total) callback();
      };
      img.src = "assets/" + name + ".png";
    });
  }

  // --- Game State ---
  var game = {
    state: {
      phase: "menu", // menu, playing, won, lost
      cookies: 0,
      totalCookies: 0,
      cookiesPerClick: 1,
      cookiesPerSecond: 0,
      score: 0,
      playerPos: { x: 0, y: 0 },
      entities: [],
      fps: 0,
      upgrades: [],
      migrations: [],
      currentMilestone: 0,
      mysteryRevealed: [false, false],
      clickPowerLevel: 0,
    },
    // Visual state
    shakeAmount: 0,
    shakeDecay: 0.9,
    particles: [],
    floatingTexts: [],
    catSquash: { x: 1, y: 1, targetX: 1, targetY: 1 },
    catScale: 1,
    frameCount: 0,
    fpsTimer: 0,
    fpsFrames: 0,
    menuPulse: 0,
    lastTime: 0,
    cookieAngle: 0,
    // Canvas dimensions
    W: 1920,
    H: 1080,
    scale: 1,
  };

  // --- Definition: Upgrades ---
  const UPGRADE_DEFS = [
    { name: "Better Paws", icon: "🐾", baseCost: 15, cps: 0.1, desc: "+0.1 cookie/s", category: "auto" },
    { name: "Cat Treats", icon: "🐟", baseCost: 100, cps: 1, desc: "+1 cookie/s", category: "auto" },
    { name: "Kitten Helper", icon: "🐱", baseCost: 500, cps: 5, desc: "+5 cookies/s", category: "auto" },
    { name: "Bakery Oven", icon: "🔥", baseCost: 2000, cps: 20, desc: "+20 cookies/s", category: "auto" },
    { name: "Catnip Garden", icon: "🌿", baseCost: 8000, cps: 80, desc: "+80 cookies/s", category: "auto" },
    { name: "Magic Whiskers", icon: "✨", baseCost: 50, clickBonus: 1, desc: "+1 per click", category: "click" },
    { name: "Super Paws", icon: "💪", baseCost: 300, clickBonus: 5, desc: "+5 per click", category: "click" },
    { name: "Laser Pointer", icon: "🔴", baseCost: 1500, clickBonus: 25, desc: "+25 per click", category: "click" },
    { name: "Catnip Powder", icon: "💨", baseCost: 7000, clickBonus: 100, desc: "+100 per click", category: "click" },
  ];

  // Milestone wins
  const MILESTONES = [100, 1000, 10000, 100000, 1000000, 10000000];
  const MILESTONE_LABELS = ["Novice Baker", "Local Favorite", "Town's Best", "Regional Star", "National Cat Baker", "Cookie Tycoon"];

  // --- Layout constants ---
  const LAYOUT = {
    // Left panel (click area)
    leftPanel: { x: 0, y: 0, w: 500, h: 1080 },
    // Center panel (big cat)
    catArea: { x: 500, y: 0, w: 700, h: 1080 },
    // Right panel (shop)
    shopPanel: { x: 1200, y: 0, w: 720, h: 1080 },
    // Top bar
    topBar: { x: 0, y: 0, w: 1200, h: 90 },
  };

  // --- Particles ---
  function spawnParticles(x, y, count, color, spread) {
    for (var i = 0; i < count; i++) {
      game.particles.push({
        x: x,
        y: y,
        vx: randRange(-spread, spread),
        vy: randRange(-spread, spread * 0.6),
        life: 1,
        decay: randRange(0.015, 0.03),
        size: randRange(3, 8),
        color: color,
      });
    }
  }

  function spawnCookieParticles(x, y) {
    var colors = ["#d4a574", "#c89466", "#8B4513", "#FFD700", "#FFA500"];
    for (var i = 0; i < 12; i++) {
      game.particles.push({
        x: x,
        y: y,
        vx: randRange(-120, 120),
        vy: randRange(-180, -40),
        life: 1,
        decay: randRange(0.012, 0.022),
        size: randRange(4, 12),
        color: colors[randInt(0, colors.length - 1)],
      });
    }
  }

  function addFloatingText(x, y, text, color) {
    game.floatingTexts.push({
      x: x + randRange(-30, 30),
      y: y,
      text: text,
      color: color || "#FFD700",
      life: 1,
      vy: -60,
    });
  }

  // --- Click Handler ---
  function handleClick(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) / game.scale;
    var y = (clientY - rect.top) / game.scale;

    if (game.state.phase === "menu") {
      // Start button area
      if (x > 820 && x < 1100 && y > 620 && y < 680) {
        initAudio();
        startGame();
        log("game", "start", {});
      }
      return;
    }

    if (game.state.phase === "won" || game.state.phase === "lost") {
      // Restart button
      if (x > 820 && x < 1100 && y > 650 && y < 710) {
        resetGame();
        log("game", "restart", {});
      }
      return;
    }

    // Playing
    // Check shop upgrade clicks
    var shopUpgradeClicked = false;
    for (var i = 0; i < game.state.upgrades.length; i++) {
      var upg = game.state.upgrades[i];
      var upgY = 120 + i * 100;
      if (x > LAYOUT.shopPanel.x + 20 && x < LAYOUT.shopPanel.x + LAYOUT.shopPanel.w - 20 &&
        y > upgY && y < upgY + 90) {
        if (game.state.totalCookies >= upg.currentCost) {
          buyUpgrade(upg);
          shopUpgradeClicked = true;
        }
        break;
      }
    }
    if (shopUpgradeClicked) return;

    // Migration clicks
    for (var m = 0; m < game.state.migrations.length; m++) {
      var mig = game.state.migrations[m];
      var migY = 120 + game.state.upgrades.length * 100 + m * 100;
      if (x > LAYOUT.shopPanel.x + 20 && x < LAYOUT.shopPanel.x + LAYOUT.shopPanel.w - 20 &&
        y > migY && y < migY + 90) {
        if (game.state.totalCookies >= mig.cost && !mig.revealed) {
          revealMigration(mig);
          shopUpgradeClicked = true;
        }
        break;
      }
    }
    if (shopUpgradeClicked) return;

    // Cat click area - main clicker
    var catCX = LAYOUT.catArea.x + LAYOUT.catArea.w / 2;
    var catCY = LAYOUT.catArea.y + LAYOUT.catArea.h / 2 - 30;
    var dx = x - catCX;
    var dy = y - catCY;
    if (Math.sqrt(dx * dx + dy * dy) < 200) {
      clickCat(x, y);
    }
  }

  function clickCat(x, y) {
    initAudio();
    var earned = game.state.cookiesPerClick;
    game.state.cookies += earned;
    game.state.totalCookies += earned;

    // Check milestones
    checkMilestones();

    // Juice
    game.shakeAmount = 3;
    game.catSquash.targetX = 1.15;
    game.catSquash.targetY = 0.85;
    setTimeout(function () {
      game.catSquash.targetX = 1;
      game.catSquash.targetY = 1;
    }, 80);

    spawnCookieParticles(x, y);
    addFloatingText(x, y, "+" + formatNumber(earned), "#FFD700");
    playClickSound();

    game.state.playerPos = { x: x, y: y };
    log("click", "cat_clicked", { earned: earned, total: game.state.totalCookies });
  }

  function buyUpgrade(upg) {
    game.state.totalCookies -= upg.currentCost;
    upg.level++;
    upg.currentCost = Math.floor(upg.def.baseCost * Math.pow(1.15, upg.level));

    if (upg.def.category === "auto") {
      game.state.cookiesPerSecond += upg.def.cps;
    } else if (upg.def.category === "click") {
      game.state.cookiesPerClick += upg.def.clickBonus;
    }

    playUpgradeSound();
    addFloatingText(
      LAYOUT.shopPanel.x + LAYOUT.shopPanel.w / 2,
      120 + (game.state.upgrades.indexOf(upg)) * 100 + 45,
      "Purchased!",
      "#90EE90"
    );

    checkMilestones();
    log("upgrade", "purchased", { name: upg.def.name, level: upg.level });
  }

  function revealMigration(migration) {
    game.state.totalCookies -= migration.cost;
    migration.revealed = true;
    var bonus = Math.floor(game.state.totalCookies * 0.1 + 100);
    game.state.cookies += bonus;
    game.state.totalCookies += bonus;

    // Check which mystery cat was revealed
    var catIdx = game.state.migrations.indexOf(migration);
    if (catIdx === 0 && !game.state.mysteryRevealed[0]) {
      game.state.mysteryRevealed[0] = true;
      log("milestone", "mystery_cat_1_revealed", {});
    } else if (catIdx === 1 && !game.state.mysteryRevealed[1]) {
      game.state.mysteryRevealed[1] = true;
      log("milestone", "mystery_cat_2_revealed", {});
    }

    playMysteryRevealSound();
    spawnParticles(
      LAYOUT.shopPanel.x + LAYOUT.shopPanel.w / 2,
      120 + game.state.upgrades.length * 100 + game.state.migrations.indexOf(migration) * 100 + 45,
      30,
      "#FF69B4",
      120
    );
    addFloatingText(
      LAYOUT.shopPanel.x + LAYOUT.shopPanel.w / 2,
      120 + game.state.upgrades.length * 100 + game.state.migrations.indexOf(migration) * 100 + 45,
      "+" + formatNumber(bonus) + " 🎁",
      "#FF69B4"
    );

    checkMilestones();
    log("migration", "revealed", { name: migration.name, bonus: bonus });
  }

  function checkMilestones() {
    for (var i = game.state.currentMilestone; i < MILESTONES.length; i++) {
      if (game.state.totalCookies >= MILESTONES[i] && !game.state.milestoneReached[i]) {
        game.state.milestoneReached[i] = true;
        game.state.currentMilestone = i + 1;
        game.score = i + 1;
        log("milestone", "reached", { name: MILESTONE_LABELS[i], cookies: MILESTONES[i] });

        if (i === MILESTONES.length - 1) {
          // Won!
          winGame();
        }
        return;
      }
    }
  }

  function winGame() {
    game.state.phase = "won";
    stopBgMusic();
    playWinSound();
    log("game", "won", {});
  }

  function loseGame() {
    game.state.phase = "lost";
    stopBgMusic();
    playLoseSound();
    log("game", "lost", {});
  }

  function startGame() {
    game.state.phase = "playing";
    game.state.cookies = 0;
    game.state.totalCookies = 0;
    game.state.cookiesPerClick = 1;
    game.state.cookiesPerSecond = 0;
    game.state.score = 0;
    game.state.currentMilestone = 0;
    game.state.milestoneReached = [];
    game.state.mysteryRevealed = [false, false];
    game.state.playerPos = { x: 0, y: 0 };
    game.state.entities = [];
    game.particles = [];
    game.floatingTexts = [];
    game.catSquash = { x: 1, y: 1, targetX: 1, targetY: 1 };
    game.shakeAmount = 0;

    game.state.upgrades = UPGRADE_DEFS.map(function (def) {
      return {
        def: def,
        level: 0,
        currentCost: def.baseCost,
      };
    });

    // Migration boxes
    game.state.migrations = [
      {
        name: "Mystery Cat #1",
        cost: 5000,
        revealed: false,
        desc: "Reveal a secret feline friend!",
        dailyCost: 500,
        timeLeft: 0,
        maxTime: 60 * 60, // 1 hour in seconds
      },
      {
        name: "Mystery Cat #2",
        cost: 50000,
        revealed: false,
        desc: "Reveal another secret feline friend!",
        dailyCost: 2000,
        timeLeft: 0,
        maxTime: 60 * 60,
      },
    ];

    startBgMusic();
  }

  function resetGame() {
    game.state.phase = "playing";
    startGame();
  }

  function formatNumber(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Math.floor(n).toString();
  }

  // --- Dev Cheats ---
  window.devCheats = {
    skipToWin: function () {
      if (!game.state.milestoneReached) {
        game.state.milestoneReached = [];
      }
      game.state.totalCookies = MILESTONES[MILESTONES.length - 1];
      game.state.cookies = game.state.totalCookies;
      for (var i = 0; i < MILESTONES.length; i++) game.state.milestoneReached[i] = true;
      game.state.currentMilestone = MILESTONES.length;
      game.score = MILESTONES.length;
      winGame();
    },
    skipToLose: function () {
      // In idle games, losing means not reaching milestones
      // Simulate a loss condition: no progress warning
      game.state.phase = "lost";
      stopBgMusic();
      playLoseSound();
      log("game", "lose_cheat", {});
    },
    setLevel: function (n) {
      game.state.currentMilestone = n;
    },
    spawnEnemy: function () {
      // No enemies in this game - add a migration challenge instead
      game.state.cookiesPerSecond = Math.max(0, game.state.cookiesPerSecond - 10);
      addFloatingText(
        LAYOUT.catArea.x + LAYOUT.catArea.w / 2,
        LAYOUT.catArea.y + LAYOUT.catArea.h / 2,
        "Cat Chaos! -10 Cps",
        "#FF4444"
      );
      log("cheat", "spawn_enemy", {});
    },
    addCookies: function (n) {
      game.state.cookies += n;
      game.state.totalCookies += n;
      checkMilestones();
      log("cheat", "add_cookies", { amount: n });
    },
  };

  // --- Canvas setup ---
  function resize() {
    canvas.width = game.W;
    canvas.height = game.H;
    var cs = Math.min(
      window.innerWidth / game.W,
      window.innerHeight / game.H
    );
    canvas.style.width = (game.W * cs) + "px";
    canvas.style.height = (game.H * cs) + "px";
    game.scale = cs;
  }
  window.addEventListener("resize", resize);

  // --- Input ---
  canvas.addEventListener("click", function (e) {
    initAudio();
    handleClick(e.clientX, e.clientY);
  });

  canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    handleClick(touch.clientX, touch.clientY);
  }, { passive: false });

  // --- Draw functions ---
  function drawMenu() {
    // Background
    if (assets.bg_bakery) {
      ctx.drawImage(assets.bg_bakery, 0, 0, game.W, game.H);
    } else {
      ctx.fillStyle = "#f5e6d0";
      ctx.fillRect(0, 0, game.W, game.H);
    }

    // Overlay for menu
    ctx.fillStyle = "rgba(26, 18, 16, 0.55)";
    ctx.fillRect(0, 0, game.W, game.H);

    game.menuPulse += 0.03;

    // Title
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = "bold 100px system-ui, sans-serif";
    ctx.fillText("Cat Cookie Bakery", game.W / 2 + 3, 220 + 3);

    // Title text
    var titleGrad = ctx.createLinearGradient(600, 150, 1300, 280);
    titleGrad.addColorStop(0, "#FFD700");
    titleGrad.addColorStop(0.5, "#FFA500");
    titleGrad.addColorStop(1, "#FF8C00");
    ctx.fillStyle = titleGrad;
    ctx.fillText("Cat Cookie Bakery", game.W / 2, 220);
    ctx.restore();

    // Player cat key art
    if (assets.player_cat) {
      ctx.save();
      var catScale = 1 + Math.sin(game.menuPulse) * 0.03;
      ctx.translate(game.W / 2, 430);
      ctx.scale(catScale, catScale);
      ctx.globalAlpha = 0.9;
      var catW = 400;
      var catH = 300;
      ctx.drawImage(assets.player_cat, -catW / 2, -catH / 2, catW, catH);
      ctx.restore();
    }

    // Subtitle
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText("Bake cookies. Adopt cat friends. Earn the Golden Whisker!", game.W / 2, 560);
    ctx.restore();

    // Start button
    drawStartButton(game.W / 2, 650, "Start Baking!");
  }

  function drawStartButton(cx, cy, text) {
    var bw = 280, bh = 65;
    var pulse = 1 + Math.sin(game.menuPulse * 2) * 0.02;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    // Button shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    roundRect(ctx, -bw / 2 + 3, -bh / 2 + 3, bw, bh, 18);
    ctx.fill();

    // Button
    var btnGrad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    btnGrad.addColorStop(0, "#FF8C00");
    btnGrad.addColorStop(1, "#FF6600");
    ctx.fillStyle = btnGrad;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 18);
    ctx.fill();

    // Button border
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 18);
    ctx.stroke();

    // Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1);

    ctx.restore();
  }

  function drawPlaying() {
    // Background
    if (assets.bg_bakery) {
      ctx.drawImage(assets.bg_bakery, 0, 0, game.W, game.H);
    } else {
      ctx.fillStyle = "#f5e6d0";
      ctx.fillRect(0, 0, game.W, game.H);
    }

    // Draw panels
    drawTopBar();
    drawClickArea();
    drawShopPanel();
  }

  function drawTopBar() {
    // Top bar background
    var barGrad = ctx.createLinearGradient(0, LAYOUT.topBar.y, 0, LAYOUT.topBar.h);
    barGrad.addColorStop(0, "rgba(40, 30, 20, 0.92)");
    barGrad.addColorStop(1, "rgba(50, 35, 25, 0.88)");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, LAYOUT.topBar.w, LAYOUT.topBar.h);

    // Border line
    ctx.strokeStyle = "#8B6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, LAYOUT.topBar.h);
    ctx.lineTo(LAYOUT.topBar.w, LAYOUT.topBar.h);
    ctx.stroke();

    // Cookie count
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 45px system-ui, sans-serif";
    ctx.fillText("🍪 " + formatNumber(game.state.cookies), 30, 35);

    // Cookies per second
    ctx.fillStyle = "#ddd";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(formatNumber(game.state.cookiesPerSecond) + "/s", 30, 68);

    // Milestone progress
    var currentGoal = MILESTONES[game.state.currentMilestone] || MILESTONES[MILESTONES.length - 1];
    var currentLabel = MILESTONE_LABELS[game.state.currentMilestone] || MILESTONE_LABELS[MILESTONE_LABELS.length - 1];

    ctx.textAlign = "right";
    ctx.fillStyle = "#FFA500";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillText(currentLabel, LAYOUT.topBar.w - 30, 32);

    // Progress bar
    var barW = 300;
    var barH = 14;
    var barX = LAYOUT.topBar.w - 30 - barW;
    var barY = 55;
    var progress = clamp(game.state.totalCookies / currentGoal, 0, 1);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, barX, barY, barW, barH, 7);
    ctx.fill();

    var progGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
    progGrad.addColorStop(0, "#4CAF50");
    progGrad.addColorStop(1, "#8BC34A");
    ctx.fillStyle = progGrad;
    roundRect(ctx, barX, barY, barW * progress, barH, 7);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(formatNumber(game.state.totalCookies) + " / " + formatNumber(currentGoal), barX + barW / 2, barY + 11);

    // Max milestone badge
    if (game.state.currentMilestone >= MILESTONES.length) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillText("🏆 Cookie Tycoon!", LAYOUT.topBar.w - 30, 32);
    }

    ctx.restore();
  }

  function drawClickArea() {
    // Left panel area - decorative
    var leftX = LAYOUT.topBar.x;
    var leftY = LAYOUT.topBar.h;

    // Draw cookie icons floating
    game.cookieAngle += 0.01;
    var cookiePositions = [
      { x: leftX + 80, y: leftY + 100, size: 40 },
      { x: leftX + 160, y: 380, size: 50 },
    ];

    cookiePositions.forEach(function (c, i) {
      ctx.save();
      ctx.translate(c.x + Math.sin(game.cookieAngle + i * 1.5) * 8, c.y + Math.cos(game.cookieAngle + i * 2) * 8);
      ctx.rotate(game.cookieAngle + i);
      ctx.translate(-c.size / 2, -c.size / 2);
      if (i === 0 && assets.cookie_loaf) {
        ctx.drawImage(assets.cookie_loaf, 0, 0, c.size * 2, c.size * 2);
      } else if (i === 1 && assets.cookie_muffin) {
        ctx.drawImage(assets.cookie_muffin, 0, 0, c.size * 2, c.size * 2);
      }
      ctx.restore();
    });

    // Stats
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#5a4a3a";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("Click the cat!", leftX + 120, 200);
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillStyle = "#7a6a5a";
    ctx.fillText("per click", leftX + 120, 225);
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillStyle = "#8B4513";
    ctx.fillText("+" + formatNumber(game.state.cookiesPerClick), leftX + 120, 250);

    // Migration display (revealed cats)
    if (game.state.mysteryRevealed[0] && assets.mystery_cat1) {
      ctx.save();
      ctx.translate(leftX + 250, 360);
      ctx.scale(0.8, 0.8);
      ctx.drawImage(assets.mystery_cat1, -60, -60, 120, 120);
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#7a6a5a";
      ctx.textAlign = "center";
      ctx.fillText("Friend #1", 0, 75);
      ctx.restore();
    }

    if (game.state.mysteryRevealed[1] && assets.mystery_cat2) {
      ctx.save();
      ctx.translate(leftX + 250, 520);
      ctx.scale(0.8, 0.8);
      ctx.drawImage(assets.mystery_cat2, -60, -60, 120, 120);
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#7a6a5a";
      ctx.textAlign = "center";
      ctx.fillText("Friend #2", 0, 75);
      ctx.restore();
    }

    // Daily migration status
    if (game.state.mysteryRevealed[0] || game.state.mysteryRevealed[1]) {
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#FFA500";
      var lossText = "";
      var migIdx = 0;
      var activeMig = game.state.migrations.find(function (m) { return m.revealed; });
      if (activeMig) {
        var lossPerSec = activeMig.dailyCost / activeMig.maxTime;
        if (lossPerSec > 0) {
          ctx.fillText("Pay or lose friend!", leftX + 120, 660);
          ctx.font = "14px system-ui, sans-serif";
          ctx.fillStyle = "#FF6347";
          lossText = "- " + formatNumber(lossPerSec) + "/s";
          ctx.fillText(lossText, leftX + 120, 680);
        }
      }
    }

    // Lower left - controls hint
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillStyle = "#9a8a7a";
    ctx.fillText("Click the cat to bake cookies!", leftX + 120, 740);
    ctx.fillText("Buy upgrades to automate.", leftX + 120, 760);
    ctx.fillText("Reach " + formatNumber(MILESTONES[MILESTONES.length - 1]) + " to win!", leftX + 120, 780);

    ctx.restore();
  }

  function drawShopPanel() {
    // Shop panel background
    var shopX = LAYOUT.shopPanel.x;
    var panelGrad = ctx.createLinearGradient(shopX, 0, shopX + LAYOUT.shopPanel.w, 0);
    panelGrad.addColorStop(0, "rgba(45, 35, 25, 0.92)");
    panelGrad.addColorStop(1, "rgba(55, 42, 30, 0.88)");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(shopX, LAYOUT.topBar.h, LAYOUT.shopPanel.w, game.H - LAYOUT.topBar.h);

    // Border
    ctx.strokeStyle = "#8B6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shopX, LAYOUT.topBar.h);
    ctx.lineTo(shopX, game.H);
    ctx.stroke();

    // Title
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText("Shop", shopX + LAYOUT.shopPanel.w / 2, LAYOUT.topBar.h + 40);
    ctx.restore();

    // Upgrade list
    for (var i = 0; i < game.state.upgrades.length; i++) {
      var upg = game.state.upgrades[i];
      var upgY = LAYOUT.topBar.h + 80 + i * 100;
      var canAfford = game.state.totalCookies >= upg.currentCost;

      // Background
      ctx.fillStyle = canAfford
        ? "rgba(80, 65, 45, 0.8)"
        : "rgba(50, 40, 30, 0.6)";
      roundRect(ctx, shopX + 20, upgY, LAYOUT.shopPanel.w - 40, 90, 12);
      ctx.fill();

      if (canAfford) {
        ctx.strokeStyle = "#FFA500";
        ctx.lineWidth = 1.5;
        roundRect(ctx, shopX + 20, upgY, LAYOUT.shopPanel.w - 40, 90, 12);
        ctx.stroke();
      }

      // Icon
      ctx.fillStyle = canAfford ? "#FFA500" : "#666";
      ctx.font = "28px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(upg.def.icon, shopX + 35, upgY + 45);

      // Name and level
      ctx.fillStyle = canAfford ? "#FFE4B5" : "#999";
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.fillText(upg.def.name + " (Lv " + upg.level + ")", shopX + 80, upgY + 35);

      // Description
      ctx.fillStyle = canAfford ? "#ddd" : "#888";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(upg.def.desc, shopX + 80, upgY + 60);

      // Price
      ctx.fillStyle = canAfford ? "#FFD700" : "#FF6347";
      ctx.font = "bold 17px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("🍪 " + formatNumber(upg.currentCost), shopX + LAYOUT.shopPanel.w - 40, upgY + 45);
    }

    // Migration boxes
    for (var m = 0; m < game.state.migrations.length; m++) {
      var mig = game.state.migrations[m];
      var globalIdx = game.state.upgrades.length + m;
      var migY = LAYOUT.topBar.h + 80 + globalIdx * 100;
      var canReveal = game.state.totalCookies >= mig.cost && !mig.revealed;

      ctx.fillStyle = canReveal
        ? "rgba(120, 50, 100, 0.8)"
        : (mig.revealed ? "rgba(50, 100, 50, 0.6)" : "rgba(50, 40, 30, 0.6)");
      roundRect(ctx, shopX + 20, migY, LAYOUT.shopPanel.w - 40, 90, 12);
      ctx.fill();

      if (canReveal) {
        ctx.strokeStyle = "#FF69B4";
        ctx.lineWidth = 1.5;
        roundRect(ctx, shopX + 20, migY, LAYOUT.shopPanel.w - 40, 90, 12);
        ctx.stroke();
      }

      ctx.fillStyle = canReveal ? "#FFD700" : (mig.revealed ? "#90EE90" : "#666");
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(mig.revealed ? "✅" : "❓", shopX + 35, migY + 45);

      ctx.fillStyle = canReveal ? "#FFE4B5" : (mig.revealed ? "#90EE90" : "#888");
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.fillText(mig.name + (mig.revealed ? " (Adopted!)" : ""), shopX + 80, migY + 35);

      ctx.fillStyle = canReveal ? "#ddd" : "#888";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(mig.desc, shopX + 80, migY + 60);

      ctx.textAlign = "right";
      if (!mig.revealed) {
        ctx.fillStyle = canReveal ? "#FFD700" : "#888";
        ctx.font = "bold 17px system-ui, sans-serif";
        ctx.fillText("🍪 " + formatNumber(mig.cost), shopX + LAYOUT.shopPanel.w - 40, migY + 45);
      }
    }

    ctx.restore();
  }

  // Cat drawing with squash/stretch
  function drawMainCat() {
    var catCX = LAYOUT.catArea.x + LAYOUT.catArea.w / 2;
    var catCY = LAYOUT.catArea.y + LAYOUT.catArea.h / 2 - 30;

    // Smooth squash/stretch
    game.catSquash.x = lerp(game.catSquash.x, game.catSquash.targetX, 0.15);
    game.catSquash.y = lerp(game.catSquash.y, game.catSquash.targetY, 0.15);

    ctx.save();
    ctx.translate(catCX, catCY);

    // Gentle idle bob
    var bob = Math.sin(game.frameCount * 0.04) * 5;
    ctx.translate(0, bob);

    // Squash/stretch
    ctx.scale(game.catSquash.x, game.catSquash.y);

    // Glow ring
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, " + (0.2 + Math.sin(game.frameCount * 0.05) * 0.1) + ")";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw the cat image
    if (assets.player_cat) {
      var imgRatio = assets.player_cat.width / assets.player_cat.height;
      var drawW = 340;
      var drawH = drawW / imgRatio;
      ctx.drawImage(assets.player_cat, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Fallback placeholder
      ctx.fillStyle = "#FFA500";
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Click hint ring (pulsing)
    ctx.save();
    ctx.beginPath();
    var ringR = 200 + Math.sin(game.frameCount * 0.06) * 12;
    ctx.arc(catCX, catCY + bob, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.15)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    for (var i = game.particles.length - 1; i >= 0; i--) {
      var p = game.particles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 200 * 0.016; // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        game.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    for (var i = game.floatingTexts.length - 1; i >= 0; i--) {
      var ft = game.floatingTexts[i];
      ft.y += ft.vy * 0.016;
      ft.life -= 0.02;

      if (ft.life <= 0) {
        game.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.textAlign = "center";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function drawWinScreen() {
    drawPlaying();

    // Overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, game.W, game.H);

    // Confetti particles
    if (game.frameCount % 5 === 0) {
      spawnParticles(randRange(600, 1200), randRange(100, 500), 1,
        ["#FF6347", "#FFD700", "#FF69B4", "#87CEEB"][randInt(0, 3)], 80);
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 90px system-ui, sans-serif";
    ctx.fillText("🏆 Cookie Tycoon! 🏆", game.W / 2, 300);

    ctx.fillStyle = "#FFE4B5";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText("You Baked " + formatNumber(game.state.totalCookies) + " cookies!", game.W / 2, 400);

    ctx.fillStyle = "#ddd";
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("All cat friends are happy!", game.W / 2, 470);

    // Show all cats
    var catY = 540;
    var cats = [
      { img: assets.player_cat, label: "Your Cat" },
      { img: assets.mystery_cat1, label: game.state.mysteryRevealed[0] ? "Friend #1" : "???" },
      { img: assets.mystery_cat2, label: game.state.mysteryRevealed[1] ? "Friend #2" : "???" },
    ];
    cats.forEach(function (c, idx) {
      var catX = 600 + idx * 400;
      if (c.img) {
        ctx.drawImage(c.img, catX - 60, catY - 60, 120, 120);
      }
      ctx.fillStyle = "#aaa";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText(c.label, catX, catY + 80);
    });

    drawStartButton(game.W / 2, 680, "Play Again");

    ctx.restore();
  }

  function drawLoseScreen() {
    drawPlaying();

    // Overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, game.W, game.H);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FF6347";
    ctx.font = "bold 80px system-ui, sans-serif";
    ctx.fillText("Cat's Gone!", game.W / 2, 350);

    ctx.fillStyle = "#ddd";
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("Your cookie friend left... 🥺", game.W / 2, 440);

    ctx.fillStyle = "#aaa";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText("You baked " + formatNumber(game.state.totalCookies) + " cookies", game.W / 2, 500);
    ctx.fillText("Keep baking to win next time!", game.W / 2, 540);

    // Draw grumpy cat
    if (assets.enemy_cat) {
      ctx.drawImage(assets.enemy_cat, game.W / 2 - 120, 580, 240, 180);
    }

    drawStartButton(game.W / 2, 710, "Try Again");

    ctx.restore();
  }

  // --- Helpers ---
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Main Loop ---
  function update(dt) {
    // Passive cookie generation
    if (game.state.phase === "playing") {
      var earned = game.state.cookiesPerSecond * dt;
      game.state.cookies += earned;
      game.state.totalCookies += earned;
      checkMilestones();

      // Daily migration costs
      game.state.migrations.forEach(function (mig) {
        if (mig.revealed) {
          mig.timeLeft += dt;
          if (mig.timeLeft >= mig.maxTime) {
            var cost = mig.dailyCost;
            if (game.state.cookies >= cost) {
              game.state.cookies -= cost;
              mig.timeLeft = 0;
              addFloatingText(
                LAYOUT.leftPanel.x + 200,
                600,
                "- " + formatNumber(cost),
                "#FF6347"
              );
            } else {
              // Can't pay - friend leaves!
              loseGame();
            }
          }
        }
      });
    }

    // Screen shake decay
    if (game.shakeAmount > 0.1) {
      game.shakeAmount *= game.shakeDecay;
    } else {
      game.shakeAmount = 0;
    }

    game.frameCount++;
  }

  function render() {
    // Clear
    ctx.clearRect(0, 0, game.W, game.H);

    // Screen shake
    if (game.shakeAmount > 0) {
      ctx.save();
      ctx.translate(
        randRange(-game.shakeAmount, game.shakeAmount),
        randRange(-game.shakeAmount, game.shakeAmount)
      );
    }

    switch (game.state.phase) {
      case "menu":
        drawMenu();
        break;
      case "playing":
        drawPlaying();
        drawMainCat();
        drawParticles();
        drawFloatingTexts();
        break;
      case "won":
        drawWinScreen();
        drawParticles();
        break;
      case "lost":
        drawLoseScreen();
        break;
    }

    if (game.shakeAmount > 0) {
      ctx.restore();
    }

    // FPS overlay (toggle with ~)
    if (window._showFps) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(5, 5, 120, 30);
      ctx.fillStyle = "#0f0";
      ctx.font = "14px monospace";
      ctx.textAlign = "left";
      ctx.fillText("FPS: " + game.state.fps, 10, 25);
      ctx.restore();
    }
  }

  // FPS tracking
  var fpsCounter = 0;
  var fpsAccum = 0;
  var lastFpsTime = 0;

  function gameLoop(timestamp) {
    if (!game.lastTime) game.lastTime = timestamp;
    var dt = Math.min((timestamp - game.lastTime) / 1000, 0.1);
    game.lastTime = timestamp;

    // FPS calculation
    fpsCounter++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      game.state.fps = Math.round(fpsCounter / fpsAccum);
      game.state.phase = game.state.phase; // force dirty
      fpsCounter = 0;
      fpsAccum = 0;
    }

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // Expose gameState
  window.gameState = {
    get phase() { return game.state.phase; },
    get score() { return game.state.score; },
    get playerPos() { return game.state.playerPos; },
    get entities() { return game.state.entities; },
    get fps() { return game.state.fps; },
    get cookies() { return game.state.cookies; },
    get totalCookies() { return game.state.totalCookies; },
    get cookiesPerClick() { return game.state.cookiesPerClick; },
    get cookiesPerSecond() { return game.state.cookiesPerSecond; },
  };

  // Keyboard shortcuts
  window.addEventListener("keydown", function (e) {
    if (e.key === "~") {
      window._showFps = !window._showFps;
    }
  });

  // --- Init ---
  resize();
  loadAssets(function () {
    requestAnimationFrame(gameLoop);
    log("init", "assets_loaded", { count: assets.loaded });
  });

  log("init", "game_initialized", {});
})();
