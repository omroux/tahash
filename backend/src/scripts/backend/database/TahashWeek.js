export class TahashWeek {
    #manager;
    weekNumber = -1;
    startDate = null;
    endDate = null;
    competitors = [];
    submissions = [];
    scrambles = [];
    events = [];


    // src - a source object to build the TahashWeek from
    constructor(weekManager, src) {
        this.#manager = weekManager;

        src = src || {};
        this.weekNumber =   src.weekNumber  || -1;
        this.startDate =    src.startDate   || null;
        this.endDate =      src.endDate     || null;
        this.competitors =  src.competitors || [];
        this.submissions =  src.submissions || [];
        this.scrambles =    src.scrambles   || [];
        this.events =       src.events      || [];
    }


    async saveToDB() {
        return await this.#manager.saveWeek(this);
    }
}

