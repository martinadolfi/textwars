startVelocity=3000;
velocity = startVelocity;
startWordInterval = 3000;
wordInterval = startWordInterval;
moveDistance = 30;
moveDistancePx="+=" + moveDistance + "px";
vLimit = 600;
hLimit = 600;
finishWords = [13,32]
wordCount = wordList.length
currentScore = 0;
running = true;
var myTimer,wordTimer

function initSizes(){
    hLimit=$(".gameScreen").width();
    vLimit=$(".gameScreen").height();
}

function moveDown(){
    $( ".word" ).animate({'top': moveDistancePx});
    checkPosition();
}

function checkPosition(){
    $( ".word" ).each( function( index, element ){
        if ( parseInt($( this ).css('top').replace("px")) > vLimit ) {
            running = false;
            clearTimeout(myTimer);
            clearTimeout(wordTimer);
            $(".gameScreen").css('background-color', 'red');
        }
    });
}

function getScoreFromWord(word){
    return word.length;
};

function keyPressed(box,event){
    if ( finishWords.includes(event.which) )  {
        currentWord=box.val().toLowerCase();
        $( ".word" ).each(function (){
            if ( $(this)[0].innerText == currentWord ) {
                $(this).fadeOut(function(){$(this)[0].remove()});
                currentScore+=getScoreFromWord(currentWord)
                $( "#currentScore" ).text(currentScore);
                return false;
            }
        });
        box.val('');
    } else {
        currentWord=box.val() + String.fromCharCode(event.which);
    }
}
function createOneWord(){
    jQuery('<div class="word" style="left:'+ (Math.round(Math.random()*(80))+10)+'%">'+ wordList[Math.round(Math.random()*wordCount)]+'</div>').appendTo('#gameScreen');
}

function ramper(){
    if (running) {
        myTimer = setTimeout(function(){
            moveDown();
            ramper();
        },startVelocity-(currentScore*10));
    }
}

function creator(){
    if (running) {
        wordTimer = setTimeout(function(){
            createOneWord();
            creator();
        },startWordInterval-(currentScore*5));
    }
}

$(document).ready(function(){
    initSizes();
    $( "#myInput" ).keypress(function(event){
        if ( finishWords.includes(event.which) ) {
            event.preventDefault();
         }       
        if ( running ){ keyPressed ($(this),event )} ;
    })
    ramper();
    creator();
    // Force focus on textbox
    $( ".gameScreen" ).click(function(){
        $("#myInput").focus();
    })
});

