export const Penalties = Object.freeze({
    None: 0,
    Plus2: 1,
    DNF: 2
});

// max = can't be
const maxHours = 2;
const maxMinutes = 60;
const maxSeconds = 60;
const maxMillis = 100;
const maxLen = (maxHours-1).toString().length + (maxMinutes-1).toString().length + (maxSeconds-1).toString().length + (maxMillis-1).toString().length;
//              = 1 + 2 + 2 + 2 = 7

export function tryAnalyzeTimes(timeStr) {
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

export function isFullTimesArr(arr) {
    return arr.some(a => !a.timesObj);
}

export function getDisplayTime(timesObj) {
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

// getTimesObjStr: convert a valid times obj (with an optional penalty) to a string from
export function getTimesObjStr(timesObj, penalty = Penalties.None) {
    if (!timesObj) return "-";

    let dispTimesObj = Object.assign({}, timesObj);
    if (penalty == Penalties.Plus2) {
        dispTimesObj.numSeconds += 2;
        dispTimesObj.numMinutes += Math.floor(dispTimesObj.numSeconds / maxSeconds);
        dispTimesObj.numSeconds %= maxSeconds;
        dispTimesObj.numHours += Math.floor(dispTimesObj.numMinutes / maxMinutes);
        dispTimesObj.numMinutes %= maxMinutes;
        if (dispTimesObj.numHours >= maxHours) {
            hidePreview(false);
            return;
        }
    }

    return (penalty == Penalties.DNF) ? "DNF" : (getDisplayTime(dispTimesObj) + (penalty == Penalties.Plus2 ? "+" : ""));
}

// format a times array to [{centis: <time in centiseconds>, penalty: <penalty>}]
// returns the result
export function packTimes(allTimes) {
    const packed = [];
    if (!allTimes) return packed;

    for (let i = 0; i < allTimes.length; i++) {
        packed.push({ centis: timesObjToCentis(allTimes[i].timesObj), penalty: allTimes[i].penalty});
    }

    return packed;

    // returns the timesObj as centiseconds (as an integer)
    // returns -1 if the timesObj is null
    function timesObjToCentis(timesObj) {
        const sec = 100;
        const min = 60 * sec;
        const hour = 60 * min;
        return timesObj ? timesObj.numMillis + timesObj.numSeconds*sec + timesObj.numMinutes*min + timesObj.numHours*hour : -1;
    }
}

// format a packed times array to an allTimes array
// returns the result
export function unpackTimes(packed) {
    const allTimes = [];
    if (!packed) return allTimes;

    for (let i = 0; i < packed.length; i++) {
        const timesObj = centisToTimesObj(packed[i].centis);
        const displayTime = getDisplayTime(timesObj);
        allTimes.push({ previewStr: displayTime, timeStr: timesObj ? displayTime : "", timesObj: timesObj, penalty: packed[i].penalty });
    }

    return allTimes;

    function centisToTimesObj(centis) {
        if (centis < 0)
            return null;

        const sec = 100;
        const min = 60 * sec;
        const hour = 60 * min;
        
        const numHours = Math.floor(centis / hour);
        centis %= hour;
        const numMinutes = Math.floor(centis / min);
        centis %= min;
        const numSeconds = Math.floor(centis / sec);
        centis %= sec;
        return { numHours: numHours, numMinutes: numMinutes, numSeconds: numSeconds, numMillis: centis };
    }
}

// check if two timesObjs are equal
export function equalTimes(o1, o2) {
    return (o1 == null && o2 == null) ||
        (o1 != null && o2 != null && o1.numMillis == o2.numMillis
        && o1.numSeconds == o2.numSeconds
        && o1.numMinutes == o2.numMinutes
        && o1.numHours == o2.numHours);
}
