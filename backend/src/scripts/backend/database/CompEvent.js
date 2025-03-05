// Competition event structure
class CompEvent {
    eventTitle;     // the event's display name
    eventId;        // the event's id
    scrType;        // csTimer scramble type
    iconName;       // name of the event's icon in the icon "database"
    format;         // the format of the event (e.g. ao5, bo3, ...)
    scrLenExp;      // scramble length expectancy
    scrLenRadius;   // scramble length variance (radius)

    // scrambleExp - the expected length of the scramble. (negative/0 -> default value)
    constructor(eventTitle, eventId, scrType, iconName, resultFormat, scrLenExp = 0, scrLenRadius = 0) {
        this.eventTitle =   eventTitle;
        this.eventId =      eventId;
        this.scrType =      scrType;
        this.iconName =     iconName;
        this.format =       resultFormat;
        this.scrLenExp =    scrLenExp;
        this.scrLenRadius = Math.abs(scrLenExp, scrLenRadius);
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
}


// official WCA events (CompEvent[])
export const WCAEvents = [
    //              Title       Id          ScrType     Icon            Format      [scrLenExp]
    // -- WCA Events --
    new CompEvent(  "3x3x3",    "333",      "333",      "event-333",    "ao5"),
    new CompEvent(  "2x2x2",    "222",      "222so",    "event-222",    "ao5"),
    new CompEvent(  "4x4x4",    "444",      "444wca",   "event-222",    "ao5"),
    new CompEvent(  "5x5x5",    "555",      "555wca",   "event-222",    "ao5",      60),
    new CompEvent(  "6x6x6",    "666",      "666wca",   "event-222",    "mo3",      80),
    new CompEvent(  "7x7x7",    "777",      "777wca",   "event-222",    "mo3",      100),
    new CompEvent(  "3x3 BLD",  "3bld",     "333ni",    "event-333bf",  "bo3"),
    new CompEvent(  "3x3 FMC",  "fmc",      "333fm",    "event-333fm",  "bo3"),
    new CompEvent(  "3x3 OH",   "oh",       "333",      "event-333oh",  "ao5"),
    new CompEvent(  "Clock",    "clock",    "clkwca",   "event-clock",  "ao5"),
    new CompEvent(  "Megaminx", "megaminx", "mgmp",     "event-minx",   "ao5",      70),
    new CompEvent(  "Pyraminx", "pyraminx", "pyrso",    "event-pyram",  "ao5",      10),
    new CompEvent(  "Skewb",    "skewb",    "skbso",    "event-skewb",  "ao5"),
    new CompEvent(  "Square-1", "square-1", "sqrs",     "event-sq1",    "ao5"),
    new CompEvent(  "4x4 BLD",  "4bld",     "444bld",   "event-444bf",  "bo3",      40),
    new CompEvent(  "5x5 BLD",  "5bld",     "555bld",   "event-555bf",  "bo3",      60),
    new CompEvent(  "3x3 MBLD", "mbld",     "r3ni",     "event-333mbf", "multi",    5)
];
Object.freeze(WCAEvents);

// all possible events in Tahash
const allEvents = WCAEvents.concat({});

// get event by its id (undefined if it doesn't exist)
export const getEventById = (eventId)=>
        allEvents.find(e => e.eventId === eventId);
