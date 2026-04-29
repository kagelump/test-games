// Cat Clicker - Enhanced Iteration

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Configuration ---
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const WIN_SCORE = 1000000;
const HUNGER_DECAY = 0.05;
const HUNGER_RECOVERY = 10;
const DOG_CHANCE = 0.001;
const GOLDEN_TREAT_CHANCE = 0.002;

// --- Game State ---
window.gameState = {
    phase: 'menu',
    score: 0,
    treatsPerClick: 1,
    autoTreats: 0,
    hunger: 100,
    fps: 0,
    entities: [],
    playerPos: { x: TARGET_WIDTH / 2, y: TARGET_HEIGHT / 2 + 100 },
    multiplier: 1,
    frenzyTimer: 0,
    hasLaser: false
};

// --- Assets ---
const assets = {
    bg: new Image(),
    catMain: new Image(),
    catSkinny: new Image(),
    catGod: new Image(),
    dog: new Image(),
    treat: new Image(),
    treatGolden: new Image(),
    mouse: new Image(),
    laser: new Image()
};

let assetsLoaded = 0;
const totalAssets = 9;

function loadAsset(img, src) {
    img.onload = () => { assetsLoaded++; if (assetsLoaded === totalAssets) log('assets', 'All assets loaded'); };
    img.src = src;
}

loadAsset(assets.bg, 'assets/bg_living_room.png');
loadAsset(assets.catMain, 'assets/cat_main.png');
loadAsset(assets.catSkinny, 'assets/cat_skinny.png');
loadAsset(assets.catGod, 'assets/cat_god.png');
loadAsset(assets.dog, 'assets/dog_enemy.png');
loadAsset(assets.treat, 'assets/treat_icon.png');
loadAsset(assets.treatGolden, 'assets/treat_golden.png');
loadAsset(assets.mouse, 'assets/upgrade_mouse.png');
loadAsset(assets.laser, 'assets/upgrade_laser.png');

// --- Audio ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type = 'sine', duration = 0.1, volume = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    click: () => playSound(440, 'triangle', 0.1, 0.2),
    upgrade: () => playSound(880, 'sine', 0.3, 0.2),
    fail: () => playSound(110, 'sawtooth', 0.5, 0.2),
    win: () => { playSound(523, 'sine', 0.2); setTimeout(()=>playSound(659, 'sine',0.2),100); setTimeout(()=>playSound(783, 'sine',0.4),200); },
    frenzy: () => playSound(1200, 'sine', 0.5, 0.3)
};

// --- Instrumentation ---
function log(category, message) { console.log(`[${category.toUpperCase()}] ${message}`); }

// --- Dev Cheats ---
window.devCheats = {
    skipToWin: () => { window.gameState.score = WIN_SCORE; window.gameState.phase = 'won'; document.getElementById('win-screen').classList.remove('hidden'); sfx.win(); },
    skipToLose: () => { window.gameState.hunger = 0; window.gameState.phase = 'lost'; document.getElementById('lose-screen').classList.remove('hidden'); sfx.fail(); },
    setLevel: (n) => { window.gameState.score = n; },
    spawnEnemy: () => { spawnDog(); },
    spawnGolden: () => { spawnGoldenTreat(); }
};

// --- Particles & Juice ---
class Particle {
    constructor(x, y, img) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = -Math.random() * 15;
        this.life = 1.0; this.img = img;
        this.angle = Math.random() * Math.PI * 2;
        this.va = (Math.random() - 0.5) * 0.2;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.5; this.life -= 0.02; this.angle += this.va; }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.drawImage(this.img, -20, -20, 40, 40); ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}

let particles = [];
let catScale = 1.0;
let screenShake = 0;

// --- Entities ---
class Dog {
    constructor() {
        this.x = Math.random() < 0.5 ? -200 : TARGET_WIDTH + 200;
        this.y = Math.random() * (TARGET_HEIGHT - 400) + 200;
        this.targetX = TARGET_WIDTH / 2;
        this.speed = 2.5; this.width = 250; this.height = 250;
        log('game', 'Dog spawned!');
    }
    update() {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 5) this.x += Math.sign(dx) * this.speed;
        else {
            if (window.gameState.score > 0) { window.gameState.score -= 2; screenShake = 5; }
        }
        // Auto-laser repel
        if (window.gameState.hasLaser && Math.abs(dx) < 400) {
            this.repel();
        }
    }
    repel() {
        const index = window.gameState.entities.indexOf(this);
        if (index > -1) {
            window.gameState.entities.splice(index, 1);
            sfx.click();
            log('game', 'Dog repelled by laser!');
        }
    }
    draw() { ctx.drawImage(assets.dog, this.x - this.width/2, this.y - this.height/2, this.width, this.height); }
    isHit(mx, my) {
        const dx = mx - this.x; const dy = my - this.y;
        return Math.sqrt(dx*dx + dy*dy) < this.width/2;
    }
}

class GoldenTreat {
    constructor() {
        this.x = Math.random() * (TARGET_WIDTH - 200) + 100;
        this.y = -100;
        this.vy = 3;
        this.width = 100; this.height = 100;
        this.life = 1.0;
    }
    update() {
        this.y += this.vy;
        if (this.y > TARGET_HEIGHT) this.life = 0;
    }
    draw() { ctx.drawImage(assets.treatGolden, this.x - this.width/2, this.y - this.height/2, this.width, this.height); }
    isHit(mx, my) {
        const dx = mx - this.x; const dy = my - this.y;
        return Math.sqrt(dx*dx + dy*dy) < this.width/2;
    }
}

function spawnDog() { window.gameState.entities.push(new Dog()); }
function spawnGoldenTreat() { window.gameState.entities.push(new GoldenTreat()); }

// --- Input ---
canvas.addEventListener('mousedown', (e) => {
    if (window.gameState.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (TARGET_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (TARGET_HEIGHT / rect.height);

    let hitEntity = false;
    for (let i = window.gameState.entities.length - 1; i >= 0; i--) {
        const ent = window.gameState.entities[i];
        if (ent.isHit(x, y)) {
            if (ent instanceof GoldenTreat) {
                startFrenzy();
                window.gameState.entities.splice(i, 1);
            } else if (ent instanceof Dog) {
                window.gameState.entities.splice(i, 1);
                sfx.click();
            }
            hitEntity = true; break;
        }
    }
    if (!hitEntity) {
        const dx = x - window.gameState.playerPos.x;
        const dy = y - window.gameState.playerPos.y;
        if (Math.sqrt(dx*dx + dy*dy) < 300) clickCat();
    }
});

function clickCat() {
    const val = window.gameState.treatsPerClick * window.gameState.multiplier;
    window.gameState.score += val;
    window.gameState.hunger = Math.min(100, window.gameState.hunger + HUNGER_RECOVERY);
    catScale = 1.1;
    sfx.click();
    for (let i = 0; i < 5; i++) particles.push(new Particle(window.gameState.playerPos.x, window.gameState.playerPos.y - 100, assets.treat));
    checkWin();
}

function startFrenzy() {
    window.gameState.frenzyTimer = 600; // 10 seconds at 60fps
    window.gameState.multiplier = 5;
    sfx.frenzy();
    log('game', 'FRENZY MODE!');
}

function checkWin() {
    if (window.gameState.score >= WIN_SCORE && window.gameState.phase === 'playing') {
        window.gameState.phase = 'won';
        document.getElementById('win-screen').classList.remove('hidden');
        sfx.win();
    }
}

const upgrades = [
    { id: 1, name: 'Toy Mouse', baseCost: 10, perClick: 1, auto: 0, count: 0 },
    { id: 2, name: 'Yarn Ball', baseCost: 100, perClick: 0, auto: 5, count: 0 },
    { id: 3, name: 'Catnip', baseCost: 500, perClick: 0, auto: 0, count: 0, mult: 0.1 },
    { id: 4, name: 'Laser Pointer', baseCost: 5000, perClick: 0, auto: 0, count: 0, laser: true }
];

function getCost(u) { return Math.floor(u.baseCost * Math.pow(1.2, u.count)); }

function buyUpgrade(id) {
    const u = upgrades.find(x => x.id === id);
    if (!u) return;
    const cost = getCost(u);
    if (window.gameState.score >= cost) {
        window.gameState.score -= cost;
        u.count++;
        if (u.perClick) window.gameState.treatsPerClick += u.perClick;
        if (u.auto) window.gameState.autoTreats += u.auto;
        if (u.mult) window.gameState.multiplier += u.mult;
        if (u.laser) window.gameState.hasLaser = true;
        sfx.upgrade();
        updateUI();
    }
}

function updateUI() {
    document.getElementById('score').innerText = Math.floor(window.gameState.score);
    document.getElementById('hunger-bar-fill').style.width = `${window.gameState.hunger}%`;
    if (window.gameState.frenzyTimer > 0) {
        document.getElementById('score-container').style.borderColor = 'gold';
        document.getElementById('score-container').style.background = '#fffbe6';
    } else {
        document.getElementById('score-container').style.borderColor = 'var(--primary-pink)';
        document.getElementById('score-container').style.background = 'white';
    }
    upgrades.forEach(u => {
        const el = document.getElementById(`upgrade-${u.id}`);
        if (el) {
            el.querySelector('.cost').innerText = getCost(u);
            el.style.opacity = window.gameState.score < getCost(u) ? '0.5' : '1';
        }
    });
}

// --- Main Loop ---
let lastTime = 0;
function loop(ts) {
    const dt = ts - lastTime; lastTime = ts;
    update(dt); draw();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (window.gameState.phase !== 'playing') return;

    window.gameState.score += (window.gameState.autoTreats * window.gameState.multiplier * dt) / 1000;
    window.gameState.hunger -= HUNGER_DECAY;
    if (window.gameState.hunger <= 0) { window.gameState.phase = 'lost'; document.getElementById('lose-screen').classList.remove('hidden'); sfx.fail(); }

    if (window.gameState.frenzyTimer > 0) {
        window.gameState.frenzyTimer--;
        if (window.gameState.frenzyTimer <= 0) window.gameState.multiplier = 1 + (upgrades[2].count * 0.1);
    }

    if (Math.random() < DOG_CHANCE) spawnDog();
    if (Math.random() < GOLDEN_TREAT_CHANCE) spawnGoldenTreat();

    window.gameState.entities.forEach(e => { e.update(); if (e.life === 0) e.dead = true; });
    window.gameState.entities = window.gameState.entities.filter(e => !e.dead);

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);

    if (catScale > 1.0) catScale -= 0.01;
    if (screenShake > 0) screenShake -= 1;
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake > 0) ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
    ctx.drawImage(assets.bg, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Dynamic Cat Growth
    let catImg = assets.catSkinny;
    if (window.gameState.score >= 100000) catImg = assets.catGod;
    else if (window.gameState.score >= 1000) catImg = assets.catMain;

    const catW = 600 * catScale; const catH = 600 * catScale;
    ctx.drawImage(catImg, window.gameState.playerPos.x - catW/2, window.gameState.playerPos.y - catH/2, catW, catH);

    window.gameState.entities.forEach(e => e.draw());
    particles.forEach(p => p.draw());

    if (window.gameState.frenzyTimer > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        ctx.fillStyle = 'gold'; ctx.font = 'bold 80px Fredoka One'; ctx.textAlign = 'center';
        ctx.fillText('FRENZY X5!', TARGET_WIDTH/2, 200);
    }
    ctx.restore();
}

// Init
window.addEventListener('resize', () => {
    const s = Math.min(window.innerWidth / TARGET_WIDTH, window.innerHeight / TARGET_HEIGHT);
    canvas.width = TARGET_WIDTH; canvas.height = TARGET_HEIGHT;
    canvas.style.width = `${TARGET_WIDTH * s}px`; canvas.style.height = `${TARGET_HEIGHT * s}px`;
});
window.dispatchEvent(new Event('resize'));
document.getElementById('start-btn').onclick = () => { window.gameState.phase = 'playing'; document.getElementById('menu').classList.add('hidden'); audioCtx.resume(); };
document.querySelectorAll('.restart-btn').forEach(b => b.onclick = () => location.reload());
[1,2,3,4].forEach(i => document.getElementById(`upgrade-${i}`).onclick = () => buyUpgrade(i));

requestAnimationFrame(loop);
