const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// 游戏状态
let score = 0;
let highScore = localStorage.getItem('starGameHighScore') || 0;
let level = 1;
let lives = 3;
let gameOver = false;
let animationId;

// 难度配置
const difficulty = {
    starSpawnRate: 0.015,
    starSpeedMin: 0.8,
    starSpeedMax: 1.8
};

// 初始化最高分显示
highScoreElement.textContent = `最佳: ${highScore}`;

// 星星和粒子数据容器 (提前定义以供 resize 调用)
const stars = [];
const particles = [];
const bgStars = [];
const starRadius = 12;

// 调整画布大小时更新玩家位置
function resize() {
    const displayWidth = canvas.clientWidth || 600;
    const displayHeight = canvas.clientHeight || 400;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    if (typeof player !== 'undefined') {
        // 按比例调整玩家水平位置
        if (oldWidth > 0 && oldWidth !== displayWidth) {
            const ratioX = player.x / oldWidth;
            player.x = canvas.width * ratioX;
        } else if (oldWidth === 0) {
            player.x = canvas.width / 2 - player.width / 2;
        }

        // 按比例调整玩家垂直位置
        if (oldHeight > 0 && oldHeight !== displayHeight) {
            const ratioY = player.y / oldHeight;
            player.y = canvas.height * ratioY;
        } else if (oldHeight === 0) {
            player.y = canvas.height - 40;
        }

        // 确保不超出边界
        keepPlayerInBounds();
    }
    initBackgroundStars();
}

function keepPlayerInBounds() {
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}
window.addEventListener('resize', resize);

// 玩家对象
const player = {
    width: 80,
    height: 15,
    x: 0,
    y: 0,
    speed: 10,
    color: '#e94560',
    glowColor: 'rgba(233, 69, 96, 0.6)',
    dx: 0
};
player.x = canvas.width / 2 - player.width / 2;
player.y = canvas.height - 40;

// 注意：resize() 现在在 player 定义后调用
resize();

function initBackgroundStars() {
    bgStars.length = 0;
    for (let i = 0; i < 50; i++) {
        bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            opacity: Math.random() * 0.5 + 0.2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

function createStar() {
    const x = Math.random() * (canvas.width - starRadius * 2) + starRadius;
    const speed = difficulty.starSpeedMin + Math.random() * (difficulty.starSpeedMax - difficulty.starSpeedMin);
    stars.push({
        x: x,
        y: -starRadius * 2,
        speed: speed,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        color: '#f9d71c',
        glowColor: 'rgba(249, 215, 28, 0.4)'
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

// 键盘控制
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    keys[e.key] = true; // 增加对 key 的支持
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keys[e.key] = false;
});

// 鼠标控制
let isMouseDown = false;
canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    handlePointer(e);
});
window.addEventListener('mousemove', (e) => {
    if (isMouseDown) handlePointer(e);
});
window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// 移动端触摸控制
canvas.addEventListener('touchstart', handlePointer, { passive: false });
canvas.addEventListener('touchmove', handlePointer, { passive: false });

function handlePointer(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;
    
    player.x = touchX - player.width / 2;
    player.y = touchY - player.height / 2;
    
    keepPlayerInBounds();
    
    if (e.cancelable) e.preventDefault();
}

function update() {
    if (gameOver) return;

    // 难度随得分提升
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelElement.textContent = `等级: ${level}`;
        // 增加生成速度和星星速度 (更平滑的增量)
        difficulty.starSpawnRate = Math.min(0.06, 0.015 + (level - 1) * 0.003);
        difficulty.starSpeedMin = 0.8 + (level - 1) * 0.2;
        difficulty.starSpeedMax = 1.8 + (level - 1) * 0.2;
    }

    // 玩家移动 (增加对 W/A/S/D 键的支持)
    if (keys['ArrowLeft'] || keys['KeyA'] || keys['a'] || keys['A']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD'] || keys['d'] || keys['D']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['KeyW'] || keys['w'] || keys['W']) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] || keys['KeyS'] || keys['s'] || keys['S']) {
        player.y += player.speed;
    }
    keepPlayerInBounds();

    // 生成星星
    if (Math.random() < difficulty.starSpawnRate) {
        createStar();
    }

    // 更新背景星星
    for (const bs of bgStars) {
        bs.y += bs.speed;
        if (bs.y > canvas.height) bs.y = 0;
    }

    // 更新星星位置
    for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.y += s.speed;
        s.rotation += s.rotationSpeed;

        // 碰撞检测
        if (
            s.y + starRadius > player.y &&
            s.y - starRadius < player.y + player.height &&
            s.x + starRadius > player.x &&
            s.x - starRadius < player.x + player.width
        ) {
            createParticles(s.x, s.y, s.color);
            stars.splice(i, 1);
            score += 10;
            scoreElement.textContent = score;

            // 更新最高分
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('starGameHighScore', highScore);
                highScoreElement.textContent = `最佳: ${highScore}`;
            }
            continue;
        }

        // 漏接检测
        if (s.y > canvas.height + starRadius * 2) {
            stars.splice(i, 1);
            lives--;
            livesElement.textContent = lives;
            if (lives <= 0) {
                endGame();
            }
        }
    }

    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 画背景星星
    for (const bs of bgStars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${bs.opacity})`;
        ctx.beginPath();
        ctx.arc(bs.x, bs.y, bs.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // 画玩家
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.glowColor;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.width, player.height, player.height / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 画星星
    for (const s of stars) {
        draw3DStar(s);
    }

    // 画粒子
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

function draw3DStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    // 外发光
    ctx.shadowBlur = 15;
    ctx.shadowColor = s.glowColor;

    // 创建径向渐变，实现立体感
    const gradient = ctx.createRadialGradient(-starRadius/3, -starRadius/3, 0, 0, 0, starRadius);
    gradient.addColorStop(0, '#fff'); // 亮点
    gradient.addColorStop(0.2, '#f9d71c'); // 主色
    gradient.addColorStop(1, '#d4af37'); // 阴影边框

    ctx.fillStyle = gradient;
    
    // 绘制星形
    drawStarShape(0, 0, 5, starRadius, starRadius / 2);
    ctx.fill();

    // 添加一些高光线增加立体感
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

function drawStarShape(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

function loop() {
    update();
    draw();
    if (!gameOver) {
        animationId = requestAnimationFrame(loop);
    }
}

function endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);
    overlay.classList.remove('hidden');
    finalScoreElement.textContent = `最终得分: ${score}`;
}

function restartGame() {
    score = 0;
    level = 1;
    lives = 3;
    gameOver = false;
    stars.length = 0;
    particles.length = 0;
    
    // 重置难度
    difficulty.starSpawnRate = 0.015;
    difficulty.starSpeedMin = 0.8;
    difficulty.starSpeedMax = 1.8;

    scoreElement.textContent = score;
    levelElement.textContent = `等级: ${level}`;
    livesElement.textContent = lives;
    overlay.classList.add('hidden');
    player.x = canvas.width / 2 - player.width / 2;
    loop();
}

restartBtn.addEventListener('click', restartGame);

// 初始化背景
initBackgroundStars();
// 开始游戏
loop();
