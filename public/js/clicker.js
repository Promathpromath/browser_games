const user = getCurrentUser();
if (!user) location.href = '/login.html';

let score = 0;
let timeLeft = 0;
let multiplier = 1;
let gameActive = false;
let currentMode = '30';
let timerInterval = null;
let boosterActive = false;

const jaguarBox = document.getElementById('jaguarBtn');
const scoreSpan = document.getElementById('scoreValue');
const timerSpan = document.getElementById('timerValue');
const multiplierSpan = document.getElementById('multiplier');
const boosterBtn = document.getElementById('boosterX4');
const resultDiv = document.getElementById('resultMessage');

function formatScore(val) {
    if (val >= 1_000_000) return (val/1_000_000).toFixed(1)+'M';
    if (val >= 1_000) return (val/1_000).toFixed(1)+'K';
    return val.toString();
}

function updateUI() {
    scoreSpan.innerText = formatScore(score);
    if (currentMode !== 'inf') timerSpan.innerText = timeLeft;
    else timerSpan.innerText = '∞';
    multiplierSpan.innerText = `×${multiplier}`;
    boosterBtn.disabled = (boosterActive || score < 30);
}

async function endGame() {
    if (!gameActive) return;
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    let delta = 0, msg = '';
    if (currentMode !== 'inf') {
        delta = score; // передаём все набранные очки
        await updateRating(user.id, 'clicker', delta);
        msg = `Игра окончена! Счёт: ${formatScore(score)}. +${delta} к рейтингу.`;
    } else {
        msg = `Бесконечный режим: ${formatScore(score)} очков. Рейтинг не начисляется.`;
    }
    resultDiv.innerHTML = msg;
}

function startGame(mode) {
    if (gameActive) endGame();
    gameActive = true;
    score = 0;
    multiplier = 1;
    boosterActive = false;
    currentMode = mode;
    if (mode === '30') timeLeft = 30;
    else if (mode === '180') timeLeft = 180;
    else timeLeft = 0;
    updateUI();
    if (timerInterval) clearInterval(timerInterval);
    if (mode !== 'inf') {
        timerInterval = setInterval(() => {
            if (!gameActive) return;
            if (timeLeft <= 1) endGame();
            else { timeLeft--; timerSpan.innerText = timeLeft; }
        }, 1000);
    }
}

function flashRandomColor() {
    const colors = ['#ff4d4d', '#4dff4d', '#4d4dff', '#ffdd4d', '#ff4dff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    jaguarBox.style.transition = 'box-shadow 0.05s';
    jaguarBox.style.boxShadow = `0 0 25px 12px ${randomColor}`;
    setTimeout(() => jaguarBox.style.boxShadow = '', 120);
}

jaguarBox.onclick = () => {
    if (!gameActive) return;
    score += multiplier;
    updateUI();
    flashRandomColor();
};

boosterBtn.onclick = () => {
    if (!gameActive || boosterActive) return;
    if (score >= 30) {
        score -= 30;
        multiplier = 4;
        boosterActive = true;
        updateUI();
    }
};

const mode30 = document.getElementById('mode30');
const mode180 = document.getElementById('mode180');
const modeInf = document.getElementById('modeInf');
function setActive(activeBtn) {
    [mode30, mode180, modeInf].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}
mode30.onclick = () => { startGame('30'); setActive(mode30); };
mode180.onclick = () => { startGame('180'); setActive(mode180); };
modeInf.onclick = () => { startGame('inf'); setActive(modeInf); };

startGame('30');
