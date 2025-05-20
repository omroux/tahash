import {
    tryAnalyzeTimes,
    getDisplayTime,
    getTimesObjStr,
    packTimes,
    unpackTimes,
    equalTimes,
    isFullTimesArr,
    Penalties,
    DNF_STRING
  } from '/src/scripts/backend/utils/timesUtils.js';


const isFMC = eventId == "fmc";
const isMBLD = eventId == "mbld";

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
    // console.log("T perm: ( R U R' U' R' F R2 U' R' U' R U R' F' )");
    // console.log("Initializing solver...");
    // Cube.initSolver();
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

        if (!isFMC && validTime)
            allTimes[lastActive].timeStr = timeInput.value;
    }

    lastActive = activeScr;

    currTimesObj = allTimes[activeScr].timesObj;
    scrContainers[activeScr].removeAttribute("hidden");
    scrMenuItemContainers[activeScr].setAttribute("active", true);

    if (isFMC) {
        fmcSolutionArr = allTimes[activeScr].extraArgs.fmcSolution;
        solutionInputField.value = fmcSolutionArr.join(" ");
        _validSolution = fmcSolutionArr.length > 0;
        updateFMCText();
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
    submitTimeBtn.innerText = activeScr < numScr - 1 ? "הבא" : "הגש מקצה";
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
    console.log(allTimes);
    console.log("numScr:", numScr);

    // update canEdit limitation
    if ((!isFMC && allTimes[numScr - 1].timesObj != null)
        || (isFMC && allTimes[numScr - 1].extraArgs.fmcSolution.length > 0)) {
        limitations.canEdit = false;

        // hide edit ability
        inputAndPenaltyContainer.removeAttribute(canEditAttribute);
        previewAndSubmitContainer.removeAttribute(canEditAttribute);

        for (let i = 0; i < numScr; i++)
            scrMenuItemContainers[i].removeAttribute(canEditAttribute);

        if (isFMC) {
            solutionInputField.disabled = true;
        }
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
        // if (isFMC) { // solutions
        //     const myCube = new Cube();
        //     myCube.move(scrambles[i]);
        //     console.log(`Solution for scramble ${i+1}:\n ${myCube.solve()}`);
        // }

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
    updatePreviewLabel();

    // Normalize all sizes and load saved times
    let lastSaved;
    for (let i = 0; i < allTimes.length; i++) {
        lastSaved = i;
        while (!scramblesSized[i])
            await new Promise(r => setTimeout(r, 1));

        if ((!isFMC && allTimes[i].timesObj == null) || (isFMC && allTimes[i].extraArgs.fmcSolution.length == 0))
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

    if (isMBLD) {
        scrContainers[0].setAttribute(hiddenAttribute, "true");
        inputAndPenaltyContainer.removeAttribute(canEditAttribute);
        previewAndSubmitContainer.removeAttribute(canEditAttribute);
        previewAndSubmitContainer.setAttribute("hide", "true");
    }
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

    if ((!isFMC && currTimesObj == null) || (isFMC && !_validSolution)) {
        hidePreview();
        return;
    }

    timePreviewLbl.innerText = isFMC
        ? (dnfState ? DNF_STRING : fmcSolutionArr.length)
        : (getTimesObjStr(currTimesObj, dnfState ? Penalties.DNF : (plus2State ? Penalties.Plus2 : Penalties.None)));

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
    timePreviewLbl.setAttribute(showPreviewAttribute, "");
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

// get this solve's extra args
function getExtraArgs() {
    return isFMC    ? (_validSolution ? { fmcSolution: fmcSolutionArr } : [])
                    : null;
}

async function submitTime(uploadData = true) {
    if ((!isFMC && (!validTime || (uploadData && equalTimes(allTimes[activeScr].timesObj, currTimesObj) && allTimes[activeScr].penalty == getCurrPenalty())))
        || (isFMC && (!_validSolution || (uploadData && allTimes[activeScr].extraArgs.fmcSolution.join() == fmcSolutionArr.join())))) return;

    if (limitations.canEdit && activeScr == numScr - 1) {
        // TODO: Warn the user they won't be able to edit their times if they submit
        if (!confirm("You will not be able to edit this event later if you submit now."))
            return;
    }

    // save the time
    saveTime(activeScr, timePreviewLbl.innerText, timeInput.value, currTimesObj, getCurrPenalty(), getExtraArgs());
    updateTimeInMenu(activeScr, timePreviewLbl.innerText);
    
    setInteractionState(false, true);
    
    if (uploadData) {
        const wcaMeData = await getWcaMe(true);
        if (!wcaMeData) {
            throwError("WCA אינך מחובר לחשבון");
            return;
        }
    
        const body = {
            userId: userData.userId,
            eventId: eventId,
            times: packTimes(allTimes)
        };
        const res = await sendRequest("/updateTimes", { method: "post",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body) });
        if (res.error) {
            throwError("בעיה בשמירת התוצאות");
            return;
        }
        console.log(res);
    }

    if (limitations.canEdit && activeScr == numScr - 1) {
        window.location = window.location; // refresh
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

    if (!isFMC)
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
function updateFMCText() {
    solutionPreviewLbl.innerText = fmcSolutionArr.join("\t");
    if (_validSolution) {
        previewAndSubmitContainer.removeAttribute(hiddenAttribute);
        previewAndSubmitContainer.removeAttribute("hide");
        updatePreviewLabel();
    }
    else {
        previewAndSubmitContainer.setAttribute(hiddenAttribute, "");
        fmcSolutionErrorLbl.innerText = fmcErrorTxt;
    }
}

let _validSolution = false;
let fmcErrorTxt = "";
let fmcSolutionArr = [];
if (isFMC) {
    // returns whether the solution solves the scramble
    function checkSolutionValidity(solutionTxt) {
        const cube = new Cube();
        
        const scrambleTxt = scrambles[activeScr];
        cube.move(scrambleTxt);

        const wideMovesRGX = /\b([RULFDB])w\b/g;
        solutionTxt = solutionTxt = solutionTxt.replace(wideMovesRGX, (_, face) => face.toLowerCase());
        cube.move(solutionTxt);

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
    function checkSolution(solutionTxt) {
        const maxSolutionLength = 80;

        if (!_changeSinceCheck)
            return _validSolution;

        _changeSinceCheck = false;
        _validSolution = false;

        fmcSolutionArr = parseSolution(solutionTxt);

        // solution length
        if (fmcSolutionArr.length > maxSolutionLength) {
            fmcErrorTxt = `יש להקליד פתרון בעל לכל היותר ${maxSolutionLength} מהלכים!` + ` (הפתרון שהוקלד בעל ${fmcSolutionArr.length} מהלכים.)`
            return;
        }

        console.log(fmcSolutionArr);
        const fixedSolutionTxt = fmcSolutionArr.join("\t");

        console.log(_validSolution = checkSolutionValidity(fixedSolutionTxt));
        fmcErrorTxt = _validSolution ? "" : "הפתרון שהוקלד לא פותר את הערבוב! יש לוודא שהפתרון הוקלד נכון.";
    }

    checkSolutionBtn.onclick = () => {
        solutionPreviewLbl.removeAttribute(changedAttribute);
        fmcSolutionErrorLbl.removeAttribute(changedAttribute);

        checkSolutionBtn.disabled = true;
        solutionInputField.disabled = true;

        checkSolution(solutionInputField.value);
        updateFMCText();

        solutionInputField.disabled = false;
    };

    solutionInputField.addEventListener("input", () => {
        _changeSinceCheck = true;
        _validSolution = false;
        fmcSolutionErrorLbl.setAttribute(changedAttribute, "");
        solutionPreviewLbl.setAttribute(changedAttribute, "");
        previewAndSubmitContainer.setAttribute(hiddenAttribute, "");
        fmcSolutionErrorLbl.innerText = "";

        checkSolutionBtn.disabled = solutionInputField.value.length == 0;
    });

}

if (isMBLD) {
    // mbld elements
    const fiveLessScramblesBtn = isMBLD ? document.getElementById("fiveLessScramblesBtn") : null;
    const oneLessScrambleBtn = isMBLD ? document.getElementById("oneLessScrambleBtn") : null;
    const numScramblesAmountLbl = isMBLD ? document.getElementById("numScramblesAmountLbl") : null;
    const oneMoreScrambleBtn = isMBLD ? document.getElementById("oneMoreScrambleBtn") : null;
    const fiveMoreScramblesBtn = isMBLD ? document.getElementById("fiveMoreScramblesBtn") : null;

    const smallDelta = 1;
    const bigDelta = 5;
    const minScrs = 2;
    const maxScrs = 50;
    let numScrs = minScrs;
    updateNumScrs();


    function submitNumScrsSelect() {
        numScrs = Math.min(Math.max(numScrs, minScrs), maxScrs); // clamp value
        console.log("submit");

        // generate scrambles

        scrContainers[0].setAttribute(hiddenAttribute, "false");
        inputAndPenaltyContainer.setAttribute(canEditAttribute, "");
        previewAndSubmitContainer.setAttribute(canEditAttribute, "");
        previewAndSubmitContainer.setAttribute("hide", "false");
    }

    function updateNumScrs(delta = 0) {
        numScrs += delta;
        numScramblesAmountLbl.innerText = numScrs;

        fiveLessScramblesBtn.disabled = numScrs - bigDelta < minScrs;
        oneLessScrambleBtn.disabled = numScrs - smallDelta < minScrs;
        oneMoreScrambleBtn.disabled = numScrs + smallDelta > maxScrs;
        fiveMoreScramblesBtn.disabled = numScrs + bigDelta > maxScrs;
    }

    fiveLessScramblesBtn.onclick = () => updateNumScrs(-bigDelta);
    oneLessScrambleBtn.onclick = () => updateNumScrs(-smallDelta);
    oneMoreScrambleBtn.onclick = () => updateNumScrs(smallDelta);
    fiveMoreScramblesBtn.onclick = () => updateNumScrs(bigDelta);
    submitNumScrsSelect.onclick = () => submitNumScrsSelect();

}


// TODO: on leave site, save the results
