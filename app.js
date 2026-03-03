const finishKeys = ["Enter", " "];
const maxLives = 3;

const game = {
    running: false,
    score: 0,
    lives: maxLives,
    combo: 0,
    wave: 1,
    enemies: [],
    enemyId: 0,
    spawnTimerMs: 0,
    lastFrameTs: 0,
    speedBoost: 0,
    rafId: 0
};

const dom = {
    gameScreen: null,
    wordLayer: null,
    fxLayer: null,
    input: null,
    gameOverPanel: null,
    gameOverText: null,
    score: null,
    lives: null,
    combo: null,
    wave: null
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function updateHud() {
    dom.score.text(game.score);
    dom.lives.text(game.lives);
    dom.combo.text(`x${Math.max(1, game.combo)}`);
    dom.wave.text(game.wave);
}

function screenSize() {
    return {
        width: dom.gameScreen.width(),
        height: dom.gameScreen.height()
    };
}

function randomWord() {
    return wordList[Math.floor(Math.random() * wordList.length)];
}

function currentSpawnIntervalMs() {
    return clamp(1200 - game.wave * 80 - game.combo * 12, 260, 1200);
}

function currentFallSpeed() {
    return 40 + game.wave * 11 + game.combo * 1.2;
}

function spawnEnemy() {
    const size = screenSize();
    const enemy = {
        id: game.enemyId++,
        word: randomWord(),
        x: 70 + Math.random() * (size.width - 140),
        y: 45,
        speed: currentFallSpeed() + Math.random() * 16
    };

    enemy.el = $('<div class="word"></div>').text(enemy.word);
    dom.wordLayer.append(enemy.el);
    enemy.el.css({ left: `${enemy.x}px`, top: `${enemy.y}px` });

    game.enemies.push(enemy);
}

function removeEnemy(enemy) {
    enemy.el.remove();
    game.enemies = game.enemies.filter((item) => item.id !== enemy.id);
}

function loseLife() {
    game.lives -= 1;
    updateHud();

    if (game.lives <= 0) {
        stopGame();
    }
}

function fireLaser(enemy) {
    const size = screenSize();
    const sx = size.width / 2;
    const sy = size.height - 30;
    const ex = enemy.x;
    const ey = enemy.y;

    const dx = ex - sx;
    const dy = ey - sy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const laser = $('<div class="laser"></div>');
    laser.css({
        left: `${sx}px`,
        top: `${sy}px`,
        width: `${distance}px`,
        transform: `rotate(${angle}deg)`
    });

    dom.fxLayer.append(laser);
    requestAnimationFrame(() => laser.css("opacity", 1));

    setTimeout(() => {
        laser.css("opacity", 0);
        setTimeout(() => laser.remove(), 100);
    }, 70);

    const blast = $('<div class="explosion"></div>');
    blast.css({ left: `${ex}px`, top: `${ey}px` });
    dom.fxLayer.append(blast);
    setTimeout(() => blast.remove(), 300);
}

function rewardHit(wordLength) {
    game.combo += 1;
    game.score += Math.round(wordLength * (1 + game.combo * 0.15));
    game.wave = Math.max(1, Math.floor(game.score / 120) + 1);
    updateHud();
}

function penalizeMiss() {
    game.combo = 0;
    game.score = Math.max(0, game.score - 3);
    dom.input.addClass("inputMiss");
    setTimeout(() => dom.input.removeClass("inputMiss"), 130);
    updateHud();
}

function submitShot() {
    const typed = dom.input.val().trim().toLowerCase();
    dom.input.val("");

    if (!typed || !game.running) {
        return;
    }

    const target = game.enemies.find((enemy) => enemy.word === typed);

    if (!target) {
        penalizeMiss();
        return;
    }

    target.el.addClass("targeted");
    fireLaser(target);
    rewardHit(target.word.length);

    setTimeout(() => {
        removeEnemy(target);
    }, 70);
}

function stopGame() {
    game.running = false;
    cancelAnimationFrame(game.rafId);
    dom.input.prop("disabled", true);
    dom.gameOverText.text(`Final score: ${game.score} · Wave reached: ${game.wave}`);
    dom.gameOverPanel.removeClass("hidden");
}

function clearAllEnemies() {
    game.enemies.forEach((enemy) => enemy.el.remove());
    game.enemies = [];
}

function gameLoop(timestamp) {
    if (!game.running) {
        return;
    }

    if (!game.lastFrameTs) {
        game.lastFrameTs = timestamp;
    }

    const dt = Math.min((timestamp - game.lastFrameTs) / 1000, 0.033);
    game.lastFrameTs = timestamp;

    game.spawnTimerMs += dt * 1000;
    if (game.spawnTimerMs >= currentSpawnIntervalMs()) {
        game.spawnTimerMs = 0;
        spawnEnemy();
    }

    const size = screenSize();
    const bottomLimit = size.height - 36;

    game.enemies.slice().forEach((enemy) => {
        enemy.y += enemy.speed * dt;
        enemy.el.css({ top: `${enemy.y}px` });

        if (enemy.y >= bottomLimit) {
            removeEnemy(enemy);
            game.combo = 0;
            loseLife();
        }
    });

    game.rafId = requestAnimationFrame(gameLoop);
}

function resetGame() {
    cancelAnimationFrame(game.rafId);
    clearAllEnemies();

    game.running = true;
    game.score = 0;
    game.lives = maxLives;
    game.combo = 0;
    game.wave = 1;
    game.spawnTimerMs = 0;
    game.lastFrameTs = 0;

    updateHud();
    dom.input.prop("disabled", false).focus().val("");
    dom.gameOverPanel.addClass("hidden");

    spawnEnemy();
    game.rafId = requestAnimationFrame(gameLoop);
}

$(function () {
    dom.gameScreen = $("#gameScreen");
    dom.wordLayer = $("#wordLayer");
    dom.fxLayer = $("#fxLayer");
    dom.input = $("#myInput");
    dom.gameOverPanel = $("#gameOverPanel");
    dom.gameOverText = $("#gameOverText");
    dom.score = $("#currentScore");
    dom.lives = $("#currentLives");
    dom.combo = $("#currentCombo");
    dom.wave = $("#currentWave");

    dom.input.on("keydown", (event) => {
        if (finishKeys.includes(event.key)) {
            event.preventDefault();
            submitShot();
        }
    });

    $("#restartButton").on("click", resetGame);

    dom.gameScreen.on("click", () => dom.input.focus());

    resetGame();
});
