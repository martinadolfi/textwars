// TextWars — AI Benchmark: Claude Haiku vs GPT-4o
// Simulates gameplay to compare model response profiles

const BENCHMARK_BOTS = [
    {
        id: "haiku",
        name: "Claude Haiku",
        label: "claude-haiku-4-5",
        color: "#e07a5f",
        reactionMs: 95,
        jitterMs: 40,
        accuracy: 0.94,
        charsPerSec: 20,
        tagline: "Fast & efficient"
    },
    {
        id: "gpt4o",
        name: "GPT-4o",
        label: "gpt-4o",
        color: "#3d90e3",
        reactionMs: 160,
        jitterMs: 75,
        accuracy: 0.97,
        charsPerSec: 16,
        tagline: "Accurate & capable"
    }
];

const SIM_WORDS = 250;
const SIM_RUNS = 7;
const SCREEN_H = 519; // bottomLimit = (600 - 36) - spawn y 45

function simRun(bot) {
    let score = 0, combo = 0, wordsHit = 0, wordsMissed = 0, wave = 1, lives = 3;
    let busyMs = 0, timeMs = 0;

    for (let i = 0; i < SIM_WORDS && lives > 0; i++) {
        const word = wordList[Math.floor(Math.random() * wordList.length)];
        const speed = 40 + wave * 11 + combo * 1.2 + Math.random() * 16;
        const fallMs = (SCREEN_H / speed) * 1000;

        const waitMs = Math.max(0, busyMs - timeMs);
        const reactMs = bot.reactionMs + (Math.random() - 0.5) * 2 * bot.jitterMs;
        const typeMs = (word.length / bot.charsPerSec) * 1000;
        const totalMs = waitMs + reactMs + typeMs;

        const canHit = totalMs < fallMs;
        const hit = canHit && Math.random() < bot.accuracy;

        if (hit) {
            combo++;
            score += Math.round(word.length * (1 + combo * 0.15));
            wave = Math.max(1, Math.floor(score / 120) + 1);
            wordsHit++;
            busyMs = timeMs + totalMs;
        } else {
            combo = 0;
            if (!canHit) {
                lives--;
            } else {
                score = Math.max(0, score - 3);
            }
            wordsMissed++;
        }

        timeMs += Math.max(260, 1200 - wave * 80 - combo * 12);
    }

    return { score, wave, wordsHit, wordsMissed };
}

function avgResults(bot) {
    const runs = Array.from({ length: SIM_RUNS }, () => simRun(bot));
    const avg = key => Math.round(runs.reduce((s, r) => s + r[key], 0) / SIM_RUNS);
    const wordsHit = avg("wordsHit");
    const wordsMissed = avg("wordsMissed");
    return {
        score: avg("score"),
        wave: avg("wave"),
        wordsHit,
        hitRate: wordsHit / Math.max(1, wordsHit + wordsMissed)
    };
}

function runBenchmark(onProgress, onDone) {
    const results = {};
    let done = 0;

    function next(i) {
        if (i >= BENCHMARK_BOTS.length) {
            onDone(BENCHMARK_BOTS.map(b => ({ bot: b, result: results[b.id] })));
            return;
        }
        results[BENCHMARK_BOTS[i].id] = avgResults(BENCHMARK_BOTS[i]);
        done++;
        onProgress(done / BENCHMARK_BOTS.length);
        setTimeout(() => next(i + 1), 30);
    }

    next(0);
}

function formatScore(n) {
    return n.toLocaleString();
}

function renderBenchmarkResults(data) {
    const [a, b] = data;
    const aWins = a.result.score >= b.result.score;
    const winner = aWins ? a : b;

    const card = (d, isWinner) => `
        <div class="bmCard ${isWinner ? "bmCardWinner" : ""}" style="--bot-color: ${d.bot.color}">
            <div class="bmCardName" style="color:${d.bot.color}">${d.bot.name}</div>
            <div class="bmCardLabel">${d.bot.label}</div>
            <div class="bmCardTag">${d.bot.tagline}</div>
            <div class="bmStats">
                <div class="bmStat">
                    <span class="bmStatVal">${formatScore(d.result.score)}</span>
                    <span class="bmStatKey">avg score</span>
                </div>
                <div class="bmStat">
                    <span class="bmStatVal">${d.result.wave}</span>
                    <span class="bmStatKey">peak wave</span>
                </div>
                <div class="bmStat">
                    <span class="bmStatVal">${Math.round(d.result.hitRate * 100)}%</span>
                    <span class="bmStatKey">hit rate</span>
                </div>
                <div class="bmStat">
                    <span class="bmStatVal">${d.result.wordsHit}</span>
                    <span class="bmStatKey">words hit</span>
                </div>
                <div class="bmStat">
                    <span class="bmStatVal">~${d.bot.reactionMs}ms</span>
                    <span class="bmStatKey">reaction</span>
                </div>
            </div>
            ${isWinner ? '<div class="bmWinnerBadge">WINNER</div>' : ""}
        </div>`;

    return `
        <div class="bmGrid">
            ${card(a, aWins)}
            <div class="bmVs">VS</div>
            ${card(b, !aWins)}
        </div>
        <p class="bmFootnote">Simulated over ${SIM_RUNS} games · ${SIM_WORDS} words each</p>
        <button id="bmClose" class="bmCloseBtn" type="button">Close</button>`;
}

$(function () {
    $("#benchmarkButton").on("click", function () {
        const panel = $("#benchmarkPanel");
        const progress = $("#bmProgress");
        const fill = $("#bmProgressFill");
        const resultsEl = $("#bmResults");

        resultsEl.addClass("hidden").html("");
        progress.removeClass("hidden");
        fill.css("width", "0%");
        panel.removeClass("hidden");

        runBenchmark(
            function (pct) {
                fill.css("width", (pct * 100) + "%");
            },
            function (data) {
                fill.css("width", "100%");
                setTimeout(function () {
                    progress.addClass("hidden");
                    resultsEl.html(renderBenchmarkResults(data)).removeClass("hidden");
                    $("#bmClose").on("click", function () {
                        panel.addClass("hidden");
                    });
                }, 300);
            }
        );
    });
});
