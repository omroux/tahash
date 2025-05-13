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


const isFMC = eventId == "fmc";

const emptyElement = document.createElement("div");
const scrsContainer = document.getElementById("scrsContainer");
const scrContainers = document.querySelectorAll("[id^='scrContainer'");
const scrImages = document.querySelectorAll("[id^='scrImg'");
const scrMenuItemContainers = document.querySelectorAll("[id^='scrMenuItemContainer'");
const scrMenuItemTimes = document.querySelectorAll("[id^='scrMenuItemTime'");
const scrNumTitle = document.getElementById("scrNumberTitle");
const nextScrBtn = document.getElementById("nextScrBtn");
const prevScrBtn = document.getElementById("prevScrBtn");
const timeInput = isFMC ? emptyElement : document.getElementById("timeInput");
const timePreviewLbl = document.getElementById("timePreviewLbl");
const plus2Btn = isFMC ? emptyElement : document.getElementById("plus2Btn");
const dnfBtn = isFMC ? emptyElement : document.getElementById("dnfBtn");
const submitTimeBtn = document.getElementById("submitTimeBtn");
const submitSpinner = document.getElementById("submitSpinner");
const inputAndPenaltyContainer = document.getElementById(isFMC ? "checkSolutionContainer" : "inputAndPenaltyContainer");
const previewAndSubmitContainer = document.getElementById(isFMC ? "fmcSubmitContainer" : "previewAndSubmitContainer");
const menuAndPanelContainer = document.getElementById("menuAndPanelContainer");
const menuAndPanelSpinner = document.getElementById("menuAndPanelSpinner");
const root = document.querySelector(":root");

// fmc elements
const checkSolutionBtn = isFMC ? document.getElementById("checkSolutionButton") : null;
const solutionInputField = isFMC ? document.getElementById("solutionInputField") : null;
const solutionPreviewLbl = isFMC ? document.getElementById("solutionPreviewLbl") : null;
const fmcSolutionErrorLbl = isFMC ? document.getElementById("fmcSolutionErrorLbl") : null;

const showPreviewAttribute = "showPreview";
const canEditAttribute = "canEdit";
const hiddenAttribute = "hidden";
const changedAttribute = "changed";

// fmc input
if (isFMC) {
    inputAndPenaltyContainer.setAttribute(canEditAttribute, "");
    previewAndSubmitContainer.setAttribute(canEditAttribute, "");
}

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
    scrMenuItemContainers[activeScr].setAttribute("active", true);

    if (isFMC) {
        const fmcSolution = (allTimes[activeScr].extraArgs.fmcSolution) ?? "";
        solutionInputField.value = fmcSolution.join(" ");
    }
    else {
        timeInput.value = allTimes[activeScr].timeStr;
        timePreviewLbl.innerText = allTimes[activeScr].previewStr;
    }

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

const hideImageEvents = Object.freeze(["3bld", "4bld", "5bld", "mbld"]);
let _templateSVG;

function normalizeSizes() {
    const timeout = 1;
    const lowerMin = 5;
    const upperMax = 45;
    const threshold = 25;
    const c = scrContainers[activeScr];

    let newHeight;
    if (!_templateSVG) {
        const svgEl = c.getElementsByTagName("svg")[0];
        
        const currWidth = svgEl.getAttribute("width");
        const currHeight = svgEl.getAttribute("height");
        if (!vbInit[activeScr]) {
            svgEl.setAttribute("viewBox", `0 0 ${currWidth} ${currHeight}`);
            vbInit[activeScr] = true;
        }
        
        const newWidth = scrContainers[activeScr].clientWidth * (widthModifier / 100);
        svgEl.setAttribute("width", newWidth);
        newHeight = currHeight * newWidth / currWidth;
        svgEl.setAttribute("height", newHeight);
    }
    else
        newHeight = _templateSVG.clientHeight;
    
    
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

    // update canEdit limitation
    if (allTimes[numScr - 1].timesObj != null) {
        limitations.canEdit = false;

        // hide edit ability
        inputAndPenaltyContainer.removeAttribute(canEditAttribute);
        previewAndSubmitContainer.removeAttribute(canEditAttribute);

        for (let i = 0; i < numScr; i++)
            scrMenuItemContainers[i].removeAttribute(canEditAttribute);
    }

    setLoadingState(false);

    if (hideImageEvents.includes(eventId)) {
        _templateSVG = document.createElement("svg");
        // generate an empty image for the right image size
        _templateSVG = await cstimerWorker.getImage("", scrType);
    }
    else {
        for (let i = 0; i < numScr; i++) {
            const img = await cstimerWorker.getImage(scrambles[i], scrType);
            scrImages[i].innerHTML = img;
        }
    }

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

    activeScr = 0;
    prevScrBtn.disabled = true;
    updateActiveScr();

    if (!isFMC)
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
    normalizeSizes();
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

// save a time inside the allTimes object
function saveTime(index, previewStr, timeStr, timesObj, penalty, extraArgs = null) {
    allTimes[index].previewStr = previewStr;
    allTimes[index].timeStr = timeStr;
    allTimes[index].timesObj = timesObj;
    allTimes[index].penalty = penalty;
    allTimes[index].extraArgs = extraArgs;
}

function updateTimeInMenu(index, previewStr) {
    scrMenuItemTimes[index].innerText = previewStr;
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
    if (!isFMC && (!validTime || (uploadData && equalTimes(allTimes[activeScr].timesObj, currTimesObj) && allTimes[activeScr].penalty == getCurrPenalty()))) return;
    if (limitations.canEdit && activeScr == numScr - 1) {
        // TODO: Warn the user they won't be able to edit their times if they submit
        if (!confirm("You will not be able to edit the results later if you submit now."))
            return;
    }

    // save the time
    saveTime(activeScr, timePreviewLbl.innerText, timeInput.value, currTimesObj, getCurrPenalty());
    updateTimeInMenu(activeScr, timePreviewLbl.innerText);
    
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

// FMC check solution
let _validSolution = false;
if (isFMC) {
    // returns whether the solution solves the scramble
    function checkSolution(solutionTxt) {
        setInteractionState(false, true);
        
        const cube = new Cube();
        
        const scrambleTxt = scrambles[activeScr];
        cube.move(scrambleTxt);

        const wideMovesRGX = /\b([RULFDB])w\b/g;
        solutionTxt = solutionTxt = solutionTxt.replace(wideMovesRGX, (_, face) => face.toLowerCase());
        cube.move(solutionTxt);

        setInteractionState(true, true);

        return cube.isSolved();
    }

    // returns the solution as an array of strings (moves)
    function parseSolution(txt) {
        const solution = [];

        const whitespaceRGX = /\s/;
        const faceMoveRGX = /[RUFLDB]/i;
        const rotationRGX = /[XYZ]/i;

        const wideMove = 'w';
        const doubleMove = '2';
        const primeMove = '\'';

        txt = " " + txt + " ";
        for (let i = 0; i < txt.length - 1; i++) {
            if (whitespaceRGX.test(txt[i])) continue; // skip whitespace

            let newMove = "";

            const isFaceMove = faceMoveRGX.test(txt[i]);
            const isRotation = rotationRGX.test(txt[i]);
            if (!isFaceMove && !isRotation) {
                for (i++; !whitespaceRGX.test(txt[i]); i++); // skip garbage
                i--;
                continue;
            }
            
            newMove += isFaceMove ? txt[i].toUpperCase() : txt[i].toLowerCase();
            i++; // next character

            // wide move
            if (!isRotation && txt[i] == wideMove) {
                newMove += wideMove;
                i++;
            }

            // double move
            if (txt[i] == doubleMove) {
                newMove += doubleMove;
                i++;
            }
            else if (txt[i] == primeMove) {
                newMove += primeMove;
                i++;
            }
            else if (!whitespaceRGX.test(txt[i])) { // garbage
                for (i++; !whitespaceRGX.test(txt[i]); i++); // skip garbage
                i--;
                continue;
            }

            
            // the move is only valid if there's a whitespace after it
            if (whitespaceRGX.test(txt[i])) {
                solution.push(newMove);
                i--; // rollback whitespace
            }
        }

        return solution;
    }

    let _changeSinceCheck = false;
    checkSolutionBtn.onclick = async () => {
        if (!_changeSinceCheck)
            return _validSolution;

        _changeSinceCheck = false;
        solutionPreviewLbl.removeAttribute(changedAttribute);
        fmcSolutionErrorLbl.removeAttribute(changedAttribute);

        fmcSolutionErrorLbl.innerText = "";
        checkSolutionBtn.disabled = true;
        solutionInputField.disabled = true;

        const solutionArr = parseSolution(solutionInputField.value);
        console.log(solutionArr);
        const solutionTxt = solutionPreviewLbl.innerText = solutionArr.join("\t");

        console.log(_validSolution = checkSolution(solutionTxt));

        if (_validSolution) previewAndSubmitContainer.removeAttribute(hiddenAttribute);
        else fmcSolutionErrorLbl.innerText = "הפתרון שהוקלד לא פותר את הערבוב! יש לוודא שהפתרון הוקלד נכון.";

        solutionInputField.disabled = false;
    };

    solutionInputField.addEventListener("input", () => {
        _changeSinceCheck = true;
        fmcSolutionErrorLbl.setAttribute(changedAttribute, "");
        solutionPreviewLbl.setAttribute(changedAttribute, "");
        previewAndSubmitContainer.setAttribute(hiddenAttribute, "");

        checkSolutionBtn.disabled = solutionInputField.value.length == 0;
    });

}


// TODO: on leave site, save the results
