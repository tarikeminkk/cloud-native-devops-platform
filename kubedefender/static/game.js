const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const keys = {};
const mouse = { x: canvas.width / 2, y: 0 };

let score = 0;
let health = 100;
let gameRunning = true;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 4
};

const bullets = [];
const enemies = [];

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();

    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", e => {
    if (e.button !== 0 || !gameRunning) return;

    const angle = Math.atan2(
        mouse.y - player.y,
        mouse.x - player.x
    );

    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8,
        radius: 5
    });
});

function spawnEnemy() {
    if (!gameRunning) return;

    let x;
    let y;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -30;
    } else if (side === 1) {
        x = canvas.width + 30;
        y = Math.random() * canvas.height;
    } else if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 30;
    } else {
        x = -30;
        y = Math.random() * canvas.height;
    }

    enemies.push({
        x,
        y,
        radius: 20,
        speed: 1.2 + Math.random()
    });
}

setInterval(spawnEnemy, 900);

function updatePlayer() {
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;

    player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x)
    );

    player.y = Math.max(
        player.radius,
        Math.min(canvas.height - player.radius, player.y)
    );
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        b.x += b.dx;
        b.y += b.dy;

        if (
            b.x < 0 ||
            b.x > canvas.width ||
            b.y < 0 ||
            b.y > canvas.height
        ) {
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        const angle = Math.atan2(
            player.y - enemy.y,
            player.x - enemy.x
        );

        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        const playerDistance = Math.hypot(
            player.x - enemy.x,
            player.y - enemy.y
        );

        if (playerDistance < player.radius + enemy.radius) {
            enemies.splice(i, 1);

            health -= 10;
            document.getElementById("health").textContent = health;

            if (health <= 0) {
                endGame();
            }

            continue;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];

            const distance = Math.hypot(
                bullet.x - enemy.x,
                bullet.y - enemy.y
            );

            if (distance < bullet.radius + enemy.radius) {
                enemies.splice(i, 1);
                bullets.splice(j, 1);

                score += 10;
                document.getElementById("score").textContent = score;

                break;
            }
        }
    }
}

function drawGrid() {
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawPlayer() {
    ctx.fillStyle = "#38bdf8";

    ctx.beginPath();
    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    const angle = Math.atan2(
        mouse.y - player.y,
        mouse.x - player.x
    );

    ctx.strokeStyle = "#e8f0ff";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(angle) * 30,
        player.y + Math.sin(angle) * 30
    );
    ctx.stroke();
}

function drawBullets() {
    ctx.fillStyle = "#f8fafc";

    for (const bullet of bullets) {
        ctx.beginPath();
        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function drawEnemies() {
    ctx.fillStyle = "#ef4444";

    for (const enemy of enemies) {
        ctx.beginPath();
        ctx.arc(
            enemy.x,
            enemy.y,
            enemy.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function endGame() {
    gameRunning = false;

    document.getElementById("finalScore").textContent = score;
    document.getElementById("gameOver").classList.remove("hidden");
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayer();
    updateBullets();
    updateEnemies();

    drawGrid();
    drawPlayer();
    drawBullets();
    drawEnemies();

    requestAnimationFrame(gameLoop);
}

gameLoop();
