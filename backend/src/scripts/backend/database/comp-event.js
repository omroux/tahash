import csTimer from "cstimer_module";
import { getRandomString } from "../utils/global-utils.ts";

// Competition event structure
export class CompEvent {
    eventTitle;     // the event's display name
    eventId;        // the event's id
    scrType;        // csTimer scramble type
    iconName;       // name of the event's icon in the icon "database"
    timeFormat;         // the format of the event (e.g. ao5, bo3, ...)
    emptyExtraArgs;   // does the event have extra arguments (solution for fmc, ...)
    scrLenExp;      // scramble length expectancy
    scrLenRadius;   // scramble length variance (radius)

    // scrambleExp - the expected length of the scramble. (negative/0 -> default value)
    constructor(eventTitle, eventId, scrType, iconName, resultFormat, scrLenExp = 0, scrLenRadius = 0, emptyExtraArgs = null) {
        this.eventTitle =   eventTitle;
        this.eventId =      eventId;
        this.scrType =      scrType;
        this.iconName =     iconName;
        this.timeFormat =   resultFormat;
        this.emptyExtraArgs = emptyExtraArgs;
        this.scrLenExp =    scrLenExp;
        this.scrLenRadius = Math.abs(scrLenRadius);
    }

    // get the length of the scramble
    getScrambleLength() {
        return this.scrLenExp <= 0
                ? 0
                : this.scrLenRadius <= 0
                    ? this.scrLenExp
                    // generate an non-negative integer in [scrLenExp-scrLenRadius, scrLenExp+scrLenRadius]
                    : Math.abs(Math.floor(Math.random() * (2 * this.scrLenRadius)) + (this.scrLenExp - this.scrLenRadius));
    }

    // returns a string[] with scrambles for this event
    generateScrambles() {
        const num = this.getNumScrambles();

        // generate seed instead of scrambles
        if (num < 0)
            return [ getRandomString() ];

        let result = [];
        for (let i = 0; i < num; i++) {
            const len = this.getScrambleLength();
            result.push(csTimer.getScramble(this.scrType, len));
        }

        return result;
    }

    // get the number of scrambles for a round of the event
    getNumScrambles() {
        return getNumScrambles(this.timeFormat);
    }

    // get the event's info. returns { eventId, eventTitle, iconName }
    getEventInfo() {
        return { eventId: this.eventId, eventTitle: this.eventTitle, iconName: this.iconName };
    }
}


export const TimeFormat = Object.freeze({
    ao5: "ao5",
    mo3: "mo3",
    bo3: "bo3",
    multi: "multi"
});

// -1 -> generate seed
const numScrambles = Object.freeze({
    ao5: 5,
    mo3: 3,
    bo3: 3,
    multi: -1
});

// get the number of scrambles for a TimeFormat
export const getNumScrambles = timeFormat => numScrambles[timeFormat];


// official WCA events (CompEvent[])
export const WCAEvents = [
    // -- WCA Events --
    //              Title       Id          ScrType     Icon            Format              scrLenExp   scrLenRadius    emptyExtraArgs
    new CompEvent(  "3x3x3",    "333",      "333",      "event-333",    TimeFormat.ao5),
    new CompEvent(  "2x2x2",    "222",      "222so",    "event-222",    TimeFormat.ao5),
    new CompEvent(  "4x4x4",    "444",      "444wca",   "event-444",    TimeFormat.ao5),
    new CompEvent(  "5x5x5",    "555",      "555wca",   "event-555",    TimeFormat.ao5,     60),
    new CompEvent(  "6x6x6",    "666",      "666wca",   "event-666",    TimeFormat.mo3,     80),
    new CompEvent(  "7x7x7",    "777",      "777wca",   "event-777",    TimeFormat.mo3,     100),
    new CompEvent(  "3x3 BLD",  "3bld",     "333ni",    "event-333bf",  TimeFormat.bo3),
    new CompEvent(  "FMC",      "fmc",      "333fm",    "event-333fm",  TimeFormat.bo3,     0,          0,              Object.freeze({ fmcSolution: [] })),
    new CompEvent(  "3x3 OH",   "oh",       "333",      "event-333oh",  TimeFormat.ao5),
    new CompEvent(  "Clock",    "clock",    "clkwca",   "event-clock",  TimeFormat.ao5),
    new CompEvent(  "Megaminx", "megaminx", "mgmp",     "event-minx",   TimeFormat.ao5,     70),
    new CompEvent(  "Pyraminx", "pyraminx", "pyrso",    "event-pyram",  TimeFormat.ao5,     10),
    new CompEvent(  "Skewb",    "skewb",    "skbso",    "event-skewb",  TimeFormat.ao5),
    new CompEvent(  "Square-1", "square-1", "sqrs",     "event-sq1",    TimeFormat.ao5),
    new CompEvent(  "4x4 BLD",  "4bld",     "444bld",   "event-444bf",  TimeFormat.bo3,     40),
    new CompEvent(  "5x5 BLD",  "5bld",     "555bld",   "event-555bf",  TimeFormat.bo3,     60),
    new CompEvent(  "3x3 MBLD", "mbld",     "r3ni",     "event-333mbf", TimeFormat.multi,   1,          0,              Object.freeze({ numSuccess: 0, numAttempt: 0 }))
];
Object.freeze(WCAEvents);

// all possible events in Tahash
const allEvents = WCAEvents.concat({});

// get event by its id (null if it doesn't exist)
export const getEventById = (eventId) =>
        allEvents.find(e => e.eventId === eventId) ?? null;

// get the final result of the event (as a string), given the times (e.g. an ao5, mo3, bo3, ...)
// for multibld, returns { numSuccess, numAttempt, resultStr }
// returns null if the result couldn't be found
export function getEventResultStr(eventId, packedTimes) {
    const compEvent = getEventById(eventId);

    if (!compEvent)
        return "INVALID COMP EVENT";

    switch (compEvent.timeFormat) {
        case TimeFormat.ao5:
            return calculateAO5(packedTimes);

        case TimeFormat.mo3:
            return eventId == "fmc" ? calculateFMCResult(packedTimes) : calculateMO3(packedTimes);

        case TimeFormat.bo3:
            return calculateBO3(packedTimes);

        case TimeFormat.multi:
            return calculateMultiResult(packedTimes);

        default:
            return "INVALID TIME FORMAT";
    }
}

function calculateAO5(packedTimes) {
    const maxDNF = 2;
    const pureCentis = getPureCentis(packedTimes);

    let dnfCount = 0;
    let average = 0;
    let lowest = pureCentis[0];
    let highest = pureCentis[0];

    for (let i = 0; i < packedTimes.length; i++) {
        if (packedTimes[i].penalty == Penalties.DNF) {
            dnfCount++;
            continue;
        }

        if (dnfCount >= maxDNF)
            return DNF_STRING;

        average += pureCentis[i];

        lowest = Math.min(lowest, pureCentis[i]);
        highest = Math.max(highest, pureCentis[i]);
    }

    if (dnfCount < 1) // don't count highest
        average -= highest;
    average -= lowest;

    average = Math.floor(average / 3); // get the average
    return centisToString(average);
}

function calculateMO3(packedTimes) {
    let mean = 0;
    const pureCentis = getPureCentis(packedTimes);

    for (let i = 0; i < packedTimes.length; i++) {
        if (packedTimes[i].penalty == Penalties.DNF)
            return DNF_STRING; // max 1 dnf
        
        mean += pureCentis[i];
    }
    
    mean = Math.floor(mean / 3); // get the mean
    return centisToString(mean);
}

function calculateBO3(packedTimes) {
    let best = packedTimes[0].centis;

    for (let i = 1; i < packedTimes.length; i++)
        best = Math.min(best, packedTimes[i].centis)

    return centisToString(best);
}

function calculateMultiResult(packedTimes) {
    const extraArgs = packedTimes[0].extraArgs;
    return `${extraArgs.numSuccess}/${extraArgs.numAttempt} ${centisToString(packedTimes[0].centis)}`;
}

function calculateFMCResult(packedTimes) {
    let mean = 0;

    for (let i = 0; i < packedTimes.length; i++) {
        if (packedTimes[i].penalty == Penalties.DNF)
            return DNF_STRING; // max 1 dnf

        if (!packedTimes.extraArgs.fmcSolution) {
            console.error("ERROR: No FMC solution. Returning -1 (CompEvent.calculateFMCResult)");
            return -1;
        }
        mean += packedTimes.extraArgs.fmcSolution.length;
    }
    
    mean = Math.floor(mean / 3); // get the mean
    return centisToString(mean);
}
