const scrContainers = document.querySelectorAll("[id^='scrContainer'");
const scrNumTitle = document.getElementById("scrNumberTitle");
const nextScrBtn = document.getElementById("nextScrBtn");
const prevScrBtn = document.getElementById("prevScrBtn");
const timeInput = document.getElementById("timeInput");
const timePreviewLbl = document.getElementById("timePreviewLbl");
const root = document.querySelector(":root");

// max = can't be
const maxHours = 2;
const maxMinutes = 60;
const maxSeconds = 60;
const maxMillis = 100;

const showPreviewAttribute = "showPreview";

let activeScr = 0;
const numScr = scrContainers.length;

let lastActive = -1;
function updateActiveScr() {
    activeScr = Math.min(Math.max(activeScr, 0), numScr - 1);

    if (lastActive >= 0)
        scrContainers[lastActive].hidden = true;
    lastActive = activeScr;
    scrContainers[activeScr].hidden = false;

    scrNumTitle.innerText = `${activeScr+1}/${numScr}`;
}

window.onload = () => {
    activeScr = 0;
    prevScrBtn.disabled = true;
    updateActiveScr();
};

nextScrBtn.onclick = () => {
    activeScr += 1;
    updateActiveScr();

    if (activeScr == numScr - 1)
        nextScrBtn.disabled = true;
    prevScrBtn.disabled = false;
};

prevScrBtn.onclick = () => {
    activeScr -= 1;
    updateActiveScr();

    if (activeScr == 0)
        prevScrBtn.disabled = true;
    nextScrBtn.disabled = false;
};


function tryAnalyzeTimes(timeStr) {
    const newTimeStr = timeStr.replaceAll(":", "");

    if (newTimeStr == "" || isNaN(newTimeStr))
        return null;

    const colonParts = timeInput.value.split(":");
    if (colonParts.length > 3)
        return null;

    let numMillis = 0;
    let numSeconds = 0;
    let numMinutes = 0;
    let numHours = 0;

    let hoursStr = "0";
    let minutesStr = "0";
    let secondsStr = "0";
    let millisStr = "0";

    if (colonParts.length == 3) { // hours:minutes:seconds.millis
        hoursStr = colonParts[0];
        minutesStr = colonParts[1] == "" ? "0" : colonParts[1];
        splitMinutesAndMillis(colonParts[2]);
    }
    else if (colonParts.length == 2) { // minutes:seconds.millis
        minutesStr = colonParts[0] == "" ? "0" : colonParts[0];
        splitMinutesAndMillis(colonParts[1])
    }
    else { // seconds.millis OR millis
        const dotSplit = timeInput.value.split('.');
        if (dotSplit.length > 2) { // invalid
            hidePreview();
            return;
        }
        else if (dotSplit.length == 2) // seconds.millis
            splitMinutesAndMillis(timeInput.value);
        else { // [hours][minutes][seconds][millis] - HMMSSMM
            const maxLen = 1 + 2 + 2 + 2; // =7
            const paddedStr = timeInput.value.padStart(maxLen, "0");

            hoursStr =      paddedStr[0];
            minutesStr =    paddedStr[1] + paddedStr[2];
            secondsStr =    paddedStr[3] + paddedStr[4];
            millisStr =     paddedStr[5] + paddedStr[6];
        }
    }

    // Convert
    if (isNaN(millisStr) || isNaN(secondsStr) || isNaN(minutesStr) || isNaN(hoursStr))
        return null;
    
    numMillis = parseFloat(millisStr);
    if (numMillis % 1 != 0) return null;

    numSeconds = parseFloat(secondsStr) + Math.floor(numMillis >= maxMillis ? numMillis / maxMillis : 0);
    if (numSeconds % 1 != 0) return null;

    numMillis %= maxMillis;
    numMinutes = parseFloat(minutesStr) + Math.floor(numSeconds >= maxSeconds ? numSeconds / maxSeconds : 0);
    if (numMinutes % 1 != 0) return null;

    numSeconds %= maxSeconds;
    numHours = parseFloat(hoursStr) + Math.floor(numMinutes >= maxMinutes ? numMinutes / maxMinutes : 0);
    if (numHours % 1 != 0) return null;

    numMinutes %= 60;

    // console.log(`hours:${numHours}, minutes:${numMinutes}, seconds:${numSeconds}, millis:${numMillis}`);

    if (numHours >= maxHours
        || (numHours == 0 && numMinutes == 0 && numSeconds == 0 && numMillis == 0)
        || numHours < 0 || numMinutes < 0 || numSeconds < 0 || numMillis < 0) {
        return null;
    }

    return { numHours: numHours, numMinutes: numMinutes, numSeconds: numSeconds, numMillis: numMillis };


    function splitMinutesAndMillis(str) {
        const dotParts = str.split(".");
        if (dotParts.length > 2)  {
            hidePreview();
            return;
        }
        if (dotParts.length == 2)
            millisStr = dotParts[1].substring(0, 2).padEnd(2, "0");
        secondsStr = dotParts[0] == "" ? "0" : dotParts[0];
    }
}

function displayTimes(timesObj) {
    const { numHours, numMinutes, numSeconds, numMillis } = timesObj;

    const hoursText = numHours > 0 ? numHours + ":" : "";
    const minutesText = numMinutes > 0 ? (hoursText != "" ? formatNumToString(numMinutes) : numMinutes) + ":" : (hoursText != "" ? "00:" : "");
    const secondsText = numSeconds > 0 ? (minutesText != "" ? formatNumToString(numSeconds) : numSeconds) : (minutesText != "" ? "00" : "0");
    const millisText = formatNumToString(numMillis);

    const displayTime = `${hoursText}${minutesText}${secondsText}.${millisText}`;
    timePreviewLbl.innerText = displayTime;

    function formatNumToString(num) {
        return num.toString().padStart(2, "0");
    }
}

timeInput.oninput = () => {
    // timeInput.value = timeInput.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    const timesObj = tryAnalyzeTimes(timeInput.value);

    if (timesObj == null) {
        hidePreview();
        return;
    }

    displayTimes(timesObj);
    showPreview();
    
    function hidePreview() {
        timePreviewLbl.removeAttribute("showPreview");
    }

    function showPreview() {
        timePreviewLbl.setAttribute("showPreview", true);
    }
};
