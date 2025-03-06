import { WCAEvents } from "../CompEvent.js";

export class TahashWeek {
    #manager;
    weekNumber = -1;
    startDate = null;
    endDate = null;
    data = [];
    /*
    week data structure IN DATABASE:
    data: [
        {
            eventId: str
            scrambles: str[]
            results: [
                {
                    userId: uint,
                    result: str
                }
            ]
        }
    ]

    week data structure IN CODE:
    data: [
        {
            event: CompEvent
            scrambles: str[]
            results: [
                {
                    userId: uint,
                    result: str
                }
            ]
        }
    ]
    */


    // src - a source object to build the TahashWeek from: {weekNumber, startDate, endDate, data}
    constructor(weekManager, src) {
        this.#manager = weekManager;

        src = src || {};
        this.weekNumber =   src.weekNumber  ?? -1;
        this.startDate =    src.startDate   || null;
        this.endDate =      src.endDate     || null;
        this.data =         src.data        ?? [];

        // "normalize" date to only the date, ignore time of day
        this.startDate?.setHours(0, 0, 0, 0);
        this.endDate?.setHours(0, 0, 0, 0);
    }


    // save this TahashWeek using the linked WeekManager
    async saveToDB() {
        return await this.#manager.saveWeek(this);
    }


    // is this week currently active as the current Tahash week?
    isActive() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.startDate <= now && now <= this.endDate;
    }

    // returns array of user ids
    getCompetitorList() {
        // TODO: getCompetitorList method
        // (using sorted array and use binary search to search + insert?)
    }

    // get the results of an event by its event id
    getEventResults(eventId) {
        // TODO: implement getEventData method
    }

    // returns CompEvent[] of the events of this week
    getEvents() {
        const result = [];

        for (let i = 0; i < this.data.length; i++) {
            result.push(this.data[i].event);
        }

        return result;
    }
}

// get the src object for a new week (starting on the current date)
// extraEvents - array of CompEvent
// startDate - the start date of the competition. if null, the start date will be today.
// endDate - the date to end the competition. if null, the end date will be set to a week from now.
export function getNewWeekSrc(weekNumber, extraEvents = null, startDate = null, endDate = null) {
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
        weekNumber: weekNumber,
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
