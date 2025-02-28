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
    }


    // save this TahashWeek using the linked WeekManager
    async saveToDB() {
        return await this.#manager.saveWeek(this);
    }


    // has this competition already ended?
    weekEnded() {
        // TODO: weekEnded method
    }

    // returns array of user ids
    getCompetitorList() {
        // TODO: getCompetitorList method
    }

    // get event data by event id
    getEventData(eventId) {
        // TODO: implement getEventData method
    }


}

