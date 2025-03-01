export class TahashWeek {
    #manager;
    weekNumber = -1;
    startDate = null;
    endDate = null;
    data = [];
    /*
    week data structure:
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
    */


    // src - a source object to build the TahashWeek from
    constructor(weekManager, src) {
        this.#manager = weekManager;

        src = src || {};
        this.weekNumber =   src.weekNumber  || -1;
        this.startDate =    src.startDate   || null;
        this.endDate =      src.endDate     || null;
        this.data =         src.data        || [];

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
}

