/**
 * NEON PAC-MAN - Full Screen Immersive Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const overlayTitle = document.getElementById('overlay-title');
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const livesContainer = document.getElementById('lives');

// Maze configuration
const MAP_ROWS = 21;
const MAP_COLS = 19;
let TILE_SIZE = 0;

const originalMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 3, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 4, 4, 4, 1, 2, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 2, 0, 2, 2, 1, 4, 4, 4, 1, 2, 2, 0, 2, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 3, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Game state variables
let map = [];
let score = 0;
let highScore = localStorage.getItem('pacman-high-score') || 0;
let level = 1;
let lives = 3;
let gameOver = false;
let gameStarted = false;
let isPaused = false;
let powerMode = false;
let powerTimer = null;

// Directions
const DIR = {
    UP: { x: 0, y: -1, angle: Math.PI * 1.5 },
    DOWN: { x: 0, y: 1, angle: Math.PI * 0.5 },
    LEFT: { x: -1, y: 0, angle: Math.PI },
    RIGHT: { x: 1, y: 0, angle: 0 }
};

function togglePause() {
    if (!gameStarted || gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseOverlay.classList.add('active');
    } else {
        pauseOverlay.classList.remove('active');
        requestAnimationFrame(gameLoop);
    }
}

function resizeCanvas() {
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    const tileW = availableWidth / MAP_COLS;
    const tileH = availableHeight / MAP_ROWS;

    TILE_SIZE = Math.floor(Math.min(tileW, tileH));

    canvas.width = MAP_COLS * TILE_SIZE;
    canvas.height = MAP_ROWS * TILE_SIZE;

    // Reset positions if already playing to avoid glitches
    if (pacman) {
        pacman.updateBasePos();
        ghosts.forEach(g => g.updateBasePos());
    }
}

class Entity {
    constructor(col, row, speedMultiplier) {
        this.col = col;
        this.row = row;
        this.updateBasePos();
        this.speedMultiplier = speedMultiplier;
        this.dir = DIR.RIGHT;
        this.nextDir = DIR.RIGHT;
    }

    updateBasePos() {
        this.x = this.col * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.row * TILE_SIZE + TILE_SIZE / 2;
    }

    getMapPos() {
        return {
            row: Math.floor(this.y / TILE_SIZE),
            col: Math.floor(this.x / TILE_SIZE)
        };
    }

    isAtCenter() {
        const speed = TILE_SIZE * 0.1 * this.speedMultiplier;
        const centerThreshold = speed;
        const centerX = (Math.floor(this.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const centerY = (Math.floor(this.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        return Math.abs(this.x - centerX) <= centerThreshold && Math.abs(this.y - centerY) <= centerThreshold;
    }

    canMove(dir) {
        const pos = this.getMapPos();
        const nextRow = pos.row + dir.y;
        const nextCol = pos.col + dir.x;

        if (nextCol < 0 || nextCol >= MAP_COLS) return true;
        if (nextRow < 0 || nextRow >= MAP_ROWS) return false;

        const nextTile = map[nextRow][nextCol];
        if (nextTile === 1) return false;
        if (nextTile === 4) return this instanceof Ghost;
        return true;
    }

    move() {
        const speed = TILE_SIZE * 0.1 * this.speedMultiplier;

        if (this.isAtCenter()) {
            if (this.canMove(this.nextDir)) {
                this.dir = this.nextDir;
            }
            if (!this.canMove(this.dir)) {
                this.x = (Math.floor(this.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
                this.y = (Math.floor(this.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
                return;
            }
        }

        this.x += this.dir.x * speed;
        this.y += this.dir.y * speed;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;

        this.col = Math.floor(this.x / TILE_SIZE);
        this.row = Math.floor(this.y / TILE_SIZE);
    }
}

class Pacman extends Entity {
    constructor(col, row) {
        super(col, row, 1.2);
        this.mouthOpen = 0;
    }

    draw() {
        const radius = TILE_SIZE / 2 - 2;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.dir.angle);

        ctx.beginPath();
        const mouthAngle = Math.sin(this.mouthOpen) * 0.5;
        ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle);
        ctx.lineTo(0, 0);

        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        ctx.fill();
        ctx.restore();

        this.mouthOpen += 0.2;
    }

    update() {
        this.move();
        this.checkCollisions();
    }

    checkCollisions() {
        const pos = this.getMapPos();
        if (pos.row < 0 || pos.row >= MAP_ROWS || pos.col < 0 || pos.col >= MAP_COLS) return;
        const tile = map[pos.row][pos.col];

        if (tile === 0) { // Dot
            map[pos.row][pos.col] = 2;
            score += 10;
        } else if (tile === 3) { // Energizer
            map[pos.row][pos.col] = 2;
            score += 50;
            activatePowerMode();
        }
        updateUI();
    }
}

class Ghost extends Entity {
    constructor(col, row, color) {
        super(col, row, 0.8);
        this.color = color;
        this.scared = false;
    }

    draw() {
        const radius = TILE_SIZE / 2 - 2;
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, -2, radius, Math.PI, 0);
        ctx.lineTo(radius, radius);
        for (let i = 0; i < 3; i++) {
            ctx.arc(-radius + (radius * 2 / 3) * (i + 0.5), radius, radius / 3, 0, Math.PI);
        }
        ctx.lineTo(-radius, -2);

        ctx.fillStyle = this.scared ? (Math.floor(Date.now() / 200) % 2 ? '#fff' : '#2121ff') : this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();

        if (!this.scared) {
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(-4, -4, 3, 0, Math.PI * 2); ctx.arc(4, -4, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'blue';
            ctx.beginPath(); ctx.arc(-4 + this.dir.x * 2, -4 + this.dir.y * 2, 1.5, 0, Math.PI * 2); ctx.arc(4 + this.dir.x * 2, -4 + this.dir.y * 2, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    update() {
        this.speedMultiplier = (this.scared ? 0.4 : 0.8) + (level * 0.05);

        if (this.isAtCenter()) {
            const possibleDirs = Object.values(DIR).filter(d => this.canMove(d) && !(d.x === -this.dir.x && d.y === -this.dir.y));
            if (possibleDirs.length > 0) {
                if (Math.random() < 0.8) {
                    possibleDirs.sort((a, b) => {
                        const distA = Math.hypot(this.x + a.x * TILE_SIZE - pacman.x, this.y + a.y * TILE_SIZE - pacman.y);
                        const distB = Math.hypot(this.x + b.x * TILE_SIZE - pacman.x, this.y + b.y * TILE_SIZE - pacman.y);
                        return this.scared ? distB - distA : distA - distB;
                    });
                } else {
                    possibleDirs.sort(() => Math.random() - 0.5);
                }
                this.nextDir = possibleDirs[0];
            }
        }
        this.move();
    }
}

let pacman;
let ghosts = [];

function initGame() {
    map = JSON.parse(JSON.stringify(originalMap));
    score = 0;
    level = 1;
    lives = 3;
    gameOver = false;
    isPaused = false;
    resetPositions();
    updateUI();
    renderLives();
}

function resetPositions() {
    pacman = new Pacman(9, 15);
    ghosts = [
        new Ghost(9, 8, '#ff0000'), new Ghost(8, 9, '#ffb8ff'),
        new Ghost(9, 9, '#00ffff'), new Ghost(10, 9, '#ffb852')
    ];
}

function updateUI() {
    scoreEl.textContent = score.toString().padStart(6, '0');
    highScoreEl.textContent = highScore.toString().padStart(6, '0');
    levelEl.textContent = level;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacman-high-score', highScore);
    }
}

function renderLives() {
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('div');
        life.className = 'life-icon';
        livesContainer.appendChild(life);
    }
}

function activatePowerMode() {
    powerMode = true;
    ghosts.forEach(g => g.scared = true);
    clearTimeout(powerTimer);
    powerTimer = setTimeout(() => {
        powerMode = false;
        ghosts.forEach(g => g.scared = false);
    }, 8000);
}

function drawMap() {
    ctx.shadowBlur = 0;
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const tile = map[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;
            if (tile === 1) {
                ctx.strokeStyle = '#2222ff'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = '#4444ff';
                ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            } else if (tile === 0) {
                ctx.fillStyle = '#ffb8ae'; ctx.beginPath(); ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2); ctx.fill();
            } else if (tile === 3) {
                ctx.fillStyle = '#ffb8ae'; ctx.shadowBlur = 15; ctx.shadowColor = '#fff';
                ctx.beginPath(); ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 7, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}

function gameLoop() {
    if (!gameStarted || gameOver || isPaused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    pacman.update();
    pacman.draw();

    ghosts.forEach(ghost => {
        ghost.update(); ghost.draw();
        const dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y);
        if (dist < TILE_SIZE * 0.7) {
            if (ghost.scared) {
                score += 200;
                ghost.x = 9 * TILE_SIZE + TILE_SIZE / 2; ghost.y = 9 * TILE_SIZE + TILE_SIZE / 2;
                ghost.scared = false;
            } else { handleDeath(); }
        }
    });

    if (map.flat().filter(t => t === 0 || t === 3).length === 0) {
        level++;
        map = JSON.parse(JSON.stringify(originalMap));
        resetPositions();
        updateUI();
    }
    requestAnimationFrame(gameLoop);
}

function handleDeath() {
    lives--;
    renderLives();
    if (lives <= 0) { endGame('GAME OVER'); } else { resetPositions(); }
}

function endGame(text) {
    gameOver = true;
    overlayTitle.textContent = text;
    startBtn.textContent = 'RESTART';
    overlay.classList.add('active');
}

// Controls
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        togglePause();
        return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (isPaused) return;

    switch (e.key) {
        case 'ArrowUp': pacman.nextDir = DIR.UP; break;
        case 'ArrowDown': pacman.nextDir = DIR.DOWN; break;
        case 'ArrowLeft': pacman.nextDir = DIR.LEFT; break;
        case 'ArrowRight': pacman.nextDir = DIR.RIGHT; break;
    }
});

// Mobile/Click Controls
const bindBtn = (id, dir) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const handler = (e) => {
        e.preventDefault();
        if (!isPaused) pacman.nextDir = dir;
    };
    btn.addEventListener('touchstart', handler);
    btn.addEventListener('mousedown', handler);
};
bindBtn('up-btn', DIR.UP); bindBtn('down-btn', DIR.DOWN); bindBtn('left-btn', DIR.LEFT); bindBtn('right-btn', DIR.RIGHT);

startBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    if (gameOver) initGame();
    gameStarted = true;
    requestAnimationFrame(gameLoop);
});

resumeBtn.addEventListener('click', () => {
    togglePause();
});

window.addEventListener('resize', resizeCanvas);

// Initial start
resizeCanvas();
initGame();
drawMap();
pacman.draw();
ghosts.forEach(g => g.draw());
