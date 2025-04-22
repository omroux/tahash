const scrContainers = document.querySelectorAll("[id^='scrContainer'");
const scrMenuItemContainers = document.querySelectorAll("[id^='scrMenuItemContainer'");
const scrMenuItemTimes = document.querySelectorAll("[id^='scrMenuItemTime'");
const scrNumTitle = document.getElementById("scrNumberTitle");
const nextScrBtn = document.getElementById("nextScrBtn");
const prevScrBtn = document.getElementById("prevScrBtn");
const timeInput = document.getElementById("timeInput");
const timePreviewLbl = document.getElementById("timePreviewLbl");
const plus2Btn = document.getElementById("plus2Btn");
const dnfBtn = document.getElementById("dnfBtn");
const submitTimeBtn = document.getElementById("submitTimeBtn");
const root = document.querySelector(":root");

// max = can't be
const maxHours = 2;
const maxMinutes = 60;
const maxSeconds = 60;
const maxMillis = 100;
const maxLen = (maxHours-1).toString().length + (maxMinutes-1).toString().length + (maxSeconds-1).toString().length + (maxMillis-1).toString().length;
//              = 1 + 2 + 2 + 2 = 7

const showPreviewAttribute = "showPreview";

let activeScr = 0;
const numScr = scrContainers.length;

const Penalties = Object.freeze({
    None: 0,
    Plus2: 1,
    DNF: 2
});

let lastActive = -1;
function updateActiveScr() {
    activeScr = Math.min(Math.max(activeScr, 0), numScr - 1);
    if (activeScr == lastActive) return;

    if (lastActive >= 0) {
        scrContainers[lastActive].setAttribute("hidden", true);
        scrMenuItemContainers[lastActive].removeAttribute("active");
    }

    lastActive = activeScr;

    scrContainers[activeScr].removeAttribute("hidden");
    scrMenuItemContainers[activeScr].setAttribute("active", true);
    timeInput.value = allTimes[activeScr].timeStr;
    timePreviewLbl.innerText = allTimes[activeScr].previewStr;
    // load penalty
    if (allTimes[activeScr].penalty == Penalties.DNF) setDnfState(true);
    else {
        setDnfState(false);
        if (allTimes[activeScr].penalty == Penalties.Plus2) setPlus2State(true);
        else {
            setPlus2State(false);
        }
    }

    if (!scramblesSized[activeScr])
        normalizeSizes();

    scrNumTitle.innerText = `${activeScr+1}/${numScr}`;
    submitTimeBtn.innerText = activeScr >= numScr - 1 ? "הגש מקצה" : "הבא";
}

let scramblesSized = [];
let vbInit = [];

const widthModifier = eventId == "megaminx" || eventId == "777" ? 35
                    : eventId == "666" ? 30
                    : 25;
const timeout = 0;
const lowerMin = 5;
const upperMax = 45;
function normalizeSizes() {
    const threshold = 25;
    for (let i = 0; i < scrContainers.length; i++) {
        if (scrContainers[i].hidden || scramblesSized[i]) continue;
        scramblesSized[i] = true;

        const c = scrContainers[i];
        const svgEl = c.getElementsByTagName("svg")[0];
        
        const currWidth = svgEl.getAttribute("width");
        const currHeight = svgEl.getAttribute("height");
        if (!vbInit[i]) {
            svgEl.setAttribute("viewBox", `0 0 ${currWidth} ${currHeight}`);
            vbInit[i] = true;
        }
        
        const newWidth = scrContainers[i].clientWidth * (widthModifier / 100);
        svgEl.setAttribute("width", newWidth);
        const newHeight = currHeight * newWidth / currWidth;
        svgEl.setAttribute("height", newHeight);
        
        textEl = c.getElementsByTagName("p")[0];
        
        setTimeout(async () => {
            textEl.style.fontSize = lowerMin;
            // let boundsObj = {lowerBound: 0, upperBound: 0};
            let { lowerBound, upperBound } = await findFontSizeBounds(textEl, lowerMin, newHeight);
            await optimizeFontSize(textEl, lowerBound, upperBound, newHeight);
        }, timeout);
    }

    async function optimizeFontSize(textEl, lowerBound, upperBound, maxHeight, k = 0) {
        const maxIter = 50;
        if (k >= maxIter || Math.abs(maxHeight - textEl.clientHeight) <= threshold)
            return;

        const mid = (lowerBound + upperBound) / 2;
        textEl.style.fontSize = mid;

        await new Promise(r => setTimeout(r, timeout));

        if (maxHeight > textEl.clientHeight) lowerBound = mid;
        else    upperBound = mid;

        await optimizeFontSize(textEl, lowerBound, upperBound, maxHeight, k+1);
    }

    async function findFontSizeBounds(textEl, currFontSize, maxHeight) {
        const delta = 10;

        if (currFontSize > upperMax)
            return { lowerBound: upperMax - delta, upperBound: upperMax };

        if (textEl.clientHeight > maxHeight) {
            if (currFontSize - delta < lowerMin)
                return { lowerBound: lowerMin, upperBound: lowerMin + delta };

            return { lowerBound: currFontSize - delta, upperBound: currFontSize };
        }

        textEl.style.fontSize = (currFontSize + delta) + "px";

        await new Promise(r => setTimeout(r, timeout));
        return await findFontSizeBounds(textEl, currFontSize + delta, maxHeight);
    }

    function getStyle(el) {
        return window.getComputedStyle(el);
    }

    function getFontSize(textEl) {
        return parseFloat(window.getComputedStyle(textEl).fontSize.replace("px", ""));
    }

    function nextLoop() {
        if (Math.abs(textEl.clientHeight - newHeight) <= threshold) return;
        
        const mid = (lowerBound + upperBound) / 2;
        console.log("nextLoop: lowerBound", lowerBound, "upperBound", upperBound, "mid", mid);
        textEl.style.fontSize = mid;
        if (newHeight > textEl.clientHeight) lowerBound = mid;
        else    upperBound = mid;

        setTimeout(nextLoop, timeout);
    }

    function findUpperBound() {
        console.log("finding upper");
        if (textEl.clientHeight > newHeight) {
            upperBound = getFontSize(textEl);
            console.log("textEl.clientHeight", textEl.clientHeight, "newHeight", newHeight, "upperBound", upperBound);
            nextLoop();
            return;
        }

        textEl.style.fontSize = `${getFontSize(textEl) + 10}px`;

        setTimeout(findUpperBound, timeout);
    }
}

// time structure: { previewStr: str, timeStr: str, timeObj: [timeObj], penalty: 0|1|2 }  (penalty: 0=nothing, 1=+2, 2=dnf)
let allTimes = [];
onPageLoad(() => {
    if (!isLoggedIn()) {
        window.location = "/login";
        return;
    }

    for (let i = 0; i < scrContainers.length; i++) {
        scramblesSized.push(false);
        vbInit.push(false);
        allTimes.push({ previewStr: "-", timeStr: "", timeObj: null, penalty: 0 });

        // scramble menu
        scrMenuItemContainers[i].onclick = () => {
            activeScr = i;
            updateActiveScr();
        };
        if (i != 0)
            scrMenuItemContainers[i].setAttribute("disabled", "true");
    }

    normalizeSizes(true);

    // TODO: do this for blind events - make a "hideImage" things
    // if (eventId == "3bld") {
    //     // console.log(scrContainers[i].getElementsByClassName("Scramble-Img")[0]);
    //     scrContainers[0].getElementsByTagName("svg")[0].setAttribute("width", "0");
    //     scrContainers[0].getElementsByTagName("svg")[0].setAttribute("height", "0");
    // }

    activeScr = 0;
    prevScrBtn.disabled = true;
    updateActiveScr();
    hidePreview();
});

window.onresize = () => {
    for (let i = 0; i < scrContainers.length; i++)
        scramblesSized[i] = false;
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
    timeStr = timeStr.trim();
    const noColons = timeStr.replaceAll(":", "");

    if (noColons == "" || isNaN(noColons))
        return null;

    const colonParts = timeStr.split(":");
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
        const dotSplit = timeStr.split('.');
        if (dotSplit.length > 2) // invalid
            return null;
        else if (dotSplit.length == 2) // seconds.millis
            splitMinutesAndMillis(timeStr);
        else { // [hours][minutes][seconds][millis] - HMMSSMM
            if (timeStr.length > maxLen)
                return null;

            const paddedStr = timeStr.padStart(maxLen, "0");

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

function getDisplayTime(timesObj) {
    if (timesObj == null)
        return "-";

    const { numHours, numMinutes, numSeconds, numMillis } = timesObj;

    const hoursText = numHours > 0 ? numHours + ":" : "";
    const minutesText = numMinutes > 0 ? (hoursText != "" ? formatNumToString(numMinutes) : numMinutes) + ":" : (hoursText != "" ? "00:" : "");
    const secondsText = numSeconds > 0 ? (minutesText != "" ? formatNumToString(numSeconds) : numSeconds) : (minutesText != "" ? "00" : "0");
    const millisText = formatNumToString(numMillis);

    return `${hoursText}${minutesText}${secondsText}.${millisText}`;

    function formatNumToString(num) {
        return num.toString().padStart(2, "0");
    }
}

// getTimesObjStr: convert a valid times obj (with an optional penalty) to the respective str
function getTimesObjStr(timesObj, penalty = Penalties.None) {
    if (!timesObj) return "-";

    let dispTimeObj = Object.assign({}, timesObj);
    if (penalty == Penalties.Plus2) {
        dispTimeObj.numSeconds += 2;
        dispTimeObj.numMinutes += Math.floor(dispTimeObj.numSeconds / maxSeconds);
        dispTimeObj.numSeconds %= maxSeconds;
        dispTimeObj.numHours += Math.floor(dispTimeObj.numMinutes / maxMinutes);
        dispTimeObj.numMinutes %= maxMinutes;
        if (dispTimeObj.numHours >= maxHours) {
            hidePreview(false);
            return;
        }
    }

    return (penalty == Penalties.DNF) ? "DNF" : (getDisplayTime(dispTimeObj) + (penalty == Penalties.Plus2 ? "+" : ""));
}

timeInput.oninput = () => {
    setDnfState(false);
    setPlus2State(false);
    updatePreviewLabel();
}

let currTimesObj = null;
let validTime = false;
function updatePreviewLabel() {
    currTimesObj = tryAnalyzeTimes(timeInput.value);

    if (currTimesObj == null) {
        hidePreview();
        return;
    }

    timePreviewLbl.innerText = getTimesObjStr(currTimesObj, dnfState ? Penalties.DNF : (plus2State ? Penalties.Plus2 : Penalties.None));

    showPreview();
}

function hidePreview(hidePlus2 = true) {
    validTime = false;
    timePreviewLbl.removeAttribute("showPreview");
    submitTimeBtn.disabled = true;
    dnfBtn.disabled = true;
    dnfState = false;

    if (!hidePlus2) return;
    plus2Btn.disabled = true;
    plus2State = false;
}

function showPreview() {
    validTime = true;
    timePreviewLbl.setAttribute("showPreview", true);
    submitTimeBtn.disabled = false;
    dnfBtn.disabled = false;
    plus2Btn.disabled = dnfState;
}

let dnfState = false, plus2State = false;
function setDnfState(newState) {
    dnfState = newState;
    dnfBtn.setAttribute("selected", newState.toString());

    if (dnfState) setPlus2State(false);
    else updatePreviewLabel();
}

function setPlus2State(newState) {
    plus2State = newState;
    plus2Btn.setAttribute("selected", newState.toString());
    updatePreviewLabel();
}

function updateTimeInMenu(index, previewStr, timeStr, timesObj, penalty) {
    allTimes[index].previewStr = previewStr;
    allTimes[index].timeStr = timeStr;
    allTimes[index].timesObj = timesObj;
    allTimes[index].penalty = penalty;

    scrMenuItemTimes[activeScr].innerText = previewStr;
}

dnfBtn.onclick = () => setDnfState(!dnfState);
plus2Btn.onclick = () => setPlus2State(!plus2State);
submitTimeBtn.onclick = () => {
    if (!validTime) return;

    updateTimeInMenu(activeScr, timePreviewLbl.innerText, timeInput.value, currTimesObj, dnfState ? Penalties.DNF : (plus2State ? Penalties.Plus2 : Penalties.None)); 
    
    if (activeScr >= numScr - 1) {
        setLoadingState(true);
        (async () => {
            const wcaMeData = await getWcaMe();
            if (!wcaMeData) {
                window.location = "/error";
                return;
            }

            setLoadingState(false);
            const res = await sendRequest("/updateTimes", { userId: wcaMeData.id, eventId: eventId, allTimes: allTimes });
            if (res.error) {
                window.location = "/error";
                return;
            }

            window.location = "/scrambles";
        })();
        return;
    }
    
    scrMenuItemContainers[activeScr].setAttribute("done", true);
    
    activeScr += 1;
    updateActiveScr();
    scrMenuItemContainers[activeScr].removeAttribute("disabled");
};

// Submit using keyboard key
window.onkeydown = (event) => {
    const submitKeyCode = 13; // enter

    if (event.keyCode == submitKeyCode)
        submitTimeBtn.click()
};
