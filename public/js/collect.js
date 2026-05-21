const user = getCurrentUser();
if (!user) location.href = '/login.html';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 800, H = 600;
canvas.width = W;
canvas.height = H;

let bgImage = new Image();
let bgLoaded = false;
bgImage.onload = () => { bgLoaded = true; };
bgImage.src = '/images/bg_forest.jpg';

let score = 0;
let bestScore = parseInt(localStorage.getItem(`jump_best_${user.id}`)) || 0;
let gameActive = true;
let animationId = null;

let player = {
    x: W/2 - 25,
    y: 0,
    width: 50,
    height: 50,
    vy: 0,
    grounded: true,
    jumpsLeft: 1
};
const GRAVITY = 0.55;
const JUMP_POWER = -12.5;

let platforms = [];
let currentPlatformIndex = 0;
let maxReachedY = H;
let cameraY = 0;

let mouseX = localStorage.getItem('lastMouseX') ? parseFloat(localStorage.getItem('lastMouseX')) : player.x + player.width/2;
mouseX = Math.min(Math.max(mouseX, 0), W);
let isMouseMoving = false;

let firstJumpDone = false;

// ----- ГЕНЕРАЦИЯ ПЛАТФОРМ -----
function createRandomPlatform(y, isStart = false) {
    let x, width;
    if (isStart) {
        // Стартовая платформа: почти на всю ширину, по центру
        width = W - 80;
        x = (W - width) / 2;
    } else {
        width = 60 + Math.random() * 60;
        x = Math.random() * (W - width - 20) + 10;
    }
    let isDanger = !isStart && Math.random() < 0.1; // 10% опасных
    return {
        x, y, width, height: 20,
        isDanger,
        isStart,
        dangerTimer: null,
        blinking: false,
        blinkInterval: null
    };
}

function addPlatformAbove(lastY) {
    let stepY = 80 + Math.random() * 40;
    let newY = lastY - stepY;
    return createRandomPlatform(newY);
}

function startDangerousPlatformRemoval(platform) {
    if (platform.dangerTimer) return;
    platform.blinking = true;
    let blinkCount = 0;
    platform.blinkInterval = setInterval(() => {
        if (!platform.blinking) return;
        blinkCount++;
        if (blinkCount >= 32) {
            clearInterval(platform.blinkInterval);
            platform.blinking = false;
        }
    }, 250);
    platform.dangerTimer = setTimeout(() => {
        if (platform.blinkInterval) clearInterval(platform.blinkInterval);
        const index = platforms.findIndex(p => p === platform);
        if (index !== -1) {
            let safePlatforms = platforms.filter(p => !p.isDanger && !p.isStart);
            let highestY = safePlatforms.length ? Math.min(...safePlatforms.map(p => p.y)) : (platforms[0]?.y || H);
            let newPlatform = addPlatformAbove(highestY);
            platforms.push(newPlatform);
            platforms.splice(index, 1);
        }
    }, 8000);
}

function initGame() {
    score = 0;
    maxReachedY = H;
    gameActive = true;
    firstJumpDone = false;
    player.x = W/2 - 25;
    player.vy = 0;
    player.grounded = true;
    player.jumpsLeft = 1;
    // Стартовая платформа – широкая, зелёная
    let startPlatform = createRandomPlatform(H - 20, true);
    platforms = [startPlatform];
    player.y = startPlatform.y - player.height;
    currentPlatformIndex = 0;
    let lastY = startPlatform.y;
    for (let i = 0; i < 6; i++) {
        let newPlatform = addPlatformAbove(lastY);
        platforms.push(newPlatform);
        lastY = newPlatform.y;
    }
    cameraY = player.y + player.height/2 - H/2;
    updateUI();
    document.getElementById('message').innerHTML = '';
    updateMousePositionFromStorage();
}

function updateUI() {
    document.getElementById('scoreValue').innerText = score;
    document.getElementById('heightValue').innerText = Math.max(0, Math.floor(H - maxReachedY));
}

async function endGame() {
    if (!gameActive) return;
    gameActive = false;
    if (animationId) cancelAnimationFrame(animationId);
    for (let p of platforms) {
        if (p.dangerTimer) clearTimeout(p.dangerTimer);
        if (p.blinkInterval) clearInterval(p.blinkInterval);
    }
    let delta = score;
    let msg = '';
    if (score > bestScore) {
        localStorage.setItem(`jump_best_${user.id}`, score);
        bestScore = score;
        msg = `🏆 НОВЫЙ РЕКОРД: ${score}! +${delta} к рейтингу.`;
        await updateRating(user.id, 'collect', delta);
    } else {
        msg = `Игра окончена. Счёт: ${score}. Рекорд: ${bestScore}. Рейтинг не изменился.`;
    }
    const restartBtn = document.createElement('button');
    restartBtn.textContent = '🔄 НОВАЯ ИГРА';
    restartBtn.className = 'restart-btn';
    restartBtn.onclick = () => location.reload();
    document.getElementById('message').innerHTML = msg;
    document.getElementById('message').appendChild(restartBtn);
}

function updateGame() {
    if (!gameActive) return;
    let wasGrounded = player.grounded;
    if (isMouseMoving) {
        let targetX = mouseX - player.width/2;
        targetX = Math.min(Math.max(targetX, 0), W - player.width);
        player.x = targetX;
    }
    player.vy += GRAVITY;
    player.y += player.vy;
    let onPlatform = false;
    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        if (player.vy >= 0 &&
            player.y + player.height <= p.y + p.height &&
            player.y + player.height + player.vy >= p.y &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width) {
            if (p.isDanger) {
                startDangerousPlatformRemoval(p);
                continue;
            } else {
                player.y = p.y - player.height;
                player.vy = 0;
                player.grounded = true;
                player.jumpsLeft = 1;
                onPlatform = true;
                if (i !== currentPlatformIndex && p.y < maxReachedY - 20) {
                    score++;
                    maxReachedY = p.y;
                    updateUI();
                    currentPlatformIndex = i;
                    let highestY = Math.min(...platforms.map(pf => pf.y));
                    let newPlatform = addPlatformAbove(highestY);
                    platforms.push(newPlatform);
                }
                break;
            }
        }
    }
    if (!onPlatform) player.grounded = false;
    // Удаление стартовой платформы ПОСЛЕ ПЕРВОГО ПРЫЖКА
    if (!firstJumpDone && wasGrounded && !player.grounded) {
        platforms = platforms.filter(p => !p.isStart);
        firstJumpDone = true;
    }
    if (player.y + player.height > H) {
        endGame();
        return;
    }
    cameraY = player.y + player.height/2 - H/2;
    platforms = platforms.filter(p => p.y + p.height > cameraY - 500);
    draw();
}

function draw() {
    if (bgLoaded && bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, W, H);
    } else {
        let grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#1a3a2a');
        grd.addColorStop(1, '#2a5a3a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
    }
    for (let p of platforms) {
        let screenY = p.y - cameraY;
        if (screenY + p.height > 0 && screenY < H) {
            if (p.isStart) {
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(p.x, screenY, p.width, p.height);
                ctx.fillStyle = '#27ae60';
                ctx.fillRect(p.x, screenY, p.width, 5);
            } else if (p.isDanger) {
                if (p.blinking && (Math.floor(Date.now() / 250) % 2 === 0)) {
                    ctx.fillStyle = '#ff6666';
                } else {
                    ctx.fillStyle = '#c0392b';
                }
                ctx.fillRect(p.x, screenY, p.width, p.height);
                ctx.fillStyle = '#8b0000';
                ctx.fillRect(p.x, screenY, p.width, 5);
            } else {
                ctx.fillStyle = '#cd853f';
                ctx.fillRect(p.x, screenY, p.width, p.height);
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(p.x, screenY, p.width, 5);
            }
        }
    }
    let playerScreenY = player.y - cameraY;
    ctx.font = '48px "Segoe UI Emoji"';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('🐆', player.x, playerScreenY + player.height - 8);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black';
    ctx.fillText(`Очки: ${score}`, 10, 30);
    ctx.fillText(`Рекорд: ${bestScore}`, 10, 60);
    ctx.shadowColor = 'transparent';
}

function updateMousePositionFromStorage() {
    let stored = localStorage.getItem('lastMouseX');
    if (stored !== null) {
        let x = parseFloat(stored);
        if (!isNaN(x)) {
            mouseX = Math.min(Math.max(x, 0), W);
            isMouseMoving = true;
        }
    }
}

window.addEventListener('beforeunload', () => {
    localStorage.setItem('lastMouseX', mouseX);
});

function handleMouseMove(e) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (W / rect.width);
    x = Math.min(Math.max(x, 0), W);
    mouseX = x;
    isMouseMoving = true;
    localStorage.setItem('lastMouseX', mouseX);
}
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseleave', () => { isMouseMoving = false; });

function handleKey(e) {
    if (e.code === 'Space' && gameActive) {
        e.preventDefault();
        if (player.grounded) {
            player.vy = JUMP_POWER;
            player.grounded = false;
            player.jumpsLeft = 1;
        } else if (player.jumpsLeft > 0 && !player.grounded) {
            player.vy = JUMP_POWER;
            player.jumpsLeft--;
        }
    }
}
window.addEventListener('keydown', handleKey);

function gameLoop() {
    if (!gameActive) return;
    updateGame();
    animationId = requestAnimationFrame(gameLoop);
}

initGame();
gameLoop();