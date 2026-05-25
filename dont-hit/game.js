const holes = document.querySelectorAll('.hole');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const finalScoreDisplay = document.getElementById('final-score');
const resultTitle = document.getElementById('result-title');

let score = 0;
let timeLeft = 30;
let gameActive = false;
let lastHole;
let timerId;
let spawnId;

function init() {
    holes.forEach(hole => {
        hole.addEventListener('click', hit);
    });
}

function startGame() {
    score = 0;
    timeLeft = 30;
    gameActive = true;
    scoreDisplay.textContent = `得分: ${score}`;
    timerDisplay.textContent = `时间: ${timeLeft}s`;
    overlay.classList.add('hidden');
    
    timerId = setInterval(updateTimer, 1000);
    spawnLoop();
}

function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = `时间: ${timeLeft}s`;
    if (timeLeft <= 0) {
        endGame();
    }
}

function spawnLoop() {
    if (!gameActive) return;
    
    const time = Math.random() * (1000 - 500) + 500; // 0.5s - 1s
    const hole = randomHole(holes);
    const isBad = Math.random() < 0.3; // 30% 概率出红色的
    
    const char = document.createElement('div');
    char.classList.add('character');
    char.classList.add(isBad ? 'bad' : 'good');
    hole.appendChild(char);
    
    setTimeout(() => char.classList.add('up'), 10);
    
    const stayTime = Math.random() * (1200 - 700) + 700;
    
    setTimeout(() => {
        if (char.parentNode) {
            char.classList.remove('up');
            setTimeout(() => {
                if (char.parentNode) hole.removeChild(char);
            }, 100);
        }
        if (gameActive) spawnLoop();
    }, stayTime);
}

function randomHole(holes) {
    const idx = Math.floor(Math.random() * holes.length);
    const hole = holes[idx];
    if (hole === lastHole || hole.children.length > 0) {
        return randomHole(holes);
    }
    lastHole = hole;
    return hole;
}

function hit(e) {
    if (!gameActive) return;
    if (e.target.classList.contains('character')) {
        const char = e.target;
        const isBad = char.classList.contains('bad');
        
        if (isBad) {
            score -= 20;
            showEffect(e.pageX, e.pageY, '-20', '#e74c3c');
            document.body.style.backgroundColor = '#c0392b';
            setTimeout(() => document.body.style.backgroundColor = '#2c3e50', 100);
        } else {
            score += 10;
            showEffect(e.pageX, e.pageY, '+10', '#2ecc71');
        }
        
        scoreDisplay.textContent = `得分: ${score}`;
        char.parentNode.removeChild(char);
    }
}

function showEffect(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'hit-effect';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => document.body.removeChild(el), 500);
}

function endGame() {
    gameActive = false;
    clearInterval(timerId);
    overlay.classList.remove('hidden');
    resultTitle.textContent = '时间到！';
    finalScoreDisplay.textContent = `最终得分: ${score}`;
    startBtn.textContent = '再来一局';
}

startBtn.addEventListener('click', startGame);
init();
