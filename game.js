// --- 1. 核心配置与状态 (放在最前面，确保不出现 undefined) ---
const modeConfigs = {
    star: {
        itemColor: '#f9d71c',
        glowColor: 'rgba(249, 215, 28, 0.4)',
        particleColor: '#f9d71c',
        label: '⭐'
    },
    flower: {
        itemColor: '#ff85a2',
        glowColor: 'rgba(255, 133, 162, 0.4)',
        particleColor: '#ff85a2',
        label: '🌸'
    },
    fruit: {
        itemColor: '#ff4d4d',
        glowColor: 'rgba(255, 77, 77, 0.4)',
        particleColor: '#ff4d4d',
        label: '🍎'
    }
};

let currentGameMode = 'star';
let gameOver = true; 
let score = 0;
let level = 1;
let lives = 3;
let animationId = null;

// --- 2. 元素获取与 Supabase 初始化 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const modeOverlay = document.getElementById('mode-overlay');
const modeButtons = document.querySelectorAll('.mode-btn');
const scoreListElement = document.getElementById('score-list');
const leaderboardModal = document.getElementById('leaderboard-modal');
const mainScoreListElement = document.getElementById('main-score-list');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');

// Supabase 初始化昵称系统相关
const nameModal = document.getElementById('name-modal');
const nicknameInput = document.getElementById('nickname-input');
const saveNameBtn = document.getElementById('save-name-btn');
const editNameBtn = document.getElementById('edit-name-btn');
const playerNameDisplay = document.getElementById('player-name-display');
const userInfoArea = document.getElementById('user-info');

// Supabase 初始化 (使用更安全的变量名避免冲突)
const SUPABASE_URL = 'https://sorpglfmkavzbhnnfvzm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5KKVuBr3V0OV6DT8fqex'; 
let supabaseClient = null;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase Client initialized.");
    }
} catch (e) {
    console.warn("Supabase initialization error:", e);
}

// --- 3. 数据初始化 ---
let highScore = localStorage.getItem('starGameHighScore') || 0;
let leaderboardData = { star: [], flower: [], fruit: [] };
try {
    const savedData = localStorage.getItem('starGameLeaderboardV2');
    if (savedData) leaderboardData = JSON.parse(savedData);
} catch (e) {}

let playerName = localStorage.getItem('starGamePlayerName') || '';
let currentTab = 'star'; 
highScoreElement.textContent = `最佳: ${highScore}`;

// --- 4. 难度与游戏容器 ---
const difficulty = {
    starSpawnRate: 0.015,
    starSpeedMin: 0.8,
    starSpeedMax: 1.8
};

const stars = [];
const particles = [];
const bgStars = [];
const starRadius = 12;

// --- 5. 玩家与工具函数 ---
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

function keepPlayerInBounds() {
    if (!player) return;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}

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

function resize() {
    const displayWidth = canvas.clientWidth || 600;
    const displayHeight = canvas.clientHeight || 400;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
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

    keepPlayerInBounds();
    initBackgroundStars();
}

window.addEventListener('resize', resize);
player.x = canvas.width / 2 - player.width / 2;
player.y = canvas.height - 40;
resize();

// --- 6. 核心逻辑函数 ---

function createStar() {
    try {
        const x = Math.random() * (canvas.width - starRadius * 2) + starRadius;
        const speed = difficulty.starSpeedMin + Math.random() * (difficulty.starSpeedMax - difficulty.starSpeedMin);
        
        // 容错处理：确保 config 永远存在
        const config = modeConfigs[currentGameMode] || modeConfigs.star;
        
        stars.push({
            x: x,
            y: -starRadius * 2,
            speed: speed,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: config.itemColor || '#f9d71c',
            glowColor: config.glowColor || 'rgba(249, 215, 28, 0.4)',
            label: config.label || '⭐'
        });
    } catch (e) {
        console.error("createStar Error:", e);
    }
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

    if (currentGameMode === 'star') {
        // 经典星形绘制
        const gradient = ctx.createRadialGradient(-starRadius/3, -starRadius/3, 0, 0, 0, starRadius);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.2, s.color);
        gradient.addColorStop(1, '#d4af37');

        ctx.fillStyle = gradient;
        drawStarShape(0, 0, 5, starRadius, starRadius / 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else {
        // 鲜花和水果使用 Emoji 渲染
        ctx.font = `${starRadius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.label, 0, 0);
    }

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
    
    saveScore(score, currentGameMode);
    updateLeaderboardUI(scoreListElement, currentGameMode);
}

async function saveScore(newScore, mode) {
    if (newScore <= 0) return;
    
    // 1. 本地备份存储 (保持旧逻辑作为兜底)
    const entry = {
        score: newScore,
        mode: mode,
        date: new Date().toLocaleDateString()
    };
    if (!leaderboardData[mode]) leaderboardData[mode] = [];
    leaderboardData[mode].push(entry);
    leaderboardData[mode].sort((a, b) => b.score - a.score);
    leaderboardData[mode] = leaderboardData[mode].slice(0, 10);
    localStorage.setItem('starGameLeaderboardV2', JSON.stringify(leaderboardData));

    // 2. 云端 Supabase 存储
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('leaderboard')
                .insert([{ 
                    score: newScore, 
                    mode: mode,
                    name: playerName || '匿名玩家'
                }]);
            if (error) console.error('Supabase save error:', error);
        } catch (e) {
            console.error('Cloud save failed:', e);
        }
    }
}

async function updateLeaderboardUI(targetList, mode) {
    if (!targetList) return;
    targetList.innerHTML = '<li class="score-item" style="justify-content:center; opacity:0.5;">同步中...</li>';
    
    let displayData = [];

    // 1. 尝试从云端获取最新全球排行榜
    if (supabaseClient) {
        try {
            // 设置一个 3 秒超时，防止服务器不可用时卡死
            const fetchPromise = supabaseClient
                .from('leaderboard')
                .select('*')
                .eq('mode', mode)
                .order('score', { ascending: false })
                .limit(10);
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 3000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!error && data) {
                displayData = data;
            } else {
                console.error('Supabase fetch error:', error);
                displayData = leaderboardData[mode] || [];
            }
        } catch (e) {
            console.error('Cloud fetch failed, switching to local:', e);
            displayData = leaderboardData[mode] || [];
        }
    } else {
        displayData = leaderboardData[mode] || [];
    }

    // 2. 渲染 UI
    targetList.innerHTML = '';
    if (displayData.length === 0) {
        targetList.innerHTML = '<li class="score-item" style="justify-content:center; opacity:0.5;">暂无记录</li>';
    } else {
        displayData.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'score-item';
            const modeLabel = modeConfigs[entry.mode].label;
            li.innerHTML = `
                <span class="score-rank">#${index + 1}</span>
                <span class="score-name" style="flex:1; margin-left:10px; font-size:14px; opacity:0.8;">${entry.name || '匿名'}</span>
                <span class="score-mode">${modeLabel}</span>
                <span class="score-val" style="margin-left:10px;">${entry.score}</span>
            `;
            targetList.appendChild(li);
        });
    }
}

// 昵称系统逻辑
function updateNameDisplay() {
    if (playerName) {
        playerNameDisplay.textContent = `玩家昵称: ${playerName}`;
    } else {
        playerNameDisplay.textContent = `玩家昵称: 未设置`;
    }
}

function showNameModal() {
    if (nicknameInput) nicknameInput.value = playerName;
    if (nameModal) nameModal.classList.remove('hidden');
}

if (saveNameBtn) {
    saveNameBtn.addEventListener('click', () => {
        const newName = nicknameInput.value.trim();
        if (newName) {
            playerName = newName;
            localStorage.setItem('starGamePlayerName', playerName);
            updateNameDisplay();
            if (nameModal) nameModal.classList.add('hidden');
        } else {
            alert('请输入一个有效的昵称哦！');
        }
    });
}

if (editNameBtn) {
    editNameBtn.addEventListener('click', showNameModal);
}

// 修复手机端点击昵称区域也能触发修改
if (userInfoArea) {
    userInfoArea.addEventListener('click', (e) => {
        // 如果点的是按钮本身，就不重复触发了
        if (e.target !== editNameBtn) {
            showNameModal();
        }
    });
}

// 初始化时检查是否设置了名字
if (!playerName) {
    setTimeout(showNameModal, 500);
}
updateNameDisplay();

// 主页排行榜交互
viewLeaderboardBtn.addEventListener('click', () => {
    currentTab = currentGameMode; // 默认打开当前模式的榜单
    updateTabUI();
    leaderboardModal.classList.remove('hidden');
});

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        updateTabUI();
    });
});

function updateTabUI() {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
    updateLeaderboardUI(mainScoreListElement, currentTab);
}

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
});

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
    modeOverlay.classList.add('hidden'); // 同时也隐藏模式选择
    player.x = canvas.width / 2 - player.width / 2;
    loop();
}

// 模式选择按钮逻辑
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentGameMode = btn.dataset.mode;
        restartGame();
    });
});

restartBtn.addEventListener('click', () => {
    // 重新开始时回到模式选择界面，或者直接重新开始当前模式
    // 这里我们选择直接重新开始当前模式
    restartGame();
});

// 返回主页按钮逻辑
if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        gameOver = true;
        cancelAnimationFrame(animationId);
        overlay.classList.add('hidden');
        modeOverlay.classList.remove('hidden');
        // 确保分数和 UI 重置，为下一次开始做准备
        score = 0;
        lives = 3;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
    });
}

// 初始化背景与首帧渲染
try {
    initBackgroundStars();
    draw(); 
    console.log("Initial background stars and frame drawn.");
} catch (e) {
    console.error("Initialization error (background/draw):", e);
}
