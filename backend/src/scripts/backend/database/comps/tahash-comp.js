import { getEmptyPackedTimes } from "../../utils/time-utils.ts";
import { getEventResultStr, WCAEvents } from "../comp-event.js";
import { SubmissionState } from "./submission-state.js";

export class TahashComp {
    #manager;
    compNumber = -1;
    startDate = null;
    endDate = null;
    data = [];
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

    // construct a TahashComp from a given source
    // src - a source object to build the TahashComp from: {compNumber, startDate, endDate, data}
    constructor(compManager, src) {
        this.#manager = compManager;

        src = src || {};
        this.compNumber =   src.compNumber  ?? -1;
        this.startDate =    src.startDate   || null;
        this.endDate =      src.endDate     || null;
        this.data =         src.data        ?? [];

        // "normalize" date to only the date, ignore time of day
        this.startDate?.setHours(0, 0, 0, 0);
        this.endDate?.setHours(0, 0, 0, 0);

        // update the empty currCompTimes array
        this.getEmptyCurrCompTimes();
    }

    // save this TahashComp using the linked CompManager
    async saveToDB() {
        return await this.#manager.saveComp(this);
    }

    // is this comp currently active as the current Tahash comp?
    isActive() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.startDate <= now && now <= this.endDate;
    }

    // returns array of user ids
    // TODO: getCompetitorList method
    // (using sorted array and use binary search to search + insert?)
    getCompetitorList() {
    }

    // get the submissions for an event by its event id
    // returns: [ { userId, submissionState, times, resultStr } ]
    // if the event was not found, returns null
    getEventSubmissions(eventId) {
        const eventData = this.getEventDataById(eventId);
        return eventData ? eventData.results : null;
    }

    // returns CompEvent[] of the events of this comp
    getAllEventTypes() {
        const result = [];

        for (let i = 0; i < this.data.length; i++)
            result.push(this.data[i].event);

        return result;
    }

    // get the results of all events
    // returns [ { eventId, results } ]
    getAllResults() {
        let allResults = [];

        for (let i = 0; i < this.data.length; i++)
            allResults.push({ eventId: this.data[i].event.eventId, results: this.data[i].results });

        return allResults;
    }

    // returns a copy of the data for a specific event object of an event from this comp by its eventId.
    // if the comp does not contain an event with this id, returns null.
    getEventDataById(eventId) {
        const evData = this.data.find(d => d.event.eventId == eventId);
        return evData ? Object.assign({}, evData) : null;
    }

    // check whether this comp contains an event with a specific id.
    // if it does, returns a copy of the CompEvent object.
    // otherwise, returns null.
    getEvent(eventId) {
        const evData = this.data.find(d => d.event.eventId == eventId);
        return evData ? Object.assign({}, evData.event) : null;
    }

    // initialize scrambles for all events that don't have scrambles
    initScrambles() {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].scrambles.length != 0)
                continue;
            this.data[i].scrambles = this.data[i].event.generateScrambles();
        }
    }

    // get the information about events of this Tahash comp
    // returns an array: [ { eventId, iconName, eventTitle } ]
    getEventsInfo() {
        const events = [];

        // populate array
        for (let i = 0; i < this.data.length; i++)
            events.push(this.data[i].event.getEventInfo());

        return events;
    }

    // set the results of a user in an event
    // returns whether updating the result was successful
    setCompetitorResults(eventId, userId, packedTimes) {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].event.eventId != eventId)
                continue;

            const resultStr = getEventResultStr(eventId, packedTimes);
            const newResult = {
                userId: userId,
                times: packedTimes,
                submissionState: SubmissionState.Pending,
                resultStr: resultStr };
            
            if (this.data[i].results) this.data[i].results.push(newResult);
            else this.data[i].results = [ newResult ];
            // console.log("Saved result. new event data:", this.data[i].results);
            return true;
        }

        // didn't find event
        return false;
    }

    // update the submission state for a user's submission
    // returns whether updating was successful
    updateSubmissionState(eventId, userId, submissionState) {
        const eventIndex = this.#getEventDataIndex(eventId);
        if (eventIndex < 0)
            return false;

        const eventResults = this.data[eventIndex].results;
        for (let i = 0; i < eventResults.length; i++) {
            if (eventResults[i].userId == userId) {
                this.data[eventIndex].results[i].submissionState = submissionState;
                return true;
            }
        }

        return false;
    }

    // get the event data index by the event's id
    // returns -1 if the event wasn't found
    #getEventDataIndex(eventId) {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].eventId == eventId)
                return i;
        }

        return -1;
    }
    
    #_emptyCurrCompTimes = null;
    /* returns a copy of an empty instance of a 'currCompTimes' array
    if forceUpdate is true, forces to re-generate the currCompTimes array. */
    getEmptyCurrCompTimes(forceUpdate = false) {
        if (!forceUpdate && this.#_emptyCurrCompTimes)
            return this.#_emptyCurrCompTimes.slice(0); // return a copy

        this.#_emptyCurrCompTimes = [];
        const eventTypes = this.getAllEventTypes();

        for (let i = 0; i < eventTypes.length; i++) {
            this.#_emptyCurrCompTimes.push({
                eventId: eventTypes[i].eventId,
                finished: false,
                times: getEmptyPackedTimes(eventTypes[i])
            });
        }

        return this.#_emptyCurrCompTimes.slice(0); // return a copy
    }
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
