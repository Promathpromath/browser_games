const user = getCurrentUser();
if (!user) location.href = '/login.html';

let examples = [];
let lives = 3;
let timeLeft = 30;
let gameActive = true;
let timerInterval = null;

function generateRandomExamples() {
    const rand = (min,max) => Math.floor(Math.random()*(max-min+1)+min);
    return [
        { text: `${rand(1,20)} + ${rand(1,20)}`, ans: null },
        { text: `${rand(10,30)} - ${rand(1,9)}`, ans: null },
        { text: `${rand(2,9)*rand(2,9)} : ${rand(2,9)}`, ans: null },
        { text: `${rand(2,9)} * ${rand(2,9)}`, ans: null },
        { text: `${rand(2,5)} * ${rand(2,5)} + ${rand(1,5)}`, ans: null }
    ].map(ex => {
        let expr = ex.text.replace(/:/g, '/');
        ex.ans = eval(expr);
        return ex;
    });
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    examples.forEach((ex, idx) => {
        const div = document.createElement('div');
        div.className = 'ex-row';
        div.id = `row-${idx}`;
        div.innerHTML = `<span>${ex.text} = </span><input type="number" id="inp-${idx}" placeholder="Ответ">`;
        container.appendChild(div);
    });
    for (let i=0; i<examples.length; i++) {
        document.getElementById(`inp-${i}`).addEventListener('blur', () => checkAnswer(i));
    }
}

function checkAnswer(idx) {
    if (!gameActive) return;
    const input = document.getElementById(`inp-${idx}`);
    const row = document.getElementById(`row-${idx}`);
    const userAnswer = parseFloat(input.value);
    const correct = examples[idx].ans;
    if (row.classList.contains('correct')) return;
    if (isNaN(userAnswer)) return;
    if (userAnswer === correct) {
        row.classList.add('correct');
        row.classList.remove('wrong');
        checkAllCorrect();
    } else {
        row.classList.add('wrong');
        row.classList.remove('correct');
        if (lives > 0) {
            lives--;
            document.getElementById('lives').innerText = lives;
            if (lives === 0) endGame('lives');
        } else endGame('lives');
    }
}

function checkAllCorrect() {
    let allCorrect = true;
    for (let i=0; i<examples.length; i++) {
        if (!document.getElementById(`row-${i}`).classList.contains('correct')) { allCorrect = false; break; }
    }
    if (allCorrect) endGame('win');
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        if (timeLeft <= 1) endGame('timeout');
        else { timeLeft--; document.getElementById('timer').innerText = timeLeft; }
    }, 1000);
}

async function endGame(reason) {
    if (!gameActive) return;
    gameActive = false;
    clearInterval(timerInterval);
    let allCorrect = true;
    for (let i=0; i<examples.length; i++) if (!document.getElementById(`row-${i}`).classList.contains('correct')) allCorrect = false;
    let delta = 0, message = '';
    if (reason === 'win' || allCorrect) {
        delta = 5; // очки = 5 за правильные ответы
        message = 'Победа! +5 к рейтингу';
    } else if (lives > 0 && reason === 'timeout') {
        delta = 1;
        message = 'Время вышло, но ты молодец! +1';
    } else {
        delta = -1;
        message = 'В следующий раз получится! -1';
    }
    document.getElementById('resultMsg').innerHTML = message;
    await updateRating(user.id, 'math', delta);
    document.getElementById('questionsContainer').innerHTML = '<button class="btn-play" onclick="location.reload()">Новая игра</button>';
}

examples = generateRandomExamples();
renderQuestions();
startTimer();