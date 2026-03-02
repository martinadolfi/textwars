let startVelocity = 2200;
let startWordInterval = 2200;
const moveDistance = 28;
const moveDistancePx = "+=" + moveDistance + "px";
let vLimit = 600;
const finishWords = [13, 32]; // Enter and Space
const maxLives = 3;

let currentScore = 0;
let currentLives = maxLives;
let running = false;
let myTimer;
let wordTimer;

function initSizes() {
    vLimit = $(".gameScreen").height();
}

function getWordPoolSize() {
    return wordList.length - 1;
}

function updateHud() {
    $("#currentScore").text(currentScore);
    $("#currentLives").text(currentLives);
}

function getScoreFromWord(word) {
    return word.length;
}

function randomWord() {
    return wordList[Math.round(Math.random() * getWordPoolSize())];
}

function removeWordAndScore(element) {
    const word = element.innerText;
    $(element).fadeOut(80, function () {
        element.remove();
    });
    currentScore += getScoreFromWord(word);
    updateHud();
}

function loseLife() {
    currentLives -= 1;
    updateHud();

    if (currentLives <= 0) {
        stopGame("#8B0000");
    }
}

function stopGame(backgroundColor) {
    running = false;
    clearTimeout(myTimer);
    clearTimeout(wordTimer);
    $(".gameScreen").css("background-color", backgroundColor || "#8B0000");
    $("#myInput").prop("disabled", true);
}

function moveDown() {
    $(".word").animate({ top: moveDistancePx }, 120, "linear");
    checkPosition();
}

function checkPosition() {
    $(".word").each(function () {
        const top = parseInt($(this).css("top").replace("px", ""), 10);
        if (top > vLimit) {
            this.remove();
            loseLife();
        }
    });
}

function keyPressed(box, event) {
    if (!finishWords.includes(event.which)) {
        return;
    }

    event.preventDefault();
    const currentWord = box.val().trim().toLowerCase();
    if (!currentWord) {
        return;
    }

    let matched = false;
    $(".word").each(function () {
        if ($(this)[0].innerText === currentWord) {
            removeWordAndScore($(this)[0]);
            matched = true;
            return false;
        }
    });

    if (!matched) {
        currentScore = Math.max(0, currentScore - 1);
        updateHud();
    }

    box.val("");
}

function createOneWord() {
    if (!running) {
        return;
    }

    const left = Math.round(Math.random() * 80) + 10;
    jQuery('<div class="word" style="left:' + left + '%">' + randomWord() + "</div>").appendTo("#gameScreen");
}

function ramper() {
    if (running) {
        const nextTick = Math.max(550, startVelocity - currentScore * 14);
        myTimer = setTimeout(function () {
            moveDown();
            ramper();
        }, nextTick);
    }
}

function creator() {
    if (running) {
        const nextWordTick = Math.max(700, startWordInterval - currentScore * 8);
        wordTimer = setTimeout(function () {
            createOneWord();
            creator();
        }, nextWordTick);
    }
}

function resetGame() {
    clearTimeout(myTimer);
    clearTimeout(wordTimer);

    $(".word").remove();
    $(".gameScreen").css("background-color", "#101929");
    $("#myInput").prop("disabled", false).val("").focus();

    currentScore = 0;
    currentLives = maxLives;
    running = true;

    updateHud();
    createOneWord();
    ramper();
    creator();
}

$(document).ready(function () {
    initSizes();

    $("#myInput").keypress(function (event) {
        if (running) {
            keyPressed($(this), event);
        }
    });

    $(".gameScreen").click(function () {
        $("#myInput").focus();
    });

    $("#restartButton").click(function () {
        resetGame();
    });

    $(window).on("resize", initSizes);

    resetGame();
});
