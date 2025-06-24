import {generateScrambles, getEventDisplayInfo, getEventResultStr, WCAEvents} from "../comp-event.ts";
import {SubmissionState} from "./submission-state.ts";
import {CompManager} from "./comp-manager.js";
import {SubmissionData} from "../../../interfaces/submission-data.js";
import {EventResults} from "../../../interfaces/event-results.js";
import {EventDisplayInfo} from "../../../interfaces/event-display-info.js";
import {PackedResult} from "../../../interfaces/packed-result.js";

/**
 * Represents a Tahash competition.
 */
export class TahashComp {
    /**
     * The number of this competition.
     */
    public readonly compNumber: number;

    /**
     * The starting date of this competition.
     */
    public readonly startDate: Date;

    /**
     * The ending date of this competition.
     */
    public readonly endDate: Date;

    /**
     * The ids of all the events in this competition.
     */
    public readonly eventIds: readonly string[];

    public readonly eventDisplayInfos: readonly EventDisplayInfo[];

    private readonly data: EventResults[] = [];
    /*
    comp data structure IN DATABASE:
    data: [
        {
            eventId: str
            scrambles: str[]
            results: [
                {
                    userId: uint,
                    submissionState: SubmissionState,
                    times: packedTimes,
                    resultStr: str
                }
            ]
        }
    ]

    comp data structure IN CODE:
    data: [
        {
            event: CompEvent
            scrambles: str[]
            results: [
                {
                    userId: uint,
                    submissionState: SubmissionState,
                    times: packedTimes,
                    resultStr: str
                }
            ]
        }
    ]
    */

    /**
     * Create an instance of a {@link TahashComp} from a source.
     * @param src Source with the competition's data.
     */
    public constructor(src: { compNumber: number, startDate: Date, endDate: Date, data?: EventResults[] }) {
        src = src || {};
        this.compNumber = src.compNumber;
        this.startDate = src.startDate;
        this.endDate = src.endDate;
        this.data = src.data        ?? [];

        // "normalize" Date to only the date, ignore time of day
        this.startDate?.setHours(0, 0, 0, 0);
        this.endDate?.setHours(0, 0, 0, 0);

        // initialize eventIds array
        const evIds: string[] = [];
        for (const evData of this.data)
            evIds.push(evData.eventId);
        this.eventIds = evIds;

        // initialize eventDisplayInfos array
        this.eventDisplayInfos = this.eventIds.map((evId) => getEventDisplayInfo(evId));
    }

    /**
     * Get a clone of this {@link TahashComp}'s data.
     */
    public getData(): EventResults[] {
        return [...this.data];
    }

    /**
     * Save this {@link TahashComp} using the {@link CompManager} singleton.
     */
    public async saveToDB(): Promise<boolean> {
        return await CompManager.saveComp(this);
    }

    /**
     * Whether this comp is currently active.
     */
    public isActive() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.startDate <= now && now <= this.endDate;
    }

    // returns array of user ids
    // TODO: getCompetitorList method
    // (using sorted array and use binary search to search + insert?)
    getCompetitorList() {
    }

    /**
     * Get a copy of the {@link EventResults} of an event.
     * @param eventId The id of the event.
     * @result
     * - If the event exists in the competition, returns its {@link EventResults}.
     * - Otherwise, returns `undefined`.
     */
    public getEventResults(eventId: string): EventResults | undefined {
        const evData: EventResults | undefined = this.data.find(d => d.eventId == eventId);
        return evData ? Object.assign({}, evData) : undefined;
    }

    /**
     * Get a copy of the {@link SubmissionData}[] of an event.
     * @param eventId The id of the event.
     * @result
     * - If the event exists in the competition, returns its {@link SubmissionData}[].
     * - Otherwise, returns `undefined`.
     */
    public getEventSubmissions(eventId: string): SubmissionData[] | undefined {
        const evData: EventResults | undefined = this.data.find(d => d.eventId == eventId);
        return evData ? [...evData.submissions] : undefined;
    }

    /**
     * Generate (and set) scrambles for all events that don't have scrambles.
     */
    private fillScrambles(): void {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].scrambles.length == 0)
                continue;
            this.data[i].scrambles = generateScrambles(this.data[i].eventId);
        }
    }

    // TODO: delete if unnecessary
    // set the results of a user in an event
    // returns whether updating the result was successful
    // setUserResults(eventId: string, userId: string, packedTimes: PackedResult) {
    //     const evIndex = this.data.findIndex((v) => v.eventId == eventId);
    //     if (evIndex < 0)
    //         return false; // didn't find event
    //
    //     const resultStr = getEventResultStr(eventId, packedTimes);
    //     const newResult = {
    //         userId: userId,
    //         times: packedTimes,
    //         submissionState: SubmissionState.Pending,
    //         resultStr: resultStr };
    //
    //     if (this.data[i].results) this.data[i].results.push(newResult);
    //     else this.data[i].results = [ newResult ];
    //     // console.log("Saved result. new event data:", this.data[i].results);
    //     return true;
    // }

    // #_emptyCurrCompTimes = null;
    // /* returns a copy of an empty instance of a 'currCompTimes' array
    // if forceUpdate is true, forces to re-generate the currCompTimes array. */
    // getEmptyCurrCompTimes(forceUpdate = false) {
    //     if (!forceUpdate && this.#_emptyCurrCompTimes)
    //         return this.#_emptyCurrCompTimes.slice(0); // return a copy
    //
    //     this.#_emptyCurrCompTimes = [];
    //     const eventTypes = this.getAllEventTypes();
    //
    //     for (let i = 0; i < eventTypes.length; i++) {
    //         this.#_emptyCurrCompTimes.push({
    //             eventId: eventTypes[i].eventId,
    //             finished: false,
    //             times: getEmptyPackedTimes(eventTypes[i])
    //         });
    //     }
    //
    //     return this.#_emptyCurrCompTimes.slice(0); // return a copy
    // }
}



// get the src object for a new comp (starting on the current date)
// extraEvents - array of CompEvent
// startDate - the start date of the competition. if null, the start date will be today.
// endDate - the date to end the competition. if null, the end date will be set to a comp from now.
export function getNewCompSrc(compNumber, extraEvents = null, startDate = null, endDate = null) {
    // add start date
    if (!startDate) {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }
    startDate.setHours(0, 0, 0, 0);

    // add end date
    if (!endDate) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);
    }
    endDate.setHours(0, 0, 0, 0);

    const src = {
        compNumber: compNumber,
        startDate: startDate,
        endDate: endDate,
        data: []
    };

    // add default events
    for (let i = 0; i < WCAEvents.length; i++) {
        src.data.push({
            event: WCAEvents[i],
            scrambles: [],
            results: []
        });
    }

    // add extra events
    extraEvents ??= [];
    for (let i = 0; i < extraEvents.length; i++) {
        src.data.push({
            event: extraEvents[i],
            scrambles: [],
            results: []
        });
    }

    return src;
}
