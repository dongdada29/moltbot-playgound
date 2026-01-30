// 俄罗斯方块游戏
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const BLOCK_SIZE = 30;
const COLS = 10;
const ROWS = 20;

// 方块形状定义
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]], // J
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]]  // Z
];

const COLORS = [
    '#00f0f0', // I - 青色
    '#f0f000', // O - 黄色
    '#a000f0', // T - 紫色
    '#f0a000', // L - 橙色
    '#0000f0', // J - 蓝色
    '#00f000', // S - 绿色
    '#f00000'  // Z - 红色
];

// 游戏状态
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let dropInterval = 1000;
let lastDrop = 0;

// 初始化游戏板
function initBoard() {
    board = [];
    for (let i = 0; i < ROWS; i++) {
        board[i] = [];
        for (let j = 0; j < COLS; j++) {
            board[i][j] = 0;
        }
    }
}

// 创建方块
function createPiece(shapeIndex) {
    const shape = SHAPES[shapeIndex];
    return {
        shape: shape.map(row => [...row]),
        color: COLORS[shapeIndex],
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

// 随机方块
function randomPiece() {
    return createPiece(Math.floor(Math.random() * SHAPES.length));
}

// 绘制方块
function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.fillRect(x * size + 1, y * size + 1, 4, size - 2);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size + size - 5, y * size + 1, 4, size - 2);
    ctx.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制已固定的方块
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
    
    // 绘制当前方块
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                }
            }
        }
    }
    
    // 绘制下一个方块
    nextCtx.fillStyle = '#0d0d0d';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, nextPiece.color, 25);
                }
            }
        }
    }
}

// 检查碰撞
function collision(offsetX, offsetY, newShape = null) {
    const shape = newShape || currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 固定方块
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    // 检查消除行
    clearLines();
    
    // 生成新方块
    currentPiece = nextPiece;
    nextPiece = randomPiece();
    
    // 检查游戏结束
    if (collision(0, 0)) {
        endGame();
    }
}

// 消除行
function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    
    if (linesCleared > 0) {
        // 计分：1行100, 2行300, 3行500, 4行800
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;
        
        // 每消除10行升一级
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateDisplay();
    }
}

// 更新显示
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// 移动方块
function move(dirX, dirY) {
    if (!gameRunning || gamePaused || gameOver) return;
    
    if (!collision(dirX, dirY)) {
        currentPiece.x += dirX;
        currentPiece.y += dirY;
        return true;
    }
    return false;
}

// 旋转方块
function rotate() {
    if (!gameRunning || gamePaused || gameOver) return;
    
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    
    if (!collision(0, 0, rotated)) {
        currentPiece.shape = rotated;
    } else if (!collision(-1, 0, rotated)) {
        currentPiece.x -= 1;
        currentPiece.shape = rotated;
    } else if (!collision(1, 0, rotated)) {
        currentPiece.x += 1;
        currentPiece.shape = rotated;
    }
}

// 硬降（直接落到底）
function hardDrop() {
    if (!gameRunning || gamePaused || gameOver) return;
    
    while (!collision(0, 1)) {
        currentPiece.y++;
    }
    lockPiece();
}

// 游戏循环
function gameLoop(timestamp) {
    if (!gameRunning || gamePaused || gameOver) return;
    
    if (timestamp - lastDrop > dropInterval) {
        if (!collision(0, 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
        }
        lastDrop = timestamp;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// 开始游戏
function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;
    gameOver = false;
    
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    
    updateDisplay();
    document.getElementById('gameOver').classList.remove('show');
    document.getElementById('pauseModal').classList.remove('show');
    document.getElementById('startBtn').textContent = '重新开始';
    
    lastDrop = performance.now();
    requestAnimationFrame(gameLoop);
}

// 结束游戏
function endGame() {
    gameOver = true;
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.add('show');
}

// 切换暂停
function togglePause() {
    if (!gameRunning || gameOver) return;
    
    gamePaused = !gamePaused;
    document.getElementById('pauseModal').classList.toggle('show', gamePaused);
    
    if (!gamePaused) {
        lastDrop = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            move(-1, 0);
            break;
        case 'ArrowRight':
            move(1, 0);
            break;
        case 'ArrowDown':
            move(0, 1);
            break;
        case 'ArrowUp':
            rotate();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    draw();
});

// 开始按钮
document.getElementById('startBtn').addEventListener('click', startGame);

// 初始绘制
initBoard();
draw();
