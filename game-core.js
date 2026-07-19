(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.TextWarsCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const MODES = Object.freeze({
        cadet: Object.freeze({ id: "cadet", label: "Cadet", lives: 5, baseSpawnMs: 1750, minSpawnMs: 680, baseSpeed: 34, waveSpeed: 5.5 }),
        ace: Object.freeze({ id: "ace", label: "Ace", lives: 3, baseSpawnMs: 1450, minSpawnMs: 440, baseSpeed: 47, waveSpeed: 7.5 }),
        onslaught: Object.freeze({ id: "onslaught", label: "Onslaught", lives: 2, baseSpawnMs: 1120, minSpawnMs: 330, baseSpeed: 60, waveSpeed: 10 })
    });

    const WAVE_SCORE = 450;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getMode(modeId) {
        return MODES[modeId] || MODES.ace;
    }

    function getMultiplier(combo) {
        if (combo >= 20) return 4;
        if (combo >= 10) return 3;
        if (combo >= 5) return 2;
        return 1;
    }

    function getWave(score) {
        return Math.floor(Math.max(0, score) / WAVE_SCORE) + 1;
    }

    function getWaveProgress(score) {
        const safeScore = Math.max(0, score);
        return (safeScore % WAVE_SCORE) / WAVE_SCORE;
    }

    function getSpawnInterval(modeId, wave, combo) {
        const mode = getMode(modeId);
        const reduction = (Math.max(1, wave) - 1) * 78 + Math.min(Math.max(0, combo), 30) * 7;
        return Math.round(clamp(mode.baseSpawnMs - reduction, mode.minSpawnMs, mode.baseSpawnMs));
    }

    function getFallSpeed(modeId, wave, combo, variance) {
        const mode = getMode(modeId);
        const streakPressure = Math.min(Math.max(0, combo), 25) * 0.45;
        return mode.baseSpeed + (Math.max(1, wave) - 1) * mode.waveSpeed + streakPressure + (variance || 0);
    }

    function calculatePoints(word, combo, dangerClear) {
        const multiplier = getMultiplier(combo);
        const lengthScore = Math.max(1, String(word || "").length) * 10;
        return lengthScore * multiplier + (dangerClear ? 25 * multiplier : 0);
    }

    function calculateAccuracy(hits, misses) {
        const attempts = Math.max(0, hits) + Math.max(0, misses);
        return attempts ? Math.round((Math.max(0, hits) / attempts) * 100) : 100;
    }

    function wordLengthRange(wave, modeId) {
        const safeWave = Math.max(1, wave);
        const modeBoost = modeId === "onslaught" ? 1 : modeId === "cadet" ? -1 : 0;
        return {
            min: clamp(2 + Math.floor((safeWave - 1) / 4) + modeBoost, 2, 6),
            max: clamp(5 + Math.floor((safeWave - 1) / 2) + modeBoost, 4, 11)
        };
    }

    function normalizePool(words) {
        return Array.from(new Set((words || [])
            .map((word) => String(word).trim().toLowerCase())
            .filter((word) => /^[a-záéíóúüñ]+$/i.test(word) && word.length >= 2 && word.length <= 14)));
    }

    function chooseWord(words, options) {
        const settings = options || {};
        const pool = normalizePool(words);
        if (!pool.length) return "signal";

        const range = wordLengthRange(settings.wave || 1, settings.modeId || "ace");
        const blocked = new Set([...(settings.activeWords || []), ...(settings.recentWords || [])]);
        let candidates = pool.filter((word) => word.length >= range.min && word.length <= range.max && !blocked.has(word));
        if (!candidates.length) candidates = pool.filter((word) => !blocked.has(word));
        if (!candidates.length) candidates = pool;
        const random = typeof settings.random === "function" ? settings.random : Math.random;
        return candidates[Math.floor(clamp(random(), 0, 0.999999) * candidates.length)];
    }

    return Object.freeze({
        MODES,
        WAVE_SCORE,
        clamp,
        getMode,
        getMultiplier,
        getWave,
        getWaveProgress,
        getSpawnInterval,
        getFallSpeed,
        calculatePoints,
        calculateAccuracy,
        wordLengthRange,
        normalizePool,
        chooseWord
    });
});
