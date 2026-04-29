// Cat Clicker - Main Game Script

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Configuration ---
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const WIN_SCORE = 1000000;
const HUNGER_DECAY = 0.05; // per frame
const HUNGER_RECOVERY = 10; // per click
const DOG_CHANCE = 0.001; // chance per frame

// --- Game State ---
window.gameState = {
    phase: 'menu',
    score: 0,
    treatsPerClick: 1,
    autoTreats: 0,
    hunger: 100,
    fps: 0,
    entities: [],
    playerPos: { x: TARGET_WIDTH / 2, y: TARGET_HEIGHT / 2 + 100 }
};

// --- Assets ---
const assets = {
    bg: new Image(),
    cat: new Image(),
    dog: new Image(),
    treat: new Image(),
    mouse: new Image()
};

let assetsLoaded = 0;
const totalAssets = 5;

function loadAsset(img, src) {
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            log('assets', 'All assets loaded');
        }
    };
    img.onerror = (e) => console.error('Failed to load asset:', src, e);
    img.src = src;
}

loadAsset(assets.bg, 'assets/bg_living_room.png');
loadAsset(assets.cat, 'assets/cat_main.png');
loadAsset(assets.dog, 'assets/dog_enemy.png');
loadAsset(assets.treat, 'assets/treat_icon.png');
loadAsset(assets.mouse, 'assets/upgrade_mouse.png');

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
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    click: () => playSound(440, 'triangle', 0.1, 0.2),
    upgrade: () => playSound(880, 'sine', 0.3, 0.2),
    fail: () => playSound(110, 'sawtooth', 0.5, 0.2),
    win: () => {
        playSound(523.25, 'sine', 0.2);
        setTimeout(() => playSound(659.25, 'sine', 0.2), 100);
        setTimeout(() => playSound(783.99, 'sine', 0.4), 200);
    }
};

// --- Instrumentation ---
function log(category, message, data = {}) {
    console.log(`[${category.toUpperCase()}] ${message}`, data);
}

// --- Dev Cheats ---
window.devCheats = {
    skipToWin: () => {
        window.gameState.score = WIN_SCORE;
        window.gameState.phase = 'won';
        document.getElementById('win-screen').classList.remove('hidden');
        sfx.win();
    },
    skipToLose: () => {
        window.gameState.hunger = 0;
        window.gameState.phase = 'lost';
        document.getElementById('lose-screen').classList.remove('hidden');
        sfx.fail();
    },
    setLevel: (n) => {
        window.gameState.score = n;
    },
    spawnEnemy: () => {
        spawnDog();
    }
};

// --- Particles & Juice ---
class Particle {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = -Math.random() * 15;
        this.life = 1.0;
        this.img = img;
        this.angle = Math.random() * Math.PI * 2;
        this.va = (Math.random() - 0.5) * 0.2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.5;
        this.life -= 0.02;
        this.angle += this.va;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(this.img, -20, -20, 40, 40);
        ctx.restore();
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
        this.speed = 2;
        this.width = 250;
        this.height = 250;
        this.stealing = false;
        log('game', 'Dog spawned!');
    }
    update() {
        const dx = this.targetX - this.x;
        const dist = Math.abs(dx);
        if (dist > 5) {
            this.x += Math.sign(dx) * this.speed;
        } else {
            this.stealing = true;
            if (window.gameState.score > 0) {
                window.gameState.score -= 1;
                screenShake = 5;
            }
        }
    }
    draw() {
        ctx.drawImage(assets.dog, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
    isHit(mx, my) {
        const dx = mx - this.x;
        const dy = my - this.y;
        return Math.sqrt(dx*dx + dy*dy) < this.width/2;
    }
}

function spawnDog() {
    window.gameState.entities.push(new Dog());
}

// --- Input Handling ---
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousedown', (e) => {
    if (window.gameState.phase !== 'playing') return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = TARGET_WIDTH / rect.width;
    const scaleY = TARGET_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check hit on dog
    let hitDog = false;
    for (let i = window.gameState.entities.length - 1; i >= 0; i--) {
        if (window.gameState.entities[i] instanceof Dog && window.gameState.entities[i].isHit(x, y)) {
            window.gameState.entities.splice(i, 1);
            hitDog = true;
            sfx.click();
            log('game', 'Dog repelled!');
            break;
        }
    }

    if (!hitDog) {
        // Check hit on cat
        const dx = x - window.gameState.playerPos.x;
        const dy = y - window.gameState.playerPos.y;
        if (Math.sqrt(dx*dx + dy*dy) < 300) {
            clickCat();
        }
    }
});

function clickCat() {
    window.gameState.score += window.gameState.treatsPerClick;
    window.gameState.hunger = Math.min(100, window.gameState.hunger + HUNGER_RECOVERY);
    catScale = 1.1;
    sfx.click();
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(window.gameState.playerPos.x, window.gameState.playerPos.y - 100, assets.treat));
    }
    checkWin();
}

function checkWin() {
    if (window.gameState.score >= WIN_SCORE) {
        window.gameState.phase = 'won';
        document.getElementById('win-screen').classList.remove('hidden');
        sfx.win();
        log('game', 'Game Won!');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === '1') buyUpgrade(1);
    if (e.key === '2') buyUpgrade(2);
    if (e.key === '~') {
        const overlay = document.getElementById('fps-overlay');
        overlay.classList.toggle('hidden');
    }
});

const upgrades = [
    { id: 1, name: 'Toy Mouse', baseCost: 10, perClick: 1, auto: 0 },
    { id: 2, name: 'Yarn Ball', baseCost: 100, perClick: 0, auto: 5 }
];

function getCost(upgrade) {
    const count = upgrade.count || 0;
    return Math.floor(upgrade.baseCost * Math.pow(1.15, count));
}

function buyUpgrade(id) {
    const upgrade = upgrades.find(u => u.id === id);
    const cost = getCost(upgrade);
    if (window.gameState.score >= cost) {
        window.gameState.score -= cost;
        upgrade.count = (upgrade.count || 0) + 1;
        window.gameState.treatsPerClick += upgrade.perClick;
        window.gameState.autoTreats += upgrade.auto;
        sfx.upgrade();
        updateUI();
        log('game', `Bought upgrade: ${upgrade.name}`);
    }
}

function updateUI() {
    document.getElementById('score').innerText = Math.floor(window.gameState.score);
    document.getElementById('hunger-bar-fill').style.width = `${window.gameState.hunger}%`;
    upgrades.forEach(u => {
        const el = document.getElementById(`upgrade-${u.id}`);
        if (el) {
            el.querySelector('.cost').innerText = getCost(u);
            if (window.gameState.score < getCost(u)) {
                el.style.opacity = '0.5';
            } else {
                el.style.opacity = '1';
            }
        }
    });
}

document.getElementById('upgrade-1').onclick = () => buyUpgrade(1);
document.getElementById('upgrade-2').onclick = () => buyUpgrade(2);

document.getElementById('start-btn').onclick = () => {
    window.gameState.phase = 'playing';
    document.getElementById('menu').classList.add('hidden');
    audioCtx.resume();
    log('game', 'Game Started');
};

document.querySelectorAll('.restart-btn').forEach(btn => {
    btn.onclick = () => location.reload();
});

// --- Main Loop ---
let lastTime = 0;
let frameCount = 0;
let fpsTimer = 0;

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // FPS calculation
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 1000) {
        window.gameState.fps = Math.round((frameCount * 1000) / fpsTimer);
        document.getElementById('fps-overlay').innerText = `FPS: ${window.gameState.fps}`;
        frameCount = 0;
        fpsTimer = 0;
    }

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

function update(dt) {
    if (window.gameState.phase !== 'playing') return;

    // Auto treats
    window.gameState.score += (window.gameState.autoTreats * dt) / 1000;
    checkWin();

    // Hunger
    window.gameState.hunger -= HUNGER_DECAY;
    if (window.gameState.hunger <= 0) {
        window.gameState.hunger = 0;
        window.gameState.phase = 'lost';
        document.getElementById('lose-screen').classList.remove('hidden');
        sfx.fail();
        log('game', 'Game Lost!');
    }

    // Entities
    if (Math.random() < DOG_CHANCE) {
        spawnDog();
    }
    window.gameState.entities.forEach(e => e.update());

    // Particles
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);

    // Juice
    if (catScale > 1.0) catScale -= 0.01;
    if (screenShake > 0) screenShake -= 1;

    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
    }

    // BG
    ctx.drawImage(assets.bg, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Cat
    const catW = 600 * catScale;
    const catH = 600 * catScale;
    ctx.drawImage(assets.cat, window.gameState.playerPos.x - catW/2, window.gameState.playerPos.y - catH/2, catW, catH);

    // Entities
    window.gameState.entities.forEach(e => e.draw());

    // Particles
    particles.forEach(p => p.draw());

    ctx.restore();
}

// --- Resize Handling ---
function resize() {
    const scale = Math.min(window.innerWidth / TARGET_WIDTH, window.innerHeight / TARGET_HEIGHT);
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    canvas.style.width = `${TARGET_WIDTH * scale}px`;
    canvas.style.height = `${TARGET_HEIGHT * scale}px`;
}

window.addEventListener('resize', resize);
resize();

requestAnimationFrame(loop);
