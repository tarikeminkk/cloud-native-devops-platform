const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const UI = {
    healthText: document.getElementById("healthText"),
    healthBar: document.getElementById("healthBar"),
    score: document.getElementById("score"),
    kills: document.getElementById("kills"),
    combo: document.getElementById("combo"),
    ammo: document.getElementById("ammo"),
    reloadStatus: document.getElementById("reloadStatus"),
    wave: document.getElementById("wave"),
    startScreen: document.getElementById("startScreen"),
    startButton: document.getElementById("startButton"),
    gameOver: document.getElementById("gameOver"),
    restartButton: document.getElementById("restartButton"),
    finalScore: document.getElementById("finalScore"),
    damageOverlay: document.getElementById("damageOverlay"),
    statusText: document.getElementById("statusText"),
    waveAnnouncement: document.getElementById("waveAnnouncement"),
    waveAnnouncementText: document.getElementById("waveAnnouncementText")
};

const keys = {};
const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    down: false
};

let running = false;
let score = 0;
let kills = 0;
let combo = 1;
let comboTimer = 0;
let wave = 0;
let enemiesRemaining = 0;
let enemiesToSpawn = 0;
let lastSpawn = 0;
let spawnDelay = 700;
let lastTime = 0;

let shake = 0;
let muzzleFlash = 0;

const bullets = [];
const enemies = [];
const particles = [];
const tracers = [];
const decorations = [];

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,

    health: 100,
    maxHealth: 100,

    speed: 260,

    ammo: 30,
    maxAmmo: 30,

    reloading: false,
    reloadTime: 1200,
    reloadStarted: 0,

    fireRate: 105,
    lastShot: 0,

    angle: 0
};

function resizeMouse(event) {
    const rect = canvas.getBoundingClientRect();

    mouse.x =
        (event.clientX - rect.left) *
        (canvas.width / rect.width);

    mouse.y =
        (event.clientY - rect.top) *
        (canvas.height / rect.height);
}

document.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;

    if (event.key.toLowerCase() === "r") {
        startReload();
    }
});

document.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", resizeMouse);

canvas.addEventListener("mousedown", event => {
    if (event.button === 0) {
        mouse.down = true;
    }
});

window.addEventListener("mouseup", event => {
    if (event.button === 0) {
        mouse.down = false;
    }
});

canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
});

UI.startButton.addEventListener("click", startGame);
UI.restartButton.addEventListener("click", startGame);

function startGame() {
    bullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    tracers.length = 0;

    score = 0;
    kills = 0;
    combo = 1;
    comboTimer = 0;
    wave = 0;

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.reloading = false;
    player.lastShot = 0;

    mouse.down = false;

    shake = 0;
    muzzleFlash = 0;

    running = true;

    UI.startScreen.classList.add("hidden");
    UI.gameOver.classList.add("hidden");

    updateHUD();
    beginNextWave();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function beginNextWave() {
    wave++;

    const bossWave = wave % 5 === 0;

    enemiesToSpawn = bossWave
        ? 1
        : 5 + wave * 3;

    enemiesRemaining = enemiesToSpawn;

    spawnDelay = Math.max(
        240,
        760 - wave * 35
    );

    UI.wave.textContent =
        String(wave).padStart(2, "0");

    UI.waveAnnouncementText.textContent =
        bossWave
            ? "BOSS WAVE"
            : `WAVE ${String(wave).padStart(2, "0")}`;

    UI.waveAnnouncement.classList.remove("hidden");

    setTimeout(() => {
        UI.waveAnnouncement.classList.add("hidden");
    }, 1400);

    UI.statusText.textContent =
        bossWave
            ? "WARNING // HEAVY UNIT"
            : "HOSTILES DETECTED";

    lastSpawn = performance.now() - spawnDelay;
}

function spawnEnemy() {
    if (enemiesToSpawn <= 0) return;

    let x;
    let y;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -60;
    }

    if (side === 1) {
        x = canvas.width + 60;
        y = Math.random() * canvas.height;
    }

    if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 60;
    }

    if (side === 3) {
        x = -60;
        y = Math.random() * canvas.height;
    }

    let type;

    if (wave % 5 === 0) {
        type = "boss";
    } else {
        const roll = Math.random();

        if (roll < 0.48) {
            type = "runner";
        } else if (roll < 0.82) {
            type = "soldier";
        } else {
            type = "tank";
        }
    }

    const configs = {
        runner: {
            radius: 15,
            speed: 125 + wave * 4,
            hp: 25 + wave * 2,
            damage: 8,
            color: "#ff4567",
            score: 100
        },

        soldier: {
            radius: 21,
            speed: 82 + wave * 3,
            hp: 60 + wave * 4,
            damage: 14,
            color: "#ff9f43",
            score: 180
        },

        tank: {
            radius: 29,
            speed: 48 + wave * 2,
            hp: 140 + wave * 8,
            damage: 24,
            color: "#b967ff",
            score: 300
        },

        boss: {
            radius: 55,
            speed: 42 + wave,
            hp: 900 + wave * 80,
            damage: 35,
            color: "#ff214f",
            score: 2500
        }
    };

    const config = configs[type];

    enemies.push({
        x,
        y,
        type,

        radius: config.radius,
        speed: config.speed,

        hp: config.hp,
        maxHp: config.hp,

        damage: config.damage,
        color: config.color,
        value: config.score,

        hitFlash: 0,
        attackCooldown: 0,

        angle: 0
    });

    enemiesToSpawn--;
}

function startReload() {
    if (
        !running ||
        player.reloading ||
        player.ammo === player.maxAmmo
    ) {
        return;
    }

    player.reloading = true;
    player.reloadStarted = performance.now();

    UI.reloadStatus.textContent = "RELOADING...";
    UI.statusText.textContent = "MAGAZINE CHANGE";
}

function finishReload() {
    player.ammo = player.maxAmmo;
    player.reloading = false;

    UI.reloadStatus.textContent = "READY";
    UI.statusText.textContent = "WEAPON READY";

    updateHUD();
}

function shoot(now) {
    if (
        !running ||
        player.reloading ||
        !mouse.down
    ) {
        return;
    }

    if (player.ammo <= 0) {
        startReload();
        return;
    }

    if (now - player.lastShot < player.fireRate) {
        return;
    }

    player.lastShot = now;
    player.ammo--;

    const spread =
        (Math.random() - 0.5) * 0.045;

    const angle =
        player.angle + spread;

    const barrelX =
        player.x + Math.cos(angle) * 37;

    const barrelY =
        player.y + Math.sin(angle) * 37;

    const velocity = 900;

    bullets.push({
        x: barrelX,
        y: barrelY,

        oldX: barrelX,
        oldY: barrelY,

        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,

        radius: 3,
        damage: 25,
        life: 1.2
    });

    tracers.push({
        x1: barrelX,
        y1: barrelY,

        x2: barrelX + Math.cos(angle) * 45,
        y2: barrelY + Math.sin(angle) * 45,

        life: 0.08
    });

    muzzleFlash = 0.06;
    shake = Math.max(shake, 2.5);

    createParticles(
        barrelX,
        barrelY,
        "#ffe082",
        4,
        90
    );

    updateHUD();

    if (player.ammo === 0) {
        setTimeout(startReload, 120);
    }
}

function updatePlayer(dt) {
    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy--;
    if (keys["s"]) dy++;
    if (keys["a"]) dx--;
    if (keys["d"]) dx++;

    if (dx !== 0 || dy !== 0) {
        const length =
            Math.hypot(dx, dy);

        dx /= length;
        dy /= length;
    }

    player.x +=
        dx * player.speed * dt;

    player.y +=
        dy * player.speed * dt;

    player.x = Math.max(
        25,
        Math.min(canvas.width - 25, player.x)
    );

    player.y = Math.max(
        25,
        Math.min(canvas.height - 25, player.y)
    );

    player.angle = Math.atan2(
        mouse.y - player.y,
        mouse.x - player.x
    );
}

function updateBullets(dt) {
    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {
        const bullet = bullets[i];

        bullet.oldX = bullet.x;
        bullet.oldY = bullet.y;

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        bullet.life -= dt;

        if (
            bullet.life <= 0 ||
            bullet.x < -100 ||
            bullet.x > canvas.width + 100 ||
            bullet.y < -100 ||
            bullet.y > canvas.height + 100
        ) {
            bullets.splice(i, 1);
            continue;
        }

        let bulletRemoved = false;

        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {
            const enemy = enemies[j];

            const distance =
                Math.hypot(
                    bullet.x - enemy.x,
                    bullet.y - enemy.y
                );

            if (
                distance <
                bullet.radius + enemy.radius
            ) {
                enemy.hp -= bullet.damage;
                enemy.hitFlash = 0.08;

                createParticles(
                    bullet.x,
                    bullet.y,
                    enemy.color,
                    8,
                    150
                );

                bullets.splice(i, 1);
                bulletRemoved = true;

                if (enemy.hp <= 0) {
                    killEnemy(j);
                }

                break;
            }
        }

        if (bulletRemoved) {
            continue;
        }
    }
}

function updateEnemies(dt) {
    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {
        const enemy = enemies[i];

        enemy.hitFlash =
            Math.max(
                0,
                enemy.hitFlash - dt
            );

        enemy.attackCooldown =
            Math.max(
                0,
                enemy.attackCooldown - dt
            );

        const angle =
            Math.atan2(
                player.y - enemy.y,
                player.x - enemy.x
            );

        enemy.angle = angle;

        const distance =
            Math.hypot(
                player.x - enemy.x,
                player.y - enemy.y
            );

        const stopDistance =
            player.radius + enemy.radius;

        if (distance > stopDistance) {
            enemy.x +=
                Math.cos(angle) *
                enemy.speed *
                dt;

            enemy.y +=
                Math.sin(angle) *
                enemy.speed *
                dt;
        }

        if (
            distance <= stopDistance + 4 &&
            enemy.attackCooldown <= 0
        ) {
            damagePlayer(enemy.damage);

            enemy.attackCooldown =
                enemy.type === "boss"
                    ? 0.7
                    : 1.0;
        }
    }
}

function killEnemy(index) {
    const enemy = enemies[index];

    createParticles(
        enemy.x,
        enemy.y,
        enemy.color,
        enemy.type === "boss" ? 70 : 22,
        enemy.type === "boss" ? 350 : 230
    );

    score +=
        enemy.value * combo;

    kills++;

    combo =
        Math.min(combo + 1, 8);

    comboTimer = 3.2;

    enemies.splice(index, 1);

    enemiesRemaining--;

    shake =
        Math.max(
            shake,
            enemy.type === "boss" ? 16 : 5
        );

    updateHUD();

    if (
        enemiesRemaining <= 0 &&
        enemiesToSpawn <= 0 &&
        enemies.length === 0
    ) {
        UI.statusText.textContent =
            "SECTOR CLEARED";

        setTimeout(() => {
            if (running) {
                beginNextWave();
            }
        }, 1600);
    }
}

function damagePlayer(amount) {
    if (!running) return;

    player.health -= amount;

    if (player.health < 0) {
        player.health = 0;
    }

    shake = Math.max(shake, 12);

    UI.damageOverlay.style.opacity = "1";

    setTimeout(() => {
        UI.damageOverlay.style.opacity = "0";
    }, 100);

    updateHUD();

    if (player.health <= 0) {
        endGame();
    }
}

function createParticles(
    x,
    y,
    color,
    amount,
    speed
) {
    for (let i = 0; i < amount; i++) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const velocity =
            Math.random() * speed;

        particles.push({
            x,
            y,

            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,

            size:
                1.5 + Math.random() * 4,

            life:
                0.25 + Math.random() * 0.45,

            maxLife: 0.7,

            color
        });
    }
}

function updateParticles(dt) {
    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {
        const particle = particles[i];

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;

        particle.vx *= 0.96;
        particle.vy *= 0.96;

        particle.life -= dt;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }

    for (
        let i = tracers.length - 1;
        i >= 0;
        i--
    ) {
        tracers[i].life -= dt;

        if (tracers[i].life <= 0) {
            tracers.splice(i, 1);
        }
    }
}

function updateCombo(dt) {
    if (combo <= 1) return;

    comboTimer -= dt;

    if (comboTimer <= 0) {
        combo = 1;
        comboTimer = 0;
        updateHUD();
    }
}

function updateReload(now) {
    if (
        player.reloading &&
        now - player.reloadStarted >=
        player.reloadTime
    ) {
        finishReload();
    }
}

function updateSpawning(now) {
    if (
        enemiesToSpawn > 0 &&
        now - lastSpawn >= spawnDelay
    ) {
        spawnEnemy();
        lastSpawn = now;
    }
}

function updateHUD() {
    UI.healthText.textContent =
        `${Math.ceil(player.health)}%`;

    UI.healthBar.style.width =
        `${Math.max(0, player.health)}%`;

    UI.score.textContent =
        String(score).padStart(6, "0");

    UI.kills.textContent = kills;
    UI.combo.textContent = `x${combo}`;
    UI.ammo.textContent = player.ammo;

    if (player.health <= 30) {
        UI.healthBar.style.background =
            "#ff405c";
    } else {
        UI.healthBar.style.background =
            "linear-gradient(90deg, #22b8cf, #68f5ff)";
    }
}

function drawArena() {
    const gradient =
        ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            50,
            canvas.width / 2,
            canvas.height / 2,
            700
        );

    gradient.addColorStop(
        0,
        "#10242b"
    );

    gradient.addColorStop(
        0.55,
        "#09141b"
    );

    gradient.addColorStop(
        1,
        "#03070b"
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.strokeStyle =
        "rgba(79, 211, 225, 0.07)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x <= canvas.width;
        x += 50
    ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (
        let y = 0;
        y <= canvas.height;
        y += 50
    ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.strokeStyle =
        "rgba(104,245,255,.16)";

    ctx.strokeRect(
        25,
        25,
        canvas.width - 50,
        canvas.height - 50
    );

    drawArenaObjects();
}

function drawArenaObjects() {
    const objects = [
        [150, 140, 100, 45],
        [850, 110, 130, 55],
        [250, 490, 150, 50],
        [900, 500, 110, 45]
    ];

    for (const object of objects) {
        const [x, y, w, h] = object;

        ctx.fillStyle =
            "rgba(7, 17, 23, .85)";

        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle =
            "rgba(104,245,255,.13)";

        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle =
            "rgba(104,245,255,.08)";

        ctx.fillRect(
            x + 8,
            y + 8,
            w - 16,
            3
        );
    }
}

function drawPlayer() {
    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    ctx.rotate(player.angle);

    // shadow
    ctx.fillStyle =
        "rgba(0,0,0,.45)";

    ctx.beginPath();
    ctx.ellipse(
        -2,
        10,
        25,
        16,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // legs
    ctx.strokeStyle = "#263943";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(-7, 9);
    ctx.lineTo(-15, 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(12, 22);
    ctx.stroke();

    // body armor
    ctx.fillStyle = "#1d3b46";
    ctx.strokeStyle = "#68f5ff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        17,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // helmet
    ctx.fillStyle = "#8defff";

    ctx.beginPath();
    ctx.arc(
        3,
        -2,
        8,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // rifle
    ctx.strokeStyle = "#d8faff";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(34, 0);
    ctx.stroke();

    ctx.strokeStyle = "#536c75";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(13, 4);
    ctx.lineTo(25, 4);
    ctx.stroke();

    if (muzzleFlash > 0) {
        ctx.fillStyle = "#fff5b5";

        ctx.beginPath();
        ctx.moveTo(36, 0);
        ctx.lineTo(49, -8);
        ctx.lineTo(45, 0);
        ctx.lineTo(49, 8);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        ctx.rotate(enemy.angle);

        // shadow
        ctx.fillStyle =
            "rgba(0,0,0,.35)";

        ctx.beginPath();
        ctx.ellipse(
            0,
            enemy.radius * 0.4,
            enemy.radius * 1.1,
            enemy.radius * 0.65,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle =
            enemy.hitFlash > 0
                ? "#ffffff"
                : enemy.color;

        if (enemy.type === "runner") {
            drawRunner(enemy);
        }

        if (enemy.type === "soldier") {
            drawSoldier(enemy);
        }

        if (enemy.type === "tank") {
            drawTank(enemy);
        }

        if (enemy.type === "boss") {
            drawBoss(enemy);
        }

        ctx.restore();

        drawEnemyHealth(enemy);
    }
}

function drawRunner(enemy) {
    ctx.beginPath();

    ctx.moveTo(
        enemy.radius,
        0
    );

    ctx.lineTo(
        -enemy.radius * 0.8,
        -enemy.radius * 0.7
    );

    ctx.lineTo(
        -enemy.radius * 0.5,
        0
    );

    ctx.lineTo(
        -enemy.radius * 0.8,
        enemy.radius * 0.7
    );

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe8ed";

    ctx.fillRect(
        2,
        -3,
        8,
        6
    );
}

function drawSoldier(enemy) {
    ctx.fillRect(
        -enemy.radius * 0.7,
        -enemy.radius * 0.7,
        enemy.radius * 1.4,
        enemy.radius * 1.4
    );

    ctx.fillStyle = "#161a20";

    ctx.fillRect(
        4,
        -4,
        enemy.radius + 12,
        8
    );

    ctx.fillStyle = "#ffd7a8";

    ctx.beginPath();
    ctx.arc(
        5,
        0,
        6,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function drawTank(enemy) {
    ctx.fillRect(
        -enemy.radius,
        -enemy.radius * 0.65,
        enemy.radius * 2,
        enemy.radius * 1.3
    );

    ctx.strokeStyle = "#e6c9ff";
    ctx.lineWidth = 3;

    ctx.strokeRect(
        -enemy.radius,
        -enemy.radius * 0.65,
        enemy.radius * 2,
        enemy.radius * 1.3
    );

    ctx.fillStyle = "#2b1838";

    ctx.fillRect(
        0,
        -6,
        enemy.radius + 16,
        12
    );
}

function drawBoss(enemy) {
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 25;

    ctx.beginPath();

    for (let i = 0; i < 8; i++) {
        const angle =
            (Math.PI * 2 / 8) * i;

        const radius =
            i % 2 === 0
                ? enemy.radius
                : enemy.radius * 0.72;

        const x =
            Math.cos(angle) * radius;

        const y =
            Math.sin(angle) * radius;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#18040a";

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        enemy.radius * 0.45,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
        enemy.radius * 0.1,
        -4,
        enemy.radius * 0.45,
        8
    );
}

function drawEnemyHealth(enemy) {
    if (
        enemy.hp >= enemy.maxHp &&
        enemy.type !== "boss"
    ) {
        return;
    }

    const width =
        enemy.type === "boss"
            ? 110
            : enemy.radius * 2;

    const y =
        enemy.y -
        enemy.radius -
        14;

    ctx.fillStyle =
        "rgba(0,0,0,.7)";

    ctx.fillRect(
        enemy.x - width / 2,
        y,
        width,
        5
    );

    ctx.fillStyle =
        enemy.type === "boss"
            ? "#ff214f"
            : "#ff667d";

    ctx.fillRect(
        enemy.x - width / 2,
        y,
        width *
        Math.max(
            0,
            enemy.hp / enemy.maxHp
        ),
        5
    );
}

function drawBullets() {
    ctx.lineCap = "round";

    for (const bullet of bullets) {
        ctx.strokeStyle =
            "rgba(150,245,255,.9)";

        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(
            bullet.oldX,
            bullet.oldY
        );

        ctx.lineTo(
            bullet.x,
            bullet.y
        );

        ctx.stroke();

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();
        ctx.arc(
            bullet.x,
            bullet.y,
            2.5,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    for (const tracer of tracers) {
        ctx.strokeStyle =
            `rgba(255,240,160,${Math.min(1, tracer.life * 12)})`;

        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(
            tracer.x1,
            tracer.y1
        );

        ctx.lineTo(
            tracer.x2,
            tracer.y2
        );

        ctx.stroke();
    }
}

function drawParticles() {
    for (const particle of particles) {
        const alpha =
            Math.max(
                0,
                particle.life /
                particle.maxLife
            );

        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;

        ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
        );
    }

    ctx.globalAlpha = 1;
}

function drawCrosshair() {
    const x = mouse.x;
    const y = mouse.y;

    ctx.save();

    ctx.translate(x, y);

    ctx.strokeStyle =
        "rgba(104,245,255,.9)";

    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        10,
        0,
        Math.PI * 2
    );
    ctx.stroke();

    const gap = 15;
    const length = 8;

    ctx.beginPath();

    ctx.moveTo(-gap, 0);
    ctx.lineTo(-gap - length, 0);

    ctx.moveTo(gap, 0);
    ctx.lineTo(gap + length, 0);

    ctx.moveTo(0, -gap);
    ctx.lineTo(0, -gap - length);

    ctx.moveTo(0, gap);
    ctx.lineTo(0, gap + length);

    ctx.stroke();

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
        -1,
        -1,
        2,
        2
    );

    ctx.restore();
}

function render() {
    ctx.save();

    if (shake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
        );
    }

    drawArena();
    drawParticles();
    drawEnemies();
    drawBullets();
    drawPlayer();

    ctx.restore();

    drawCrosshair();
}

function endGame() {
    running = false;
    mouse.down = false;

    UI.finalScore.textContent =
        score.toLocaleString();

    UI.gameOver.classList.remove(
        "hidden"
    );

    UI.statusText.textContent =
        "OPERATOR OFFLINE";
}

function gameLoop(now) {
    if (!running) {
        return;
    }

    let dt =
        (now - lastTime) / 1000;

    lastTime = now;

    dt = Math.min(dt, 0.033);

    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updateCombo(dt);
    updateReload(now);
    updateSpawning(now);

    shoot(now);

    muzzleFlash =
        Math.max(
            0,
            muzzleFlash - dt
        );

    shake =
        Math.max(
            0,
            shake - 35 * dt
        );

    render();

    requestAnimationFrame(gameLoop);
}

// Initial background render
drawArena();
drawPlayer();
drawCrosshair();
updateHUD();
