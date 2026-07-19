const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../game-core.js");

test("combo multiplier advances at the intended milestones", () => {
    assert.equal(core.getMultiplier(0), 1);
    assert.equal(core.getMultiplier(5), 2);
    assert.equal(core.getMultiplier(10), 3);
    assert.equal(core.getMultiplier(20), 4);
});

test("danger-zone clears add a multiplier-aware bonus", () => {
    assert.equal(core.calculatePoints("laser", 1, false), 50);
    assert.equal(core.calculatePoints("laser", 5, false), 100);
    assert.equal(core.calculatePoints("laser", 5, true), 150);
});

test("wave and progress use stable 450-point sectors", () => {
    assert.equal(core.getWave(0), 1);
    assert.equal(core.getWave(449), 1);
    assert.equal(core.getWave(450), 2);
    assert.equal(core.getWaveProgress(225), 0.5);
});

test("accuracy handles a fresh game and normal attempts", () => {
    assert.equal(core.calculateAccuracy(0, 0), 100);
    assert.equal(core.calculateAccuracy(7, 3), 70);
});

test("difficulty changes shields, pacing, and speed", () => {
    assert.equal(core.getMode("cadet").lives, 5);
    assert.equal(core.getMode("ace").lives, 3);
    assert.equal(core.getMode("onslaught").lives, 2);
    assert.ok(core.getSpawnInterval("onslaught", 1, 0) < core.getSpawnInterval("cadet", 1, 0));
    assert.ok(core.getFallSpeed("onslaught", 2, 0, 0) > core.getFallSpeed("ace", 2, 0, 0));
});

test("word choice respects length, active words, and deterministic random", () => {
    const words = ["a", "go", "go", "star", "laser", "transmission", "bad-word"];
    const picked = core.chooseWord(words, {
        wave: 1,
        modeId: "ace",
        activeWords: ["go"],
        random: () => 0
    });
    assert.equal(picked, "star");
    assert.deepEqual(core.normalizePool(words), ["go", "star", "laser", "transmission"]);
});
