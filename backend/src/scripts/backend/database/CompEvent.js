// Competition event structure
class CompEvent {
    eventTitle;
    eventId;    // =csTimer scramble type
    iconName;   // name of the event's icon in the icon "database"
    format;     // the format of the event (e.g. ao5, bo3, ...)

    constructor(eventTitle, eventId, iconName, resultFormat) {
        this.eventTitle =   eventTitle;
        this.eventId =      eventId;
        this.iconName =     iconName;
        this.format =       resultFormat;
    }
}

const allEvents = [
    new CompEvent("3x3x3", "333", "event-3x3", "ao5")
];

// get event by its id (undefined if it doesn't exist)
export const getEventById = (eventId)=>
        allEvents.find(e => e.eventId === eventId);
