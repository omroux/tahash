// Competition event structure
class CompEvent {
    eventTitle;
    eventId;    // =csTimer scramble type
    iconName;   // name of the event's icon in the icon "database"

    constructor(eventTitle, eventId, iconName) {
        this.eventTitle =   eventTitle;
        this.eventId =      eventId;
        this.iconName =     iconName;
    }
}

const allEvents = [
    new CompEvent("3x3x3", "333", "event-3x3")
];

// get event by its id (undefined if it doesn't exist)
export const getEventById = (eventId)=>
        allEvents.find(e => e.eventId === eventId);
