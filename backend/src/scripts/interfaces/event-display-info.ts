import {EventId} from "../backend/database/comp-event.js";

/**
 * A {@link CompEvent}'s information for UI.
 */
export interface EventDisplayInfo {
    eventId: EventId;
    eventTitle: string;
    iconName: string;
}
