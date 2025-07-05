import {EventId, generateScrambles, getEventDisplayInfo, WCAEvents} from "../comp-event.ts";
import {CompManager} from "./comp-manager.js";
import {SubmissionData} from "../../../interfaces/submission-data.js";
import {EventResults} from "../../../interfaces/event-results.js";
import {EventDisplayInfo} from "../../../interfaces/event-display-info.js";
import {WithId} from "mongodb";
import {SubmissionState} from "./submission-state.js";

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
    public constructor(src: TahashCompFields) {
        src = src || {};
        this.compNumber = src.compNumber;
        this.startDate = src.startDate;
        this.endDate = src.endDate;
        this.data = src.data        ?? [];

        // "normalize" Date to only the date, ignore time of day
        this.startDate?.setHours(0, 0, 0, 0);
        this.endDate?.setHours(0, 0, 0, 0);

        // make sure startDate is first
        if (this.endDate < this.startDate) {
            console.warn("Attempted to create a TahashComp with endDate < startDate. Switching dates.");
            const temp = this.endDate;
            this.endDate = this.startDate;
            this.startDate = temp;
        }

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
        return await CompManager.getInstance().saveComp(this);
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
    public getEventResults(eventId: EventId): EventResults | undefined {
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
    public getEventSubmissions(eventId: EventId): SubmissionData[] | undefined {
        const evData: EventResults | undefined = this.data.find(d => d.eventId == eventId);
        return evData ? [...evData.submissions] : undefined;
    }

    /**
     * Generate (and set) scrambles for all events that don't have scrambles.
     */
    public fillScrambles(): void {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].scrambles.length == 0)
                continue;
            this.data[i].scrambles = generateScrambles(this.data[i].eventId);
        }
    }

    /**
     * Update the submission state for a user's submission.
     * @param eventId The submission's event.
     * @param userId The submitter's user id.
     * @param newSubmissionState The new {@link SubmissionState} for the submission.
     * @return Whether submitting was successful (false if the eventId/userId were not found).
     */
    public setSubmissionState(eventId: EventId, userId: number, newSubmissionState: SubmissionState): boolean {
        const evIndex = this.data.findIndex(evResults => evResults.eventId === eventId);
        if (evIndex < 0)
            return false; // event doesn't exist in comp

        const submissionIndex = this.data[evIndex].submissions.findIndex(sub => sub.userId === userId);
        if (submissionIndex < 0)
            return false; // user never submitted this event

        this.data[evIndex].submissions[submissionIndex].submissionState = newSubmissionState;
        return true;
    }

    /**
     * Submit results for a user.
     * @param eventId The submission's event.
     * @param userId The submitter's user id.
     * @param results The results to submit.
     * @return Whether submitting was successful. True unless:
     * - The event was not found.
     * - The user has already submitted results for this event.
     */
    public submitResults(eventId: EventId, userId: number, results: SubmissionData): boolean {
        const evIndex = this.data.findIndex(evResults => evResults.eventId === eventId);
        if (evIndex < 0)
            return false; // event doesn't exist in comp

        const alreadySubmitted = this.data[evIndex].submissions.some(sub => sub.userId === userId);
        if (alreadySubmitted)
            return false;

        this.data[evIndex].submissions.push(results);
        return true;
    }

    /**
     * Get an instance of a TahashComp from a document containing the comp's fields.
     * @param doc The document from the database.
     */
    public static fromDocument(doc: WithId<TahashCompFields>): TahashComp {
        return new TahashComp({ ...doc });
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

export interface TahashCompFields {
    compNumber: number;
    startDate: Date;
    endDate: Date;
    data?: EventResults[]
}

/**
 * The regular length for a {@link TahashComp} in number of days.
 */
export const normalCompLength: number = 7;

/**
 * Create a new source for a {@link TahashComp}.
 * @param compNumber The comp's number.
 * @param extraEvents Extra events for the comp.
 * @param startDate The comp's start date.
 * @param endDate The comp's end date.
 */
export function createCompSrc(compNumber: number, extraEvents: string[] = [], startDate: Date | undefined = undefined, endDate: Date | undefined = undefined): TahashCompFields {
    // add start date
    if (!startDate)
        startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // add end date
    if (!endDate) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + normalCompLength);
    }
    endDate.setHours(0, 0, 0, 0);

    // construct competition's data
    const extras = extraEvents.filter(ev => !WCAEvents.some(wcaEv => wcaEv.eventId == ev)); // filter out duplicates
    const allEventIds: string[] = WCAEvents.map(wcaEv => wcaEv.eventId).concat(extras);
    const data: EventResults[] = allEventIds.map(evId => ({ eventId: evId, scrambles: [], submissions: [] }));

    return { compNumber, startDate, endDate, data };
}
