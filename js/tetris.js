document.addEventListener('DOMContentLoaded', () => {
    const tetrisGame = document.getElementById('tetris-game');
    const playButton = tetrisGame.querySelector('.play-button');
    let canvas, ctx, blockSize, width, height;
    let board, currentPiece, nextPiece, ghostPiece;
    let score = 0;
    let gameInterval;
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let isGameRunning = false;
    let isFullscreen = false;

    // 新增：特效状态管理
    let effects = {
        flash: {
            active: false,
            type: 'none', // 'single', 'double', 'triple', 'quad'
            opacity: 0,
            duration: 0,
            maxOpacity: 0
        },
        combo: {
            active: false,
            text: '',
            opacity: 0,
            duration: 0,
            maxOpacity: 0
        },
        consecutiveQuads: 0 // 连续消除四行的计数
    };

    function initGame() {
        canvas = document.createElement('canvas');
        tetrisGame.innerHTML = '';
        tetrisGame.appendChild(canvas);
        ctx = canvas.getContext('2d');

        // 设置理想的宽高比（例如 2:3）
        const idealRatio = 2 / 3;

        // 获取可用空间
        const availableWidth = tetrisGame.clientWidth;
        const availableHeight = tetrisGame.clientHeight;

        // 计算游戏区域的大小
        let gameWidth, gameHeight;
        if (availableWidth / availableHeight > idealRatio) {
            // 如果可用空间太宽，以高度为基准
            gameHeight = availableHeight;
            gameWidth = gameHeight * idealRatio;
        } else {
            // 如果可用空间太高，以宽度为基准
            gameWidth = availableWidth;
            gameHeight = gameWidth / idealRatio;
        }

        // 设置画布大小
        canvas.width = gameWidth;
        canvas.height = gameHeight;

        // 设置画布样式
        canvas.style.border = '4px solid white';
        canvas.style.backgroundColor = 'black';
        canvas.style.boxSizing = 'border-box';

        // 调整方块大小和游戏网格
        blockSize = Math.floor(gameWidth / 10); // 现在我们固定宽度为10个方块
        width = 10;
        height = Math.floor(gameHeight / blockSize);

        // 居中画布
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        board = Array(height).fill().map(() => Array(width).fill(0));
        currentPiece = getRandomPiece();
        nextPiece = getRandomPiece();
        updateGhostPiece();

        if (isMobile) {
            setupMobileControls();
        } else {
            setupKeyboardControls();
        }

        gameInterval = setInterval(gameLoop, 1000);
        isGameRunning = true;
        draw();
    }

    playButton.addEventListener('click', () => {
        if (!isGameRunning) {
            initGame();
            playButton.style.display = 'none';
        }
    });

    function getRandomPiece() {
        const pieces = [
            { shape: [[1, 1, 1, 1]], color: '#00F0F0' },
            { shape: [[1, 1], [1, 1]], color: '#F0F000' },
            { shape: [[1, 1, 1], [0, 1, 0]], color: '#800080' },
            { shape: [[1, 1, 1], [1, 0, 0]], color: '#F0A000' },
            { shape: [[1, 1, 1], [0, 0, 1]], color: '#0000F0' },
            { shape: [[1, 1, 0], [0, 1, 1]], color: '#00F000' },
            { shape: [[0, 1, 1], [1, 1, 0]], color: '#F00000' }
        ];
        const piece = pieces[Math.floor(Math.random() * pieces.length)];
        piece.x = Math.floor(width / 2) - Math.floor(piece.shape[0].length / 2);
        piece.y = 0;
        return piece;
    }

    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!isGameRunning) return;
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                    movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                    movePiece(1, 0);
                    break;
                case 'ArrowDown':
                case 's':
                    movePiece(0, 1);
                    break;
                case 'ArrowUp':
                case 'w':
                case 'k':
                    rotatePiece();
                    break;
                case ' ':
                    dropPiece();
                    break;
            }
        });
    }

    function setupMobileControls() {
        let touchStartX, touchStartY;
        let lastMoveTime = 0;
        const moveThreshold = 15;
        const moveInterval = 40;
        const dropThreshold = 5; // 新增：下落阈值，设置得更小以增加敏感度
        let hasMoved = false;
        let hasDropped = false; // 新增：用于跟踪是否已经触发了下落

        canvas.addEventListener('touchstart', (e) => {
            if (!isGameRunning) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasMoved = false;
            hasDropped = false; // 重置下落状态
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!isGameRunning) return;
            e.preventDefault();
            const currentTime = Date.now();
            if (currentTime - lastMoveTime < moveInterval) return;

            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            // 判断移动方向
            if (Math.abs(dy) > Math.abs(dx)) {
                // 垂直移动优先
                if (dy > dropThreshold && !hasDropped) {
                    movePiece(0, 1);
                    touchStartY = touchEndY;
                    lastMoveTime = currentTime;
                    hasMoved = true;
                    hasDropped = true;
                }
            } else {
                // 水平移动
                if (Math.abs(dx) > moveThreshold) {
                    if (dx > 0) {
                        movePiece(1, 0);
                    } else {
                        movePiece(-1, 0);
                    }
                    touchStartX = touchEndX;
                    lastMoveTime = currentTime;
                    hasMoved = true;
                }
            }
        });

        canvas.addEventListener('touchend', (e) => {
            if (!isGameRunning) return;
            const touchEndY = e.changedTouches[0].clientY;
            const dy = touchEndY - touchStartY;

            if (dy > dropThreshold * 3) { // 仍然保留快速下落的功能
                dropPiece();
            } else if (!hasMoved) {
                rotatePiece();
            }

            // 重置标志
            hasMoved = false;
            hasDropped = false;
        });
    }

    function updateGhostPiece() {
        ghostPiece = { ...currentPiece, y: currentPiece.y };
        while (!checkCollision(ghostPiece)) {
            ghostPiece.y++;
        }
        ghostPiece.y--;
    }

    function movePiece(dx, dy) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        if (checkCollision(currentPiece)) {
            currentPiece.x -= dx;
            currentPiece.y -= dy;
            if (dy > 0) {
                mergePiece();
                const cleared = clearLines();
                handleEffects(cleared);
                currentPiece = nextPiece;
                nextPiece = getRandomPiece();
                updateGhostPiece();
                if (checkCollision(currentPiece)) {
                    gameOver();
                }
            }
        } else {
            updateGhostPiece();
        }
        draw();
    }

    function rotatePiece() {
        const rotated = currentPiece.shape[0].map((_, i) =>
            currentPiece.shape.map(row => row[i]).reverse()
        );
        const previousShape = currentPiece.shape;
        const previousX = currentPiece.x;

        currentPiece.shape = rotated;

        // 尝试墙踢
        const kicks = [0, -1, 1, -2, 2]; // 尝试的顺序：原位置，左1，右1，左2，右2
        let kicked = false;

        for (let kick of kicks) {
            currentPiece.x = previousX + kick;
            if (!checkCollision(currentPiece)) {
                kicked = true;
                break;
            }
        }

        if (!kicked) {
            // 如果所有踢墙尝试都失败，恢复原始状态
            currentPiece.shape = previousShape;
            currentPiece.x = previousX;
        } else {
            updateGhostPiece();
        }

        draw();
    }

    function dropPiece() {
        while (!checkCollision({ ...currentPiece, y: currentPiece.y + 1 })) {
            currentPiece.y++;
        }
        mergePiece();
        const cleared = clearLines();
        handleEffects(cleared);
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        updateGhostPiece();
        if (checkCollision(currentPiece)) {
            gameOver();
        }
        draw();
    }

    function checkCollision(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] &&
                    (piece.y + y >= height ||
                        piece.x + x < 0 ||
                        piece.x + x >= width ||
                        board[piece.y + y][piece.x + x])) {
                    return true;
                }
            }
        }
        return false;
    }

    function collision() {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x] &&
                    (currentPiece.y + y >= height ||
                        currentPiece.x + x < 0 ||
                        currentPiece.x + x >= width ||
                        board[currentPiece.y + y][currentPiece.x + x])) {
                    return true;
                }
            }
        }
        return false;
    }

    function mergePiece() {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    board[y + currentPiece.y][x + currentPiece.x] = currentPiece.color;
                }
            }
        }
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = height - 1; y >= 0; y--) {
            if (board[y].every(cell => cell)) {
                board.splice(y, 1);
                board.unshift(Array(width).fill(0));
                linesCleared++;
                y++; // 重复检查当前行，因为新的行被插入后需要重新检查
            }
        }
        if (linesCleared > 0) {
            score += linesCleared * 100;
        }
        return linesCleared;
    }

    function handleEffects(cleared) {
        if (cleared > 0) {
            // 设置闪光特效
            switch (cleared) {
                case 1:
                    effects.flash.type = 'single';
                    effects.flash.maxOpacity = 0.2;
                    effects.flash.duration = 300;
                    break;
                case 2:
                    effects.flash.type = 'double';
                    effects.flash.maxOpacity = 0.4;
                    effects.flash.duration = 400;
                    break;
                case 3:
                    effects.flash.type = 'triple';
                    effects.flash.maxOpacity = 0.6;
                    effects.flash.duration = 500;
                    break;
                case 4:
                    effects.flash.type = 'quad';
                    effects.flash.maxOpacity = 0.8;
                    effects.flash.duration = 600;
                    break;
                default:
                    effects.flash.type = 'none';
            }
            effects.flash.opactiy = effects.flash.maxOpacity;
            effects.flash.active = true;
            effects.flash.startTime = Date.now();

            // 处理连击逻辑
            if (cleared === 4) {
                effects.consecutiveQuads++;
                if (effects.consecutiveQuads >= 2) {
                    // 显示连击特效
                    effects.combo.active = true;
                    effects.combo.text = '连击！两个四行消除！';
                    effects.combo.opacity = 1;
                    effects.combo.duration = 1000;
                }
            } else {
                effects.consecutiveQuads = 0;
            }
        } else {
            // 没有消除行，重置连续四行计数
            effects.consecutiveQuads = 0;
        }
    }

    function gameOver() {
        clearInterval(gameInterval);
        isGameRunning = false;

        // 调用 draw() 以更新画面并显示游戏结束的文字
        draw();

        // 在画布上绘制半透明的黑色遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 设置文本样式
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 绘制"游戏结束"文字
        ctx.font = 'bold 40px Arial';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 40);

        // 绘制得分
        ctx.font = '30px Arial';
        ctx.fillText('得分: ' + score, canvas.width / 2, canvas.height / 2 + 20);

        // 绘制提示
        ctx.font = 'bold 20px Arial';
        ctx.fillText('点击刷新页面重新开始', canvas.width / 2, canvas.height / 2 + 60);
    }

    function draw() {
        // 如果游戏已经结束，只绘制游戏结束画面，不再更新其他内容
        if (!isGameRunning) {
            // 这里可以只绘制游戏结束的内容，防止其他元素覆盖
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 40px Arial';
            ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 40);

            ctx.font = '30px Arial';
            ctx.fillText('得分: ' + score, canvas.width / 2, canvas.height / 2 + 20);
            return;
        }

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制黑色背景
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制深色游戏网格
        ctx.strokeStyle = '#333';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }
        }

        // 绘制游戏板
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (board[y][x]) {
                    drawBlock(x, y, board[y][x]);
                }
            }
        }

        // 绘制幽灵方块
        drawPiece(ghostPiece, true);

        // 绘制当前方块
        drawPiece(currentPiece, false);

        // 绘制分数（使用白色文字）
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('得分: ' + score, 10, 30);

        // 绘制特效
        drawEffects();
    }

    function drawEffects() {
        // 绘制闪光特效
        if (effects.flash.active) {
            const elapsed = Date.now() - effects.flash.startTime;
            if (elapsed < effects.flash.duration) {
                // 计算当前透明度
                const progress = elapsed / effects.flash.duration;
                ctx.fillStyle = `rgba(255, 255, 255, ${effects.flash.maxOpacity * (1 - progress)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                effects.flash.active = false;
            }
        }

        // 绘制连击特效
        if (effects.combo.active) {
            const elapsed = Date.now() - (effects.flash.startTime || 0);
            if (elapsed < effects.combo.duration) {
                ctx.fillStyle = `rgba(255, 0, 0, ${effects.combo.opacity * (1 - elapsed / effects.combo.duration)})`;
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(effects.combo.text, canvas.width / 2, canvas.height / 2);
            } else {
                effects.combo.active = false;
            }
        }
    }

    function drawPiece(piece, isGhost) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    drawBlock(x + piece.x, y + piece.y, piece.color, isGhost);
                }
            }
        }
    }

    function drawBlock(x, y, color, isGhost = false) {
        ctx.fillStyle = isGhost ? 'rgba(255, 255, 255, 0.2)' : color;
        ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
        if (!isGhost) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.strokeRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
        }
    }

    function gameLoop() {
        movePiece(0, 1);
    }
});