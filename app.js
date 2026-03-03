const finishKeys = ["Enter", " "];
const maxLives = 3;
const comboMilestones = [
    { threshold: 5, label: "Nice!" },
    { threshold: 10, label: "Great!" },
    { threshold: 20, label: "Amazing!" },
    { threshold: 35, label: "UNSTOPPABLE!" }
];

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
    rafId: 0,
    highScore: 0,
    highWave: 0
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
    wave: null,
    highScore: null,
    cannon: null
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function loadHighScore() {
    try {
        game.highScore = parseInt(localStorage.getItem("tw_highScore"), 10) || 0;
        game.highWave = parseInt(localStorage.getItem("tw_highWave"), 10) || 0;
    } catch (_) {
        game.highScore = 0;
        game.highWave = 0;
    }
}

function saveHighScore() {
    const isNew = game.score > game.highScore;
    if (isNew) game.highScore = game.score;
    if (game.wave > game.highWave) game.highWave = game.wave;
    try {
        localStorage.setItem("tw_highScore", game.highScore);
        localStorage.setItem("tw_highWave", game.highWave);
    } catch (_) { /* storage full or unavailable */ }
    return isNew;
}

function heartsString(count) {
    return "\u2764".repeat(Math.max(0, count)) + "\u2661".repeat(Math.max(0, maxLives - count));
}

function updateHud() {
    dom.score.text(game.score);
    dom.lives.html(heartsString(game.lives));
    dom.combo.text(`x${Math.max(1, game.combo)}`);
    dom.wave.text(game.wave);
    dom.highScore.text(game.highScore);
}

function screenSize() {
    return {
        width: dom.gameScreen.width(),
        height: dom.gameScreen.height()
    };
}

function randomWord() {
    const activeWords = new Set(game.enemies.map((e) => e.word));
    let word;
    let attempts = 0;
    do {
        word = wordList[Math.floor(Math.random() * wordList.length)];
        attempts++;
    } while (activeWords.has(word) && attempts < 30);
    return word;
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

function shakeScreen() {
    dom.gameScreen.addClass("screenShake");
    setTimeout(() => dom.gameScreen.removeClass("screenShake"), 300);
}

function loseLife() {
    game.lives -= 1;
    shakeScreen();
    updateHud();

    if (game.lives <= 0) {
        stopGame();
    }
}

function cannonRecoil() {
    dom.cannon.addClass("cannonFire");
    setTimeout(() => dom.cannon.removeClass("cannonFire"), 180);
}

function showScorePopup(x, y, points) {
    const popup = $('<div class="scorePopup"></div>').text(`+${points}`);
    popup.css({ left: `${x}px`, top: `${y}px` });
    dom.fxLayer.append(popup);
    setTimeout(() => popup.remove(), 600);
}

function showComboMilestone(label) {
    const el = $('<div class="comboMilestone"></div>').text(label);
    dom.fxLayer.append(el);
    setTimeout(() => el.remove(), 900);
}

function showWaveAnnouncement(waveNum) {
    const el = $('<div class="waveAnnounce"></div>').text(`Wave ${waveNum}`);
    dom.fxLayer.append(el);
    setTimeout(() => el.remove(), 1200);
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
    cannonRecoil();
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

function rewardHit(enemy) {
    game.combo += 1;
    const points = Math.round(enemy.word.length * (1 + game.combo * 0.15));
    game.score += points;
    const oldWave = game.wave;
    game.wave = Math.max(1, Math.floor(game.score / 120) + 1);

    showScorePopup(enemy.x, enemy.y - 20, points);

    if (game.wave > oldWave) {
        showWaveAnnouncement(game.wave);
    }

    for (let i = comboMilestones.length - 1; i >= 0; i--) {
        if (game.combo === comboMilestones[i].threshold) {
            showComboMilestone(comboMilestones[i].label);
            break;
        }
    }

    if (game.combo > 1) {
        dom.combo.parent().addClass("comboPulse");
        setTimeout(() => dom.combo.parent().removeClass("comboPulse"), 300);
    }

    updateHud();
}

function penalizeMiss() {
    game.combo = 0;
    game.score = Math.max(0, game.score - 3);
    dom.input.addClass("inputMiss");
    setTimeout(() => dom.input.removeClass("inputMiss"), 130);
    updateHud();
}

function highlightMatches() {
    const typed = dom.input.val().trim().toLowerCase();
    game.enemies.forEach((enemy) => {
        if (typed && enemy.word.startsWith(typed)) {
            enemy.el.addClass("matching");
        } else {
            enemy.el.removeClass("matching");
        }
    });
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
    rewardHit(target);

    setTimeout(() => {
        removeEnemy(target);
    }, 70);
}

function stopGame() {
    game.running = false;
    cancelAnimationFrame(game.rafId);
    dom.input.prop("disabled", true);

    const isNewHigh = saveHighScore();
    let text = `Final score: ${game.score} \u00b7 Wave reached: ${game.wave}`;
    if (isNewHigh) {
        text += " \u00b7 NEW HIGH SCORE!";
    }
    dom.gameOverText.text(text);
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
    const dangerZone = bottomLimit - 80;

    game.enemies.slice().forEach((enemy) => {
        enemy.y += enemy.speed * dt;
        enemy.el.css({ top: `${enemy.y}px` });

        if (enemy.y >= dangerZone) {
            enemy.el.addClass("danger");
        }

        if (enemy.y >= bottomLimit) {
            removeEnemy(enemy);
            game.combo = 0;
            loseLife();
        }
    });

    game.rafId = requestAnimationFrame(gameLoop);
}

function startCountdown(callback) {
    dom.input.prop("disabled", true);
    let count = 3;
    const el = $('<div class="countdown"></div>').text(count);
    dom.fxLayer.append(el);

    const tick = setInterval(() => {
        count--;
        if (count > 0) {
            el.text(count);
            el.removeClass("countdownPop");
            void el[0].offsetWidth;
            el.addClass("countdownPop");
        } else {
            clearInterval(tick);
            el.text("GO!");
            setTimeout(() => {
                el.remove();
                callback();
            }, 400);
        }
    }, 700);

    el.addClass("countdownPop");
}

function resetGame() {
    cancelAnimationFrame(game.rafId);
    clearAllEnemies();
    dom.fxLayer.empty();

    game.score = 0;
    game.lives = maxLives;
    game.combo = 0;
    game.wave = 1;
    game.spawnTimerMs = 0;
    game.lastFrameTs = 0;
    game.running = false;

    updateHud();
    dom.input.val("");
    dom.gameOverPanel.addClass("hidden");

    startCountdown(() => {
        game.running = true;
        dom.input.prop("disabled", false).focus();
        spawnEnemy();
        game.rafId = requestAnimationFrame(gameLoop);
    });
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
    dom.highScore = $("#currentHighScore");
    dom.cannon = $("#cannon");

    loadHighScore();

    dom.input.on("keydown", (event) => {
        if (finishKeys.includes(event.key)) {
            event.preventDefault();
            submitShot();
        }
    });

    dom.input.on("input", highlightMatches);

    $("#restartButton").on("click", resetGame);

    dom.gameScreen.on("click", () => dom.input.focus());

    resetGame();
});
