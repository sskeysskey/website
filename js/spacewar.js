document.addEventListener('DOMContentLoaded', () => {
    const spacewarGame = document.getElementById('spacewar-game');
    const playButton = spacewarGame.querySelector('.play-button');
    let canvas, ctx, gameWidth, gameHeight;
    let player, enemies, playerBullets, enemyBullets;
    let score = 0;
    let gameInterval;
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let isGameRunning = false;
    let backgroundY = 0;
    let lastShootTime = 0;

    // 记录按键状态
    const keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        shoot: false
    };

    // 加载图片资源
    const images = {};
    const imageSources = {
        background: 'images/game/background.png',
        player: 'images/game/player.png',
        enemy: 'images/game/enemy.png',
        enemyBullet: 'images/game/enemy_bullet.png',
        playerBullet: 'images/game/player_bullet.png',
        life: 'images/game/life.png'
    };

    function loadImages(callback) {
        let loadedImages = 0;
        const totalImages = Object.keys(imageSources).length;

        for (let key in imageSources) {
            images[key] = new Image();
            images[key].onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) {
                    callback();
                }
            };
            images[key].src = imageSources[key];
        }
    }

    function initGame() {
        canvas = document.createElement('canvas');
        spacewarGame.innerHTML = '';
        spacewarGame.appendChild(canvas);
        ctx = canvas.getContext('2d');

        // 设置游戏区域大小
        gameWidth = spacewarGame.clientWidth;
        gameHeight = spacewarGame.clientHeight;

        canvas.width = gameWidth;
        canvas.height = gameHeight;

        // 设置画布样式
        canvas.style.border = '4px solid white';
        canvas.style.backgroundColor = 'black';
        canvas.style.boxSizing = 'border-box';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        // 初始化游戏对象
        player = {
            x: gameWidth / 2,
            y: gameHeight - 100,
            width: 50,
            height: 50,
            speed: 5,
            life: 10
        };

        enemies = [];
        playerBullets = [];
        enemyBullets = [];

        if (isMobile) {
            setupMobileControls();
        } else {
            setupKeyboardControls();
        }

        gameInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
        isGameRunning = true;
    }

    playButton.addEventListener('click', () => {
        if (!isGameRunning) {
            loadImages(() => {
                initGame();
                playButton.style.display = 'none';
            });
        }
    });

    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!isGameRunning) return;
            switch (e.key.toLowerCase()) {
                case 'a':
                    keys.left = true;
                    break;
                case 'd':
                    keys.right = true;
                    break;
                case 'w':
                    keys.up = true;
                    break;
                case 's':
                    keys.down = true;
                    break;
                case 'j':
                    keys.shoot = true;
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key.toLowerCase()) {
                case 'a':
                    keys.left = false;
                    break;
                case 'd':
                    keys.right = false;
                    break;
                case 'w':
                    keys.up = false;
                    break;
                case 's':
                    keys.down = false;
                    break;
                case 'j':
                    keys.shoot = false;
                    break;
            }
        });
    }

    function setupMobileControls() {
        let touchStartX, touchStartY;

        canvas.addEventListener('touchstart', (e) => {
            if (!isGameRunning) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!isGameRunning) return;
            e.preventDefault();
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            player.x += dx;
            player.y += dy;

            touchStartX = touchEndX;
            touchStartY = touchEndY;

            keepPlayerInBounds();
        });
    }

    function keepPlayerInBounds() {
        player.x = Math.max(0, Math.min(player.x, gameWidth - player.width));
        player.y = Math.max(0, Math.min(player.y, gameHeight - player.height));
    }

    function shootPlayerBullet() {
        const currentTime = Date.now();
        if (currentTime - lastShootTime > 200) { // 限制射击频率
            playerBullets.push({
                x: player.x + player.width / 2,
                y: player.y,
                width: 5,
                height: 10,
                speed: 10
            });
            lastShootTime = currentTime;
        }
    }

    function createEnemy() {
        if (Math.random() < 0.02) { // 2% 概率生成敌机
            enemies.push({
                x: Math.random() * (gameWidth - 40),
                y: -40,
                width: 40,
                height: 40,
                speed: 2
            });
        }
    }

    function moveEnemies() {
        enemies.forEach((enemy) => {
            enemy.y += enemy.speed;
            if (Math.random() < 0.005) { // 0.5% 概率发射子弹
                enemyBullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height,
                    width: 5,
                    height: 10,
                    speed: 5
                });
            }
        });
        enemies = enemies.filter(enemy => enemy.y < gameHeight);
    }

    function moveBullets() {
        playerBullets.forEach(bullet => bullet.y -= bullet.speed);
        enemyBullets.forEach(bullet => bullet.y += bullet.speed);
        playerBullets = playerBullets.filter(bullet => bullet.y > 0);
        enemyBullets = enemyBullets.filter(bullet => bullet.y < gameHeight);
    }

    function checkCollisions() {
        // 玩家子弹与敌机碰撞
        playerBullets.forEach((bullet, bIndex) => {
            enemies.forEach((enemy, eIndex) => {
                if (collision(bullet, enemy)) {
                    playerBullets.splice(bIndex, 1);
                    enemies.splice(eIndex, 1);
                    score += 100;
                }
            });
        });

        // 敌机子弹与玩家碰撞
        enemyBullets.forEach((bullet, index) => {
            if (collision(bullet, player)) {
                enemyBullets.splice(index, 1);
                player.life--;
                if (player.life <= 0) {
                    gameOver();
                }
            }
        });

        // 敌机与玩家碰撞
        enemies.forEach((enemy, index) => {
            if (collision(enemy, player)) {
                enemies.splice(index, 1);
                player.life--;
                if (player.life <= 0) {
                    gameOver();
                }
            }
        });
    }

    function collision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    function gameOver() {
        clearInterval(gameInterval);
        isGameRunning = false;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', gameWidth / 2, gameHeight / 2 - 40);

        ctx.font = '30px Arial';
        ctx.fillText('得分: ' + score, gameWidth / 2, gameHeight / 2 + 20);

        ctx.font = '20px Arial';
        ctx.fillText('点击刷新页面重新开始', gameWidth / 2, gameHeight / 2 + 60);
    }

    function drawBackground() {
        ctx.drawImage(images.background, 0, backgroundY, gameWidth, gameHeight);
        ctx.drawImage(images.background, 0, backgroundY - gameHeight, gameWidth, gameHeight);
        backgroundY += 2;
        if (backgroundY >= gameHeight) {
            backgroundY = 0;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, gameWidth, gameHeight);

        drawBackground();

        // 绘制玩家
        ctx.drawImage(images.player, player.x, player.y, player.width, player.height);

        // 绘制敌机
        enemies.forEach(enemy => {
            ctx.drawImage(images.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
        });

        // 绘制子弹
        ctx.fillStyle = 'yellow';
        playerBullets.forEach(bullet => {
            ctx.drawImage(images.playerBullet, bullet.x, bullet.y, bullet.width, bullet.height);
        });

        ctx.fillStyle = 'red';
        enemyBullets.forEach(bullet => {
            ctx.drawImage(images.enemyBullet, bullet.x, bullet.y, bullet.width, bullet.height);
        });

        // 绘制生命值
        for (let i = 0; i < player.life; i++) {
            ctx.drawImage(images.life, 10 + i * 15, 10, 10, 10);
        }

        // 绘制分数
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('得分: ' + score, 10, 40);
    }

    function updatePlayerPosition() {
        if (keys.left) player.x -= player.speed;
        if (keys.right) player.x += player.speed;
        if (keys.up) player.y -= player.speed;
        if (keys.down) player.y += player.speed;
        if (keys.shoot) shootPlayerBullet();

        keepPlayerInBounds();
    }

    function gameLoop() {
        if (!isGameRunning) return;

        createEnemy();
        moveEnemies();
        moveBullets();
        checkCollisions();

        updatePlayerPosition();

        if (isMobile) {
            shootPlayerBullet(); // 移动设备上自动射击
        }

        draw();
    }
});