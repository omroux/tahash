import csTimer from "cstimer_module";
import {NumScrambles, TimeFormat} from "../../constants/time-formats.ts";
import {getRandomString} from "../utils/global-utils.js";
import {EventDisplayInfo} from "../../interfaces/event-display-info.js";
import {ExtraArgsFmc} from "../../interfaces/event-extra-args/extra-args-fmc.js";
import {ExtraArgsMbld} from "../../interfaces/event-extra-args/extra-args-mbld.js";

// Competition event structure
export class CompEvent<ArgsType = undefined> {
    /**
     * The event's display name.
     */
    eventTitle: string;

    /**
     * The event's id.
     */
    eventId: string;

    /**
     * The event's csTimer scramble type.
     */
    scrType: string;

    /**
     * The name of the event's icon in the icon library.
     */
    iconName: string;

    /**
     * The {@link TimeFormat} of the event.
     */
    timeFormat: TimeFormat;

    /**
     * The expected length for the scramble.
     */
    scrLenExp: number = 0;

    /**
     * Scramble length variance (radius).
     */
    scrLenRadius: number = 0;

    /**
     * Construct a competition event.
     * @param eventTitle The event's display name.
     * @param eventId The event's id.
     * @param scrType The event's csTimer scramble type.
     * @param iconName The name of the event's icon in the icon library.
     * @param resultFormat The {@link TimeFormat} of the event.
     * @param scrLenExp The expected length for the scramble (negative/0 -> default csTimer value).
     * @param scrLenRadius Scramble length variance/radius.
     */
    constructor(eventTitle: string, eventId: string, scrType: string, iconName: string, resultFormat: TimeFormat, scrLenExp: number = 0, scrLenRadius: number = 0) {
        this.eventTitle =   eventTitle;
        this.eventId =      eventId;
        this.scrType =      scrType;
        this.iconName =     iconName;
        this.timeFormat =   resultFormat;
        this.scrLenExp =    scrLenExp;
        this.scrLenRadius = Math.abs(scrLenRadius);
    }

    /**
     * Generate the length of a scramble.
     */
    getScrambleLength(): number {
        return this.scrLenExp <= 0
                ? 0
                : this.scrLenRadius <= 0
                    ? this.scrLenExp
                    // generate an non-negative integer in [scrLenExp-scrLenRadius, scrLenExp+scrLenRadius]
                    : Math.abs(Math.floor(Math.random() * (2 * this.scrLenRadius)) + (this.scrLenExp - this.scrLenRadius));
    }

    /**
     * Get a string[] with scrambles for this event.
     */
    generateScrambles(): string[] {
        const num = this.getNumScrambles();

        // generate seed instead of scrambles
        if (num < 0)
            return [ getRandomString() ];

        let result: string[] = [];
        for (let i = 0; i < num; i++) {
            const len = this.getScrambleLength();
            result.push(csTimer.getScramble(this.scrType, len));
        }

        return result;
    }

    /**
     * Get the number of scrambles for a round of the event.
     */
    getNumScrambles(): number {
        return getNumScrambles(this.timeFormat);
    }

    /**
     * Get the event's info.
     * @return The format { eventId, eventTitle, iconName }.
     */
    getEventInfo(): EventDisplayInfo {
        return { eventId: this.eventId, eventTitle: this.eventTitle, iconName: this.iconName };
    }
}

/**
 * Get the number of scrambles for a {@link TimeFormat}.
 */
export function getNumScrambles(timeFormat: TimeFormat) {
    return NumScrambles[timeFormat];
}


/**
 * Official WCA events ({@param CompEvent}[]).
 */
export const WCAEvents: Readonly<CompEvent<any>[]> = [
    // -- WCA Events --
    //              Title       Id          ScrType     Icon            Format              scrLenExp   scrLenRadius    emptyExtraArgs
    new CompEvent(  "3x3x3",    "333",      "333",      "event-333",    TimeFormat.ao5),
    new CompEvent(  "2x2x2",    "222",      "222so",    "event-222",    TimeFormat.ao5),
    new CompEvent(  "4x4x4",    "444",      "444wca",   "event-444",    TimeFormat.ao5),
    new CompEvent(  "5x5x5",    "555",      "555wca",   "event-555",    TimeFormat.ao5,     60),
    new CompEvent(  "6x6x6",    "666",      "666wca",   "event-666",    TimeFormat.mo3,     80),
    new CompEvent(  "7x7x7",    "777",      "777wca",   "event-777",    TimeFormat.mo3,     100),
    new CompEvent(  "3x3 BLD",  "3bld",     "333ni",    "event-333bf",  TimeFormat.bo3),
    new CompEvent<ExtraArgsFmc>(  "FMC",      "fmc",      "333fm",    "event-333fm",  TimeFormat.bo3,     0,          0),
    new CompEvent(  "3x3 OH",   "oh",       "333",      "event-333oh",  TimeFormat.ao5),
    new CompEvent(  "Clock",    "clock",    "clkwca",   "event-clock",  TimeFormat.ao5),
    new CompEvent(  "Megaminx", "megaminx", "mgmp",     "event-minx",   TimeFormat.ao5,     70),
    new CompEvent(  "Pyraminx", "pyraminx", "pyrso",    "event-pyram",  TimeFormat.ao5,     10),
    new CompEvent(  "Skewb",    "skewb",    "skbso",    "event-skewb",  TimeFormat.ao5),
    new CompEvent(  "Square-1", "square-1", "sqrs",     "event-sq1",    TimeFormat.ao5),
    new CompEvent(  "4x4 BLD",  "4bld",     "444bld",   "event-444bf",  TimeFormat.bo3,     40),
    new CompEvent(  "5x5 BLD",  "5bld",     "555bld",   "event-555bf",  TimeFormat.bo3,     60),
    new CompEvent<ExtraArgsMbld>(  "3x3 MBLD", "mbld",     "r3ni",     "event-333mbf", TimeFormat.multi,   1)
];
Object.freeze(WCAEvents);

/**
 * All possible events in Tahash.
 */
const allEvents = WCAEvents.concat([]);

/**
 * Get a {@link CompEvent} by its id (null if it doesn't exist).
 * @param eventId
 */
export function getEventById(eventId: string): CompEvent<any> | null {
    return allEvents.find(e => e.eventId === eventId) ?? null;
}

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
