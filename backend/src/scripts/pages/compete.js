import {
    tryAnalyzeTimes,
    getDisplayTime,
    getTimesObjStr,
    packTimes,
    unpackTimes,
    equalTimes,
    isFullTimesArr,
    Penalties
  } from '/src/scripts/backend/utils/timesUtils.js';

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
const submitSpinner = document.getElementById("submitSpinner");
const inputAndPenaltyContainer = document.getElementById("inputAndPenaltyContainer");
const previewAndSubmitContainer = document.getElementById("previewAndSubmitContainer");
const menuAndPanelContainer = document.getElementById("menuAndPanelContainer");
const menuAndPanelSpinner = document.getElementById("menuAndPanelSpinner");
const root = document.querySelector(":root");

const showPreviewAttribute = "showPreview";
const canEditAttribute = "canEdit";

let activeScr = 0;
const numScr = scrContainers.length;

let lastActive = -1;
function updateActiveScr() {
    activeScr = Math.min(Math.max(activeScr, 0), numScr - 1);
    if (activeScr == lastActive) return;

    if (lastActive >= 0) {
        scrContainers[lastActive].setAttribute("hidden", true);
        scrMenuItemContainers[lastActive].removeAttribute("active");

        if (validTime)
            allTimes[lastActive].timeStr = timeInput.value;
    }

    lastActive = activeScr;

    currTimesObj = allTimes[activeScr].timesObj;
    scrContainers[activeScr].removeAttribute("hidden");
    timeInput.value = allTimes[activeScr].timeStr;
    timePreviewLbl.innerText = allTimes[activeScr].previewStr;
    
    // don't show "active" if you can't edit
    if (limitations.canEdit)
        scrMenuItemContainers[activeScr].setAttribute("active", true);

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

function normalizeSizes() {
    const timeout = 5;
    const lowerMin = 5;
    const upperMax = 45;
    const threshold = 25;
    const c = scrContainers[activeScr];
    const svgEl = c.getElementsByTagName("svg")[0];
    
    const currWidth = svgEl.getAttribute("width");
    const currHeight = svgEl.getAttribute("height");
    if (!vbInit[activeScr]) {
        svgEl.setAttribute("viewBox", `0 0 ${currWidth} ${currHeight}`);
        vbInit[activeScr] = true;
    }
    
    const newWidth = scrContainers[activeScr].clientWidth * (widthModifier / 100);
    svgEl.setAttribute("width", newWidth);
    const newHeight = currHeight * newWidth / currWidth;
    svgEl.setAttribute("height", newHeight);
    
    const textEl = c.getElementsByTagName("p")[0];
    
    setTimeout(async () => {
        textEl.style.fontSize = lowerMin;
        // let boundsObj = {lowerBound: 0, upperBound: 0};
        let { lowerBound, upperBound } = await findFontSizeBounds(textEl, lowerMin, newHeight);
        await optimizeFontSize(textEl, lowerBound, upperBound, newHeight);
    }, timeout);

    async function optimizeFontSize(textEl, lowerBound, upperBound, maxHeight, k = 0) {
        const maxIter = 50;
        if (k >= maxIter || Math.abs(maxHeight - textEl.clientHeight) <= threshold) {
            scramblesSized[activeScr] = true;
            return;
        }

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

const userData = { userId: -1 };
const limitations = { canEdit: true };
// time structure: { previewStr: str, timeStr: str, timesObj: [timesObj], penalty: 0|1|2 }  (penalty: 0=nothing, 1=+2, 2=dnf)
let allTimes = [];
onPageLoad(async () => {
    const wcaMe = await getWcaMe(true);
    if (!wcaMe) {
        window.location = "/scrambles";
        return;
    }

    userData.userId = wcaMe.id;
    Object.freeze(userData);  // cannot be changed

    const headers = { };
    headers[userIdHeader] = userData.userId;
    headers[eventIdHeader] = eventId;
    const timesRes = await sendRequest("/retrieveTimes", { headers: headers });
    if (timesRes.error) {
        throwError("בעיה בטעינת זמנים מהשרת");
        return;
    }

    console.log("packed", timesRes);
    allTimes = unpackTimes(timesRes);

    if (allTimes[numScr - 1].timesObj != null) {
        limitations.canEdit = false;

        // hide edit ability
        inputAndPenaltyContainer.removeAttribute(canEditAttribute);
        previewAndSubmitContainer.removeAttribute(canEditAttribute);
        console.log(inputAndPenaltyContainer);
        // inputAndPenaltyContainer.style.display = "none";
        // submitTimeBtn.style.display = "none";
        // previewAndSubmitContainer.style.margin = "auto";
    }

    setLoadingState(false);

    for (let i = 0; i < scrContainers.length; i++) {
        scramblesSized.push(false);
        vbInit.push(false);

        // scramble menu
        scrMenuItemContainers[i].onclick = async () => {
            if (activeScr == i) return;

            if (validTime && (!equalTimes(allTimes[activeScr].timesObj, currTimesObj) || allTimes[activeScr].penalty != getCurrPenalty()))
                await submitTime();

            activeScr = i;
            updateActiveScr();
        };

        if (i != 0)
            scrMenuItemContainers[i].setAttribute("disabled", "true");
    }

    // TODO: do this for blind events - make a "hideImage" things
    // if (eventId == "3bld") {
    //     // console.log(scrContainers[i].getElementsByClassName("Scramble-Img")[0]);
    //     scrContainers[0].getElementsByTagName("svg")[0].setAttribute("width", "0");
    //     scrContainers[0].getElementsByTagName("svg")[0].setAttribute("height", "0");
    // }

    activeScr = 0;
    prevScrBtn.disabled = true;
    updateActiveScr();
    updatePreviewLabel();

    // Normalize all sizes and load saved times
    let lastSaved;
    for (let i = 0; i < allTimes.length; i++) {
        lastSaved = i;
        while (!scramblesSized[i])
            await new Promise(r => setTimeout(r, 1));

        if (allTimes[i].timesObj == null)
            break;
        
        await submitTime(false);
        nextScramble();
    }

    // load all scrambles
    nextScramble(false);
    for (let i = lastSaved+1; i < scrContainers.length; i++) {
        while (!scramblesSized[i])
            await new Promise(r => setTimeout(r, 1));
        
        if (i < scrContainers.length - 1)
            nextScramble(false);
    }
    
    activeScr = lastSaved;
    updateActiveScr();
    
    menuAndPanelContainer.setAttribute("hide", false);
    menuAndPanelSpinner.hidden = true;
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
    if (!limitations.canEdit)
        return;

    validTime = false;
    timePreviewLbl.removeAttribute(showPreviewAttribute);
    submitTimeBtn.disabled = true;
    dnfBtn.disabled = true;
    dnfState = false;

    if (!hidePlus2) return;
    plus2Btn.disabled = true;
    plus2State = false;
}

function showPreview() {
    validTime = true;
    timePreviewLbl.setAttribute(showPreviewAttribute, true);
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

function getCurrPenalty() {
    return dnfState ? Penalties.DNF : (plus2State ? Penalties.Plus2 : Penalties.None);
}

// interactionState - can the user interact with the elements
let _interactionState = true;
function setInteractionState(value, updateSpinner = false, returnPreview = false) {
    timeInput.disabled = !value;
    if (updateSpinner) {
        const hidden = !(submitSpinner.hidden = value);
        previewAndSubmitContainer.setAttribute("hide", hidden);
        inputAndPenaltyContainer.setAttribute("hide", hidden);
    }
    if (!value) hidePreview();
    else if (returnPreview) showPreview();
}
function getInteractionState() {
    return _interactionState;   
}

async function submitTime(uploadData = true) {
    if (!validTime || (uploadData && equalTimes(allTimes[activeScr].timesObj, currTimesObj) && allTimes[activeScr].penalty == getCurrPenalty())) return;
    if (limitations.canEdit && activeScr == numScr - 1) {
        // TODO: Warn the user they won't be able to edit their times if they submit
        if (!confirm("You will not be able to edit the results later if you submit now."))
            return;
    }

    updateTimeInMenu(activeScr, timePreviewLbl.innerText, timeInput.value, currTimesObj, getCurrPenalty()); 
    setInteractionState(false, true);
    
    if (uploadData) {
        const wcaMeData = await getWcaMe(true);
        if (!wcaMeData) {
            throwError("WCA אינך מחובר לחשבון");
            return;
        }
    
        const headers = { };
        headers[userIdHeader] = userData.userId;
        headers[eventIdHeader] = eventId;
        headers[timesHeader] = JSON.stringify(packTimes(allTimes));
        const res = await sendRequest("/updateTimes", { headers: headers });
        if (res.error) {
            throwError("בעיה בשמירת התוצאות");
            return;
        }
        console.log(res);
    }

    if (limitations.canEdit && activeScr == numScr - 1) {
        window.location = window.location;
        return;
    }
    
    scrMenuItemContainers[activeScr].setAttribute("done", true);
    setInteractionState(true, true);
}

// go to the next scramble
function nextScramble(removeDisabled = true) {
    activeScr += 1;
    updateActiveScr();
    if (removeDisabled)
        scrMenuItemContainers[activeScr].removeAttribute("disabled");
    timeInput.focus();
}

dnfBtn.onclick = () => setDnfState(!dnfState);
plus2Btn.onclick = () => setPlus2State(!plus2State);
submitTimeBtn.onclick = async () => {
    await submitTime();
    nextScramble();
};

// Submit using keyboard key
window.onkeydown = (event) => {
    const submitKeyCode = 13; // enter

    if (event.keyCode == submitKeyCode && timeInput === document.activeElement)
        submitTimeBtn.click();
};

// TODO: on leave site, save the results
