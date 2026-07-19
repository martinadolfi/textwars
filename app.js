(function () {
    "use strict";

    const Core = window.TextWarsCore;
    const PROFILE_KEY = "textwars_profile_v2";
    const RECENT_WORD_LIMIT = 12;
    const DANGER_DISTANCE = 125;

    const defaultRecord = () => ({ score: 0, wave: 1, combo: 0 });
    const defaultProfile = () => ({
        sound: true,
        language: (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en",
        mode: "ace",
        records: {
            cadet: defaultRecord(),
            ace: defaultRecord(),
            onslaught: defaultRecord()
        }
    });

    const game = {
        phase: "briefing",
        score: 0,
        lives: 3,
        combo: 0,
        bestCombo: 0,
        wave: 1,
        hits: 0,
        misses: 0,
        breaches: 0,
        enemies: [],
        enemyId: 0,
        recentWords: [],
        spawnTimerMs: 0,
        lastFrameTs: 0,
        rafId: 0,
        countdownToken: 0,
        timers: new Set(),
        profile: defaultProfile()
    };

    const dom = {};

    function $(id) {
        return document.getElementById(id);
    }

    function cacheDom() {
        [
            "gameScreen", "wordLayer", "fxLayer", "cannon", "briefingPanel", "pausePanel",
            "gameOverPanel", "gameOverTitle", "myInput", "commandDock", "lockStatus",
            "fireButton", "startButton", "restartButton", "resumeButton", "quitButton",
            "briefingButton", "pauseButton", "pauseIcon", "soundButton", "soundIcon",
            "languageButton", "languageLabel", "currentScore", "currentWave", "currentCombo",
            "currentLives", "currentHighScore", "sectorProgressFill", "currentAccuracy",
            "currentHits", "bestCombo", "finalScore", "finalWave", "finalAccuracy",
            "finalCombo", "finalHits", "newRecord", "liveAnnouncer"
        ].forEach((id) => { dom[id] = $(id); });
        dom.modeButtons = Array.from(document.querySelectorAll(".modeCard"));
        dom.cannonBarrel = document.querySelector(".cannonBarrel");
    }

    function loadProfile() {
        try {
            const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
            if (saved && typeof saved === "object") {
                game.profile = {
                    ...defaultProfile(),
                    ...saved,
                    records: {
                        ...defaultProfile().records,
                        ...(saved.records || {})
                    }
                };
            }

            const legacyScore = Number(localStorage.getItem("tw_highScore")) || 0;
            const legacyWave = Number(localStorage.getItem("tw_highWave")) || 1;
            if (legacyScore > game.profile.records.ace.score) {
                game.profile.records.ace.score = legacyScore;
                game.profile.records.ace.wave = legacyWave;
            }
        } catch (_) {
            game.profile = defaultProfile();
        }
    }

    function saveProfile() {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(game.profile));
        } catch (_) {
            // The game remains fully playable when storage is unavailable.
        }
    }

    class SoundEngine {
        constructor() {
            this.context = null;
        }

        ensureContext() {
            if (!game.profile.sound) return null;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;
            if (!this.context) this.context = new AudioContext();
            if (this.context.state === "suspended") this.context.resume();
            return this.context;
        }

        tone(startFrequency, endFrequency, duration, volume, type, delay) {
            const context = this.ensureContext();
            if (!context) return;
            const now = context.currentTime + (delay || 0);
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = type || "sine";
            oscillator.frequency.setValueAtTime(startFrequency, now);
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(now);
            oscillator.stop(now + duration + 0.02);
        }

        fire() { this.tone(180, 860, 0.09, 0.09, "sawtooth"); }
        hit() {
            this.tone(480, 920, 0.12, 0.07, "triangle");
            this.tone(720, 1180, 0.11, 0.04, "sine", 0.045);
        }
        miss() { this.tone(150, 70, 0.2, 0.07, "square"); }
        breach() { this.tone(120, 42, 0.42, 0.11, "sawtooth"); }
        wave() {
            [330, 440, 660].forEach((frequency, index) => this.tone(frequency, frequency * 1.01, 0.2, 0.055, "triangle", index * 0.1));
        }
        deploy() {
            [220, 330, 495].forEach((frequency, index) => this.tone(frequency, frequency * 1.03, 0.16, 0.05, "triangle", index * 0.08));
        }
    }

    const sound = new SoundEngine();

    function setTimer(callback, delay) {
        const timer = window.setTimeout(() => {
            game.timers.delete(timer);
            callback();
        }, delay);
        game.timers.add(timer);
        return timer;
    }

    function clearTimers() {
        game.timers.forEach((timer) => window.clearTimeout(timer));
        game.timers.clear();
    }

    function formatScore(score) {
        return String(Math.max(0, Math.round(score))).padStart(6, "0");
    }

    function announce(message) {
        dom.liveAnnouncer.textContent = "";
        window.requestAnimationFrame(() => { dom.liveAnnouncer.textContent = message; });
    }

    function activeRecord() {
        return game.profile.records[game.profile.mode] || defaultRecord();
    }

    function updateHud() {
        const mode = Core.getMode(game.profile.mode);
        const multiplier = Core.getMultiplier(game.combo);
        const record = activeRecord();
        const accuracy = Core.calculateAccuracy(game.hits, game.misses);
        const full = "◆".repeat(Math.max(0, game.lives));
        const empty = "◇".repeat(Math.max(0, mode.lives - game.lives));

        dom.currentScore.textContent = formatScore(game.score);
        dom.currentWave.textContent = String(game.wave).padStart(2, "0");
        dom.currentCombo.textContent = `×${multiplier}`;
        dom.currentCombo.classList.toggle("hot", multiplier > 1);
        dom.currentLives.textContent = full + empty;
        dom.currentLives.setAttribute("aria-label", `${game.lives} shield${game.lives === 1 ? "" : "s"} remaining`);
        dom.currentHighScore.textContent = formatScore(record.score);
        dom.sectorProgressFill.style.transform = `scaleX(${Core.getWaveProgress(game.score)})`;
        dom.currentAccuracy.textContent = game.hits + game.misses ? `${accuracy}%` : "—";
        dom.currentHits.textContent = String(game.hits);
        dom.bestCombo.textContent = String(Math.max(game.bestCombo, record.combo || 0));
    }

    function updatePreferencesUi() {
        dom.languageLabel.textContent = game.profile.language.toUpperCase();
        dom.soundButton.setAttribute("aria-pressed", String(game.profile.sound));
        dom.soundButton.setAttribute("aria-label", game.profile.sound ? "Mute sound" : "Enable sound");
        dom.soundIcon.textContent = game.profile.sound ? "◖))" : "◖×";
        dom.myInput.placeholder = game.profile.language === "es" ? "ESCRIBE EL CÓDIGO ENEMIGO…" : "TYPE ENEMY CODEWORD…";
        dom.modeButtons.forEach((button) => {
            const selected = button.dataset.mode === game.profile.mode;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
    }

    function setCommandEnabled(enabled) {
        dom.myInput.disabled = !enabled;
        dom.fireButton.disabled = !enabled;
        dom.commandDock.classList.toggle("disabled", !enabled);
        if (!enabled) {
            dom.myInput.value = "";
            dom.lockStatus.textContent = "SCANNING";
            dom.lockStatus.className = "lockStatus";
        }
    }

    function clearBattlefield() {
        game.enemies.forEach((enemy) => enemy.el.remove());
        game.enemies = [];
        dom.wordLayer.replaceChildren();
        dom.fxLayer.replaceChildren();
        dom.gameScreen.classList.remove("screenShake", "damageFlash", "waveFlash");
        aimCannon(null);
    }

    function showBriefing() {
        game.phase = "briefing";
        game.countdownToken += 1;
        cancelAnimationFrame(game.rafId);
        clearTimers();
        clearBattlefield();
        resetRunState();
        setCommandEnabled(false);
        dom.briefingPanel.classList.remove("hidden");
        dom.pausePanel.classList.add("hidden");
        dom.gameOverPanel.classList.add("hidden");
        dom.pauseButton.disabled = true;
        dom.pauseIcon.textContent = "Ⅱ";
        updateHud();
        dom.startButton.focus({ preventScroll: true });
    }

    function resetRunState() {
        const mode = Core.getMode(game.profile.mode);
        game.score = 0;
        game.lives = mode.lives;
        game.combo = 0;
        game.bestCombo = 0;
        game.wave = 1;
        game.hits = 0;
        game.misses = 0;
        game.breaches = 0;
        game.enemies = [];
        game.recentWords = [];
        game.spawnTimerMs = 0;
        game.lastFrameTs = 0;
    }

    function beginCountdown() {
        const token = ++game.countdownToken;
        const countdown = document.createElement("div");
        countdown.className = "countdown";
        dom.fxLayer.append(countdown);
        const sequence = ["3", "2", "1", "ENGAGE"];
        let step = 0;

        function tick() {
            if (token !== game.countdownToken || game.phase !== "countdown") return;
            countdown.textContent = sequence[step];
            countdown.classList.remove("countdownPop");
            void countdown.offsetWidth;
            countdown.classList.add("countdownPop");
            if (step < sequence.length - 1) {
                step += 1;
                setTimer(tick, 620);
            } else {
                setTimer(() => {
                    if (token !== game.countdownToken || game.phase !== "countdown") return;
                    countdown.remove();
                    game.phase = "playing";
                    setCommandEnabled(true);
                    dom.pauseButton.disabled = false;
                    spawnEnemy();
                    dom.myInput.focus({ preventScroll: true });
                    game.rafId = requestAnimationFrame(gameLoop);
                    announce("Mission started. Type the incoming codewords.");
                }, 440);
            }
        }

        tick();
    }

    function startGame() {
        game.countdownToken += 1;
        cancelAnimationFrame(game.rafId);
        clearTimers();
        clearBattlefield();
        resetRunState();
        game.phase = "countdown";
        dom.briefingPanel.classList.add("hidden");
        dom.pausePanel.classList.add("hidden");
        dom.gameOverPanel.classList.add("hidden");
        dom.newRecord.classList.add("hidden");
        setCommandEnabled(false);
        updateHud();
        sound.deploy();
        beginCountdown();
    }

    function wordPool() {
        if (window.textWarsWords) return window.textWarsWords[game.profile.language];
        return game.profile.language === "es" ? window.wordListEs : window.wordListEn;
    }

    function chooseLane() {
        const width = dom.gameScreen.clientWidth;
        const laneCount = Core.clamp(Math.floor(width / 126), 4, 9);
        const occupied = new Set(game.enemies.filter((enemy) => enemy.y < 150).map((enemy) => enemy.lane));
        let available = Array.from({ length: laneCount }, (_, index) => index).filter((lane) => !occupied.has(lane));
        if (!available.length) available = Array.from({ length: laneCount }, (_, index) => index);
        const lane = available[Math.floor(Math.random() * available.length)];
        return { lane, x: ((lane + 0.5) / laneCount) * 100 };
    }

    function createEnemyElement(enemy) {
        const el = document.createElement("div");
        el.className = "wordEnemy entering";
        el.dataset.id = String(enemy.id);
        el.style.left = `${enemy.x}%`;
        el.style.setProperty("--enemy-y", `${enemy.y}px`);
        const serial = document.createElement("small");
        serial.textContent = `SIGNAL ${String(enemy.id + 1).padStart(4, "0")}`;
        const name = document.createElement("span");
        name.className = "wordName";
        el.append(serial, name);
        enemy.nameEl = name;
        enemy.el = el;
        renderEnemyWord(enemy, 0);
        dom.wordLayer.append(el);
        requestAnimationFrame(() => el.classList.remove("entering"));
    }

    function renderEnemyWord(enemy, typedLength) {
        enemy.nameEl.replaceChildren();
        const matched = document.createElement("b");
        matched.textContent = enemy.word.slice(0, typedLength);
        const remaining = document.createTextNode(enemy.word.slice(typedLength));
        enemy.nameEl.append(matched, remaining);
    }

    function spawnEnemy() {
        if (game.phase !== "playing") return;
        const position = chooseLane();
        const word = Core.chooseWord(wordPool(), {
            wave: game.wave,
            modeId: game.profile.mode,
            activeWords: game.enemies.map((enemy) => enemy.word),
            recentWords: game.recentWords,
            random: Math.random
        });
        const enemy = {
            id: game.enemyId++,
            word,
            lane: position.lane,
            x: position.x,
            y: 74,
            speed: Core.getFallSpeed(game.profile.mode, game.wave, game.combo, Math.random() * 12 - 3),
            danger: false,
            destroyed: false,
            el: null,
            nameEl: null
        };
        game.recentWords.push(word);
        if (game.recentWords.length > RECENT_WORD_LIMIT) game.recentWords.shift();
        createEnemyElement(enemy);
        game.enemies.push(enemy);
        updateTargeting();
    }

    function removeEnemy(enemy, immediate) {
        game.enemies = game.enemies.filter((item) => item.id !== enemy.id);
        if (immediate) enemy.el.remove();
        updateTargeting();
    }

    function aimCannon(enemy) {
        if (!enemy) {
            dom.cannonBarrel.style.transform = "rotate(-90deg)";
            return;
        }
        const width = dom.gameScreen.clientWidth;
        const height = dom.gameScreen.clientHeight;
        const x = (enemy.x / 100) * width;
        const y = enemy.y;
        const angle = Math.atan2(y - (height - 54), x - width / 2) * 180 / Math.PI;
        dom.cannonBarrel.style.transform = `rotate(${angle}deg)`;
    }

    function updateTargeting() {
        const typed = dom.myInput.value.trim().toLowerCase();
        const candidates = game.enemies
            .filter((enemy) => typed && enemy.word.startsWith(typed) && !enemy.destroyed)
            .sort((a, b) => b.y - a.y);
        const locked = candidates[0] || null;

        game.enemies.forEach((enemy) => {
            const matching = Boolean(typed && enemy.word.startsWith(typed));
            enemy.el.classList.toggle("matching", matching);
            enemy.el.classList.toggle("locked", enemy === locked);
            renderEnemyWord(enemy, matching ? typed.length : 0);
        });

        aimCannon(locked);
        dom.lockStatus.className = "lockStatus";
        if (locked && locked.word === typed) {
            dom.lockStatus.textContent = "LOCKED";
            dom.lockStatus.classList.add("locked");
        } else if (locked) {
            dom.lockStatus.textContent = "TRACKING";
            dom.lockStatus.classList.add("tracking");
        } else {
            dom.lockStatus.textContent = typed ? "NO MATCH" : "SCANNING";
            if (typed) dom.lockStatus.classList.add("noMatch");
        }
    }

    function makeLaser(enemy) {
        const width = dom.gameScreen.clientWidth;
        const height = dom.gameScreen.clientHeight;
        const startX = width / 2;
        const startY = height - 50;
        const endX = (enemy.x / 100) * width;
        const endY = enemy.y;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const laser = document.createElement("div");
        laser.className = "laser";
        laser.style.left = `${startX}px`;
        laser.style.top = `${startY}px`;
        laser.style.width = `${distance}px`;
        laser.style.transform = `rotate(${angle}deg)`;
        dom.fxLayer.append(laser);
        requestAnimationFrame(() => laser.classList.add("visible"));
        setTimer(() => laser.remove(), 180);
    }

    function makeExplosion(enemy, points) {
        const explosion = document.createElement("div");
        explosion.className = "explosion";
        explosion.style.left = `${enemy.x}%`;
        explosion.style.top = `${enemy.y}px`;
        for (let index = 0; index < 8; index += 1) {
            const spark = document.createElement("i");
            spark.style.setProperty("--spark-angle", `${index * 45}deg`);
            explosion.append(spark);
        }
        const popup = document.createElement("div");
        popup.className = "scorePopup";
        popup.textContent = `+${points}`;
        popup.style.left = `${enemy.x}%`;
        popup.style.top = `${Math.max(80, enemy.y - 26)}px`;
        dom.fxLayer.append(explosion, popup);
        setTimer(() => { explosion.remove(); popup.remove(); }, 720);
    }

    function showAnnouncement(title, detail, danger) {
        const el = document.createElement("div");
        el.className = `battleAnnouncement${danger ? " danger" : ""}`;
        const strong = document.createElement("strong");
        strong.textContent = title;
        const span = document.createElement("span");
        span.textContent = detail || "";
        el.append(strong, span);
        dom.fxLayer.append(el);
        setTimer(() => el.remove(), 1250);
    }

    function pulseClass(element, className, duration) {
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
        setTimer(() => element.classList.remove(className), duration);
    }

    function rewardHit(enemy) {
        game.combo += 1;
        game.bestCombo = Math.max(game.bestCombo, game.combo);
        game.hits += 1;
        const points = Core.calculatePoints(enemy.word, game.combo, enemy.danger);
        const previousWave = game.wave;
        game.score += points;
        game.wave = Core.getWave(game.score);
        makeExplosion(enemy, points);
        sound.hit();

        if (game.wave > previousWave) {
            showAnnouncement(`SECTOR ${String(game.wave).padStart(2, "0")}`, "HOSTILE FREQUENCY INCREASING");
            pulseClass(dom.gameScreen, "waveFlash", 500);
            sound.wave();
        } else if ([5, 10, 20].includes(game.combo)) {
            showAnnouncement(`×${Core.getMultiplier(game.combo)} MULTIPLIER`, `${game.combo} HIT STREAK`);
        }
        updateHud();
    }

    function penalizeMiss() {
        game.misses += 1;
        game.combo = 0;
        game.score = Math.max(0, game.score - 10);
        game.wave = Core.getWave(game.score);
        pulseClass(dom.commandDock, "inputMiss", 240);
        sound.miss();
        updateHud();
        announce("Shot missed. Target lock reset.");
    }

    function submitShot() {
        if (game.phase !== "playing") return;
        const typed = dom.myInput.value.trim().toLowerCase();
        if (!typed) return;
        const target = game.enemies
            .filter((enemy) => enemy.word === typed && !enemy.destroyed)
            .sort((a, b) => b.y - a.y)[0];

        dom.myInput.value = "";
        if (!target) {
            penalizeMiss();
            updateTargeting();
            return;
        }

        target.destroyed = true;
        target.el.classList.add("destroyed");
        makeLaser(target);
        pulseClass(dom.cannon, "firing", 160);
        sound.fire();
        rewardHit(target);
        game.enemies = game.enemies.filter((enemy) => enemy.id !== target.id);
        setTimer(() => target.el.remove(), 220);
        updateTargeting();
    }

    function breach(enemy) {
        removeEnemy(enemy, true);
        game.lives -= 1;
        game.combo = 0;
        game.breaches += 1;
        pulseClass(dom.gameScreen, "screenShake", 360);
        pulseClass(dom.gameScreen, "damageFlash", 450);
        sound.breach();
        updateHud();
        announce(`Perimeter hit. ${game.lives} shields remaining.`);
        if (game.lives <= 0) endGame();
    }

    function saveRecord() {
        const record = activeRecord();
        const isNewScore = game.score > record.score;
        record.score = Math.max(record.score, game.score);
        record.wave = Math.max(record.wave, game.wave);
        record.combo = Math.max(record.combo || 0, game.bestCombo);
        game.profile.records[game.profile.mode] = record;
        saveProfile();
        return isNewScore;
    }

    function endGame() {
        if (game.phase === "ended") return;
        game.phase = "ended";
        cancelAnimationFrame(game.rafId);
        clearTimers();
        setCommandEnabled(false);
        dom.pauseButton.disabled = true;
        const isNewScore = saveRecord();
        updateHud();

        dom.finalScore.textContent = formatScore(game.score);
        dom.finalWave.textContent = String(game.wave).padStart(2, "0");
        dom.finalAccuracy.textContent = `${Core.calculateAccuracy(game.hits, game.misses)}%`;
        dom.finalCombo.textContent = String(game.bestCombo);
        dom.finalHits.textContent = String(game.hits);
        dom.gameOverTitle.textContent = isNewScore ? "NEW PERSONAL BEST" : "MISSION ENDED";
        dom.newRecord.classList.toggle("hidden", !isNewScore);
        dom.gameOverPanel.classList.remove("hidden");
        announce(`Mission ended. Final score ${game.score}.`);
        setTimer(() => dom.restartButton.focus({ preventScroll: true }), 100);
    }

    function gameLoop(timestamp) {
        if (game.phase !== "playing") return;
        if (!game.lastFrameTs) game.lastFrameTs = timestamp;
        const dt = Math.min((timestamp - game.lastFrameTs) / 1000, 0.05);
        game.lastFrameTs = timestamp;

        game.spawnTimerMs += dt * 1000;
        const spawnInterval = Core.getSpawnInterval(game.profile.mode, game.wave, game.combo);
        if (game.spawnTimerMs >= spawnInterval) {
            game.spawnTimerMs = 0;
            spawnEnemy();
        }

        const bottomLimit = dom.gameScreen.clientHeight - 88;
        game.enemies.slice().forEach((enemy) => {
            if (enemy.destroyed) return;
            enemy.y += enemy.speed * dt;
            enemy.el.style.setProperty("--enemy-y", `${enemy.y}px`);
            const isDanger = enemy.y >= bottomLimit - DANGER_DISTANCE;
            if (isDanger !== enemy.danger) {
                enemy.danger = isDanger;
                enemy.el.classList.toggle("danger", isDanger);
            }
            if (enemy.y >= bottomLimit) breach(enemy);
        });

        if (game.phase === "playing") game.rafId = requestAnimationFrame(gameLoop);
    }

    function pauseGame(automatic) {
        if (game.phase !== "playing") return;
        game.phase = "paused";
        cancelAnimationFrame(game.rafId);
        game.lastFrameTs = 0;
        setCommandEnabled(false);
        dom.pausePanel.classList.remove("hidden");
        dom.pauseIcon.textContent = "▶";
        dom.pauseButton.setAttribute("aria-label", "Resume game");
        if (!automatic) dom.resumeButton.focus({ preventScroll: true });
        announce("Mission paused.");
    }

    function resumeGame() {
        if (game.phase !== "paused") return;
        game.phase = "playing";
        dom.pausePanel.classList.add("hidden");
        dom.pauseIcon.textContent = "Ⅱ";
        dom.pauseButton.setAttribute("aria-label", "Pause game");
        setCommandEnabled(true);
        dom.myInput.focus({ preventScroll: true });
        game.rafId = requestAnimationFrame(gameLoop);
        announce("Mission resumed.");
    }

    function togglePause() {
        if (game.phase === "playing") pauseGame(false);
        else if (game.phase === "paused") resumeGame();
    }

    function bindEvents() {
        dom.modeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                game.profile.mode = button.dataset.mode;
                saveProfile();
                updatePreferencesUi();
                resetRunState();
                updateHud();
            });
        });

        dom.startButton.addEventListener("click", startGame);
        dom.restartButton.addEventListener("click", startGame);
        dom.resumeButton.addEventListener("click", resumeGame);
        dom.quitButton.addEventListener("click", showBriefing);
        dom.briefingButton.addEventListener("click", showBriefing);
        dom.pauseButton.addEventListener("click", togglePause);
        dom.fireButton.addEventListener("click", () => {
            submitShot();
            if (game.phase === "playing") dom.myInput.focus({ preventScroll: true });
        });

        dom.soundButton.addEventListener("click", () => {
            game.profile.sound = !game.profile.sound;
            saveProfile();
            updatePreferencesUi();
            if (game.profile.sound) sound.tone(440, 660, 0.12, 0.05, "triangle");
        });

        dom.languageButton.addEventListener("click", () => {
            game.profile.language = game.profile.language === "en" ? "es" : "en";
            saveProfile();
            updatePreferencesUi();
            announce(`Word language changed to ${game.profile.language === "en" ? "English" : "Spanish"}.`);
        });

        dom.myInput.addEventListener("input", () => {
            dom.myInput.value = dom.myInput.value.replace(/[^a-záéíóúüñ]/gi, "").toLowerCase();
            updateTargeting();
        });
        dom.myInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                submitShot();
            }
        });

        dom.gameScreen.addEventListener("pointerdown", (event) => {
            if (game.phase === "playing" && !event.target.closest("button, input")) dom.myInput.focus({ preventScroll: true });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && (game.phase === "playing" || game.phase === "paused")) {
                event.preventDefault();
                togglePause();
                return;
            }
            if ((event.key === "p" || event.key === "P") && game.phase !== "briefing" && document.activeElement !== dom.myInput) {
                event.preventDefault();
                togglePause();
                return;
            }
            if (event.key === "Enter" && !event.target.closest("button, input")) {
                if (game.phase === "briefing") startGame();
                else if (game.phase === "ended") startGame();
                return;
            }
            if (game.phase === "playing" && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && document.activeElement !== dom.myInput) {
                dom.myInput.focus({ preventScroll: true });
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden && game.phase === "playing") pauseGame(true);
        });
    }

    function initialize() {
        cacheDom();
        loadProfile();
        resetRunState();
        bindEvents();
        updatePreferencesUi();
        updateHud();
        showBriefing();

        window.__textWars = Object.freeze({
            getState: () => ({
                phase: game.phase,
                score: game.score,
                lives: game.lives,
                combo: game.combo,
                wave: game.wave,
                hits: game.hits,
                misses: game.misses,
                enemies: game.enemies.map(({ word, x, y, danger }) => ({ word, x, y, danger }))
            }),
            start: startGame,
            pause: togglePause
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
