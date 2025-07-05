import csTimer from "cstimer_module";
import {NumScrambles, TimeFormat} from "../../constants/time-formats.ts";
import {getRandomString} from "../utils/global-utils.js";
import {EventDisplayInfo} from "../../interfaces/event-display-info.js";
import {ExtraArgs} from "../../interfaces/extra-args.js";

/**
 * Represents a Tahash competition event.
 */
export class CompEvent {
    /**
     * Construct a competition event.
     * @param eventTitle The event's display name.
     * @param eventId The event's id.
     * @param scrType The event's csTimer scramble type.
     * @param iconName The name of the event's icon in the icon library.
     * @param timeFormat The {@link TimeFormat} of the event.
     * @param scrLenExp The expected length for the scramble (negative/0 -> default csTimer value).
     * @param scrLenRadius Scramble length variance/radius.
     */
    constructor (
        /** The event's display name. */
        public readonly eventTitle: string,

        /** The event's id. */
        public readonly eventId: string,

        /** The event's csTimer scramble type. */
        public readonly scrType: string,

        /** The name of the event's icon in the icon library. */
        public readonly iconName: string,

        /** The {@link TimeFormat} of the event. */
        public readonly timeFormat: TimeFormat,

        /** The expected length for the scramble (negative/0 -> default csTimer value). */
        public readonly scrLenExp: number = 0,

        /** Scramble length variance (radius). */
        scrLenRadius: number = 0
    ) {
        this.scrLenRadius = Math.abs(scrLenRadius);
    }

    /** Scramble length variance (radius). */
    public readonly scrLenRadius: number;

    /**
     * The event's display information as a {@link EventDisplayInfo}.
     */
    public readonly displayInfo: EventDisplayInfo = { eventId: "-", eventTitle: "-", iconName: "-" };

    /**
     * Generate the length of a scramble.
     */
    public getScrambleLength(): number {
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
    public generateScrambles(): string[] {
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
    public getNumScrambles(): number {
        return NumScrambles[this.timeFormat];
    }

    /**
     * Get the event's info.
     */
    public getEventInfo(): EventDisplayInfo {
        return this.displayInfo;
    }
}

/**
 * Official WCA events ({@param CompEvent}[]).
 */
export const WCAEvents: Readonly<CompEvent[]> = [
    // -- WCA Events --
    //              Title       Id          ScrType     Icon            Format              scrLenExp   scrLenRadius
    new CompEvent(  "3x3x3",    "333",      "333",      "event-333",    TimeFormat.ao5),
    new CompEvent(  "2x2x2",    "222",      "222so",    "event-222",    TimeFormat.ao5),
    new CompEvent(  "4x4x4",    "444",      "444wca",   "event-444",    TimeFormat.ao5),
    new CompEvent(  "5x5x5",    "555",      "555wca",   "event-555",    TimeFormat.ao5,     60),
    new CompEvent(  "6x6x6",    "666",      "666wca",   "event-666",    TimeFormat.mo3,     80),
    new CompEvent(  "7x7x7",    "777",      "777wca",   "event-777",    TimeFormat.mo3,     100),
    new CompEvent(  "3x3 BLD",  "3bld",     "333ni",    "event-333bf",  TimeFormat.bo3),
    new CompEvent(  "FMC",      "fmc",      "333fm",    "event-333fm",  TimeFormat.bo3,     0,          0),
    new CompEvent(  "3x3 OH",   "oh",       "333",      "event-333oh",  TimeFormat.ao5),
    new CompEvent(  "Clock",    "clock",    "clkwca",   "event-clock",  TimeFormat.ao5),
    new CompEvent(  "Megaminx", "megaminx", "mgmp",     "event-minx",   TimeFormat.ao5,     70),
    new CompEvent(  "Pyraminx", "pyraminx", "pyrso",    "event-pyram",  TimeFormat.ao5,     10),
    new CompEvent(  "Skewb",    "skewb",    "skbso",    "event-skewb",  TimeFormat.ao5),
    new CompEvent(  "Square-1", "square-1", "sqrs",     "event-sq1",    TimeFormat.ao5),
    new CompEvent(  "4x4 BLD",  "4bld",     "444bld",   "event-444bf",  TimeFormat.bo3,     40),
    new CompEvent(  "5x5 BLD",  "5bld",     "555bld",   "event-555bf",  TimeFormat.bo3,     60),
    new CompEvent(  "3x3 MBLD", "mbld",     "r3ni",     "event-333mbf", TimeFormat.multi,   1)
];
Object.freeze(WCAEvents);

/**
 * All possible events in Tahash.
 */
const allEvents: Readonly<CompEvent[]> = WCAEvents.concat([
    // extra events here
]);

// freeze each event instance in allEvents.
allEvents.forEach(Object.freeze);

// Make sure there are no two events with the same id
(function assertNoDuplicateEventIds() {
    const seen = new Set<string>();
    for (const e of allEvents) {
        if (seen.has(e.eventId))
            throw new Error(`Duplicate eventId detected: ${e.eventId}`);
        seen.add(e.eventId);
    }
})();

/**
 * All event ids in Tahash.
 */
export const eventIds: Readonly<string[]> = allEvents.map(e => e.eventId);

/**
 * A Tahash event's id.
 */
export type EventId = typeof allEvents[number]["eventId"];

/**
 * Lookup table for events by their id.
 */
const eventIdMap: Record<EventId, Readonly<CompEvent>> = Object.fromEntries(
    allEvents.map(e => [e.eventId, e])
) as Record<EventId, Readonly<CompEvent>>;

/**
 * Check if a string is a valid Tahash event id (a TypeScript type guard).
 */
function isEventId(id: string): id is EventId {
    return eventIds.includes(id);
}

/**
 * Get a {@link CompEvent} by its {@link EventId}.
 */
export function getEventById(eventId: EventId): CompEvent {
    return eventIdMap[eventId];
}

/**
 * Creates a default (empty) instance of the extra arguments type associated with a given event ID.
 * @template T - The expected extra arguments type to return.
 * @param {string} eventId - The ID of the event (e.g., "fmc", "mbld").
 * @returns {T | undefined} A default-initialized object of type T if the event ID is recognized,
 *                          or undefined otherwise.
 */
export function createEmptyArgs<T extends ExtraArgs>(eventId: EventId): T | undefined {
    if (eventId === "fmc")
        return { fmcSolution: [] } as T;
    else if (eventId === "mbld")
        return { numSuccess: -1, numAttempt: -1 } as T;
    return undefined;
}

/**
 * Generate scrambles for an event.
 * @param eventId The event's id.
 * @return An array of scrambles for of the requested event.
 */
 export function generateScrambles(eventId: EventId): string[] {
    return getEventById(eventId).generateScrambles();
}

/**
 * Get the {@link EventDisplayInfo} of an event.
 * @param eventId The event's id.
 */
export function getEventDisplayInfo(eventId: EventId): EventDisplayInfo {
     return getEventById(eventId).getEventInfo();
}

