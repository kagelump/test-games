const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const mpsEl = document.getElementById('mps');
const kittenCostEl = document.getElementById('kitten-cost');

// Instrumentation
window.gameState = {
    phase: 'menu',
    score: 0,
    mps: 0,
    playerPos: { x: 0, y: 0 },
    entities: [],
    fps: 0
};

window.devCheats = {
    skipToWin: () => {
        gameState.score = 1e12;
        updateScore();
        checkWin();
    },
    skipToLose: () => {
        setPhase('lost');
    },
    setLevel: (n) => { console.log('Level set to ' + n); },
    spawnEnemy: () => {
        spawnVoidOrb();
    }
};

function log(category, message, data = {}) {
    // Silencing logs in production as per brief, but can be enabled for debugging
    // console.log(`[${category}] ${message}`, data);
}

// Game Constants
const WIN_SCORE = 1e12;
const START_KITTEN_COST = 10;

// Assets
const images = {};
const assetPaths = {
    cat: 'assets/cat.png',
    kitten: 'assets/kitten.png',
    void: 'assets/void.png',
    bg: 'assets/bg_sky.png'
};

let assetsLoaded = 0;
Object.entries(assetPaths).forEach(([key, path]) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === Object.keys(assetPaths).length) {
            log('Assets', 'All assets loaded');
        }
    };
    images[key] = img;
});

// Game State Vars
let kittenCount = 0;
let kittenCost = START_KITTEN_COST;
let lastTime = 0;
let mpsTimer = 0;
let shakeAmount = 0;
let particles = [];

function setPhase(phase) {
    gameState.phase = phase;
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('hud').classList.add('hidden');

    if (phase === 'menu') {
        document.getElementById('menu-screen').classList.remove('hidden');
    } else if (phase === 'playing') {
        document.getElementById('hud').classList.remove('hidden');
    } else if (phase === 'won') {
        document.getElementById('win-screen').classList.remove('hidden');
    } else if (phase === 'lost') {
        document.getElementById('lose-screen').classList.remove('hidden');
    }
}

function updateScore() {
    scoreEl.innerText = Math.floor(gameState.score).toLocaleString();
    mpsEl.innerText = gameState.mps.toFixed(1);
    kittenCostEl.innerText = Math.floor(kittenCost);
}

function checkWin() {
    if (gameState.score >= WIN_SCORE) {
        setPhase('won');
    }
}

function spawnParticle(x, y) {
    particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: '#ff69b4'
    });
}

function spawnVoidOrb() {
    const size = 100;
    gameState.entities.push({
        type: 'void',
        x: Math.random() * (canvas.width - size),
        y: Math.random() * (canvas.height - size),
        w: size,
        h: size,
        life: 5000 + Math.random() * 5000
    });
}

function handleInput(e) {
    if (gameState.phase !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check Void Orb hit
    for (let i = gameState.entities.length - 1; i >= 0; i--) {
        const ent = gameState.entities[i];
        if (ent.type === 'void' && x > ent.x && x < ent.x + ent.w && y > ent.y && y < ent.y + ent.h) {
            setPhase('lost');
            return;
        }
    }

    // Check Cat hit (Cat is centered)
    const catW = 400;
    const catH = 400;
    const catX = canvas.width / 2 - catW / 2;
    const catY = canvas.height / 2 - catH / 2;

    if (x > catX && x < catX + catW && y > catY && y < catY + catH) {
        gameState.score += 1;
        updateScore();
        shakeAmount = 10;
        for (let i = 0; i < 5; i++) spawnParticle(x, y);
        checkWin();
    }
}

document.getElementById('start-btn').onclick = () => {
    setPhase('playing');
};

document.getElementById('upgrade-kitten').onclick = () => {
    if (gameState.score >= kittenCost) {
        gameState.score -= kittenCost;
        kittenCount++;
        gameState.mps += 0.5;
        kittenCost *= 1.15;
        updateScore();
    }
};

window.addEventListener('mousedown', handleInput);

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function loop(time) {
    const dt = time - lastTime;
    lastTime = time;
    gameState.fps = Math.round(1000 / dt);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.drawImage(images.bg, 0, 0, canvas.width, canvas.height);

    if (gameState.phase === 'playing') {
        // MPS logic
        mpsTimer += dt;
        if (mpsTimer >= 1000) {
            gameState.score += gameState.mps;
            updateScore();
            mpsTimer = 0;
        }

        // Screen shake
        ctx.save();
        if (shakeAmount > 0) {
            ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
            shakeAmount *= 0.9;
            if (shakeAmount < 0.1) shakeAmount = 0;
        }

        // Draw Cat
        const catW = 400;
        const catH = 400;
        ctx.drawImage(images.cat, canvas.width / 2 - catW / 2, canvas.height / 2 - catH / 2, catW, catH);

        // Draw Void Orbs
        if (Math.random() < 0.005) spawnVoidOrb();
        for (let i = gameState.entities.length - 1; i >= 0; i--) {
            const ent = gameState.entities[i];
            ctx.drawImage(images.void, ent.x, ent.y, ent.w, ent.h);
            ent.life -= dt;
            if (ent.life <= 0) gameState.entities.splice(i, 1);
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
