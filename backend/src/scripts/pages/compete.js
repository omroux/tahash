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

// time structure: { previewStr: str, timeStr: str, timesObj: [timesObj], penalty: 0|1|2 }  (penalty: 0=nothing, 1=+2, 2=dnf)
let allTimes = [];
onPageLoad(async () => {
    const wcaMe = await getWcaMe();
    if (!wcaMe) {
        window.location = "/scrambles";
        return;
    }

    for (let i = 0; i < scrContainers.length; i++) {
        scramblesSized.push(false);
        vbInit.push(false);
        allTimes.push({ previewStr: "-", timeStr: "", timesObj: null, penalty: 0 });

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

// interactionState - can the user interact with the elements
// TODO: when interaction state is false, put a low opacity gray rectangle over everything or something
let _interactionState = true;
function setInteractionState(value) {
    timeInput.disabled = !value;
    if (value) hidePreview();
    else showPreview();
}
function getInteractionState() {
    return _interactionState;   
}

const userIdHeader = "user-id";
const eventIdHeader = "event-id";
const timesHeader = "times";
async function submitTime() {
    if (!validTime) return;
    if (activeScr == numScr - 1) {
        // TODO: Warn the user they won't be able to edit their times if they submit
        if (!confirm("You will not be able to edit the results later if you submit now."))
            return;
    }

    setInteractionState(false);

    updateTimeInMenu(activeScr, timePreviewLbl.innerText, timeInput.value, currTimesObj, dnfState ? Penalties.DNF : (plus2State ? Penalties.Plus2 : Penalties.None)); 
    
    const wcaMeData = await getWcaMe(true);
    if (!wcaMeData) {
        // window.location = "/error";
        return;
    }

    const headers = { };
    headers[userIdHeader] = wcaMeData.id;
    headers[eventIdHeader] = eventId;
    headers[timesHeader] = JSON.stringify(packTimes(allTimes));
    const res = await sendRequest("/updateTimes", { headers: headers });
    console.log(res);
    if (res.error) {
        // window.location = "/error";
        return;
    }

    if (activeScr == numScr - 1) {
        window.location = "/scrambles";
        return;
    }
    
    scrMenuItemContainers[activeScr].setAttribute("done", true);
    
    activeScr += 1;
    scrMenuItemContainers[activeScr].removeAttribute("disabled");
    setInteractionState(true);
    updateActiveScr();
}

dnfBtn.onclick = () => setDnfState(!dnfState);
plus2Btn.onclick = () => setPlus2State(!plus2State);
submitTimeBtn.onclick = async () => await submitTime();

// Submit using keyboard key
window.onkeydown = async (event) => {
    const submitKeyCode = 13; // enter

    if (event.keyCode == submitKeyCode && timeInput === document.activeElement) {
        await submitTime();
        timeInput.focus();
    }
};
