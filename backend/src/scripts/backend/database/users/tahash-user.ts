import { datediff } from "../../utils/global-utils.js";
import { getUserDataByUserId } from "../../utils/api-utils.js";
import { UserInfo } from "../../../interfaces/user-info.js";
import {EventResults} from "../../../interfaces/event-results.js";
import {EventRecords} from "../../../interfaces/event-records.js";
import {TimeFormat} from "../../../constants/time-formats.js";
import {EventId} from "../comp-event.js";
import {UserEventResult} from "../../../interfaces/user-event-result.js";
import {WithId} from "mongodb";

const updateWCADataInterval: Readonly<number> = 28; /* number of days to wait between updating wca data */
export class TahashUser implements TahashUserFields {
    /**
     * The user's wca account id.
     */
    public readonly userId: number;

    /**
     * The user's wca data as {@link UserInfo}.
     */
    public readonly userInfo: Readonly<UserInfo>;

    /**
     * Epoch number of date of last wca data update
     */
    public readonly lastUpdatedWcaData: number;

    /**
     * Comp number of the last comp the user competed in.
     */
    public readonly lastComp: number;

    /* array of the user's records */
    public readonly records: Record<EventId, EventRecords<TimeFormat>>; /*
        user records structure:
        records: [
            {
                eventId: str,
                // bestResults contains the best results for the event, and for each type of result
                //      it also saves the comp number (as an integer)
                //      the comp number's values:
                //          * >0 -> a tahash comp
                //          * =0 -> a wca comp
                //          * -1 -> never competed
                bestResults:
                    --- different for each event type:
                    --  AO5:
                        { single, singleComp
                            average, averageComp }
                    --  MO3/BO3:
                        { single, singleComp
                            mean, meanComp }
                    --  BO3:
                        { single, singleComp,
                            mean, meanComp }
                    --  Multi:
                        { best total points / -1,
                        time of attempt with best score / -1,
                        bestComp }
                times: packedTimes (-- the full attempt)
            }
        ]
    */

    /* user's results of the last comp the user competed in */
    public readonly currCompTimes: Record<EventId, UserEventResult>; /*
    user currCompTimes structure:
    currCompTimes: [
        {
            eventId: str,
            finished: bool,
            times: packedTimes
        }
    ]
    */

    /**
     * Create an instance of a {@link TahashUser} from a source.
     * @param src Source with the user's data.
     */
    constructor(src: TahashUserFields) {
        if (src.userId < 0)
            throw new Error("Initializing TahashUser with invalid user id");

        this.userId = src.userId;
        this.userInfo = src.userInfo;
        this.lastUpdatedWcaData = Math.max(src.lastUpdatedWcaData, 0);
        this.lastComp = Math.max(src.lastComp, -1);
        this.records = src.records;
        this.currCompTimes = src.currCompTimes;
    }

    // save this TahashUser using the linked UserManager
    async saveToDB() {
        await this.#manager.saveUser(this);
    }

    /* set the times object for an event in the current competition.
    times is a packedTimes object of the attempt.
    overwrite: whether to overwrite an event the user already submitted
    */
    setEventTimes(eventId, times, overwrite = false) {
        if (!eventId || !times)
            return;

        if (!overwrite && this.finishedEvent(eventId))
            return;

        const finished = isFullPackedTimesArr(times);

        // if a submission of this event already exists, update it
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId) {
                this.currCompTimes[i].finished = finished;
                this.currCompTimes[i].times = times;
                return;
            }
        }

        // no submission yet, add it
        this.currCompTimes.push({
            eventId: eventId,
            finished: finished,
            times: times
        });
    }

    /* get the times object of an event in the current competition.
    returns a packedTimes object of the attempt.
    if the event was not found, returns null. */
    getEventTimes(eventId) {
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId)
                return this.currCompTimes[i].times;
        }

        return null;
    }

    // check if the user finished an event (submitted a full result) in a competition
    /* check if the user finished an event (submitted a full result) in the current competition */
    finishedEvent(eventId) {
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId)
                return this.currCompTimes[i].finished;
        }

        return false;
    }

    /* get event statuses for the current competition:
    for each event the user started to submit returns "unfinished",
    and for events the user submitted returns "finished".
    returns { eventId: status } */
    getEventStatuses() {
        const statuses = { };

        for (let i = 0; i < this.currCompTimes.length; i++)
            statuses[this.currCompTimes[i].eventId] = this.currCompTimes[i].finished ? "finished" : "unfinished";

        return statuses;
    }

    /* update the user's last comp number,
    and clear the user's saved times if they haven't competed in the current comp */
    updateCompNumber(newCompNumber, force = false) {
        if (!force && newCompNumber == this.lastComp)
            return;
        this.currCompTimes = [];
        this.lastComp = newCompNumber;
    }

    // get the user's wca data in a compact structure:
    // { userId, name, wcaId, photoUrl }
    getCompactWCAUserData(includePhoto) {
        return { userId: this.userId, name: this.userInfo.name, wcaId: this.userInfo.wcaId,  }
    }

    // try update the user's wca data
    // force: whether to force updating
    // returns whether the data was updated
    // (data will not update unless enough time has passed)
    async updateWCAData(force = false) {
        if (!force && datediff(this.lastUpdatedWcaData, Date.now()) < updateWCADataInterval)
            return false;

        this.lastUpdatedWcaData = Date.now();
        this.userInfo = getCompactWCAData(await getUserDataByUserId(this.userId));
        return true;
    }

    /**
     * Get an instance of a {@link TahashUser} from a document containing the comp's fields.
     * @param doc The document from the database.
     */
    public static fromDocument(doc: WithId<TahashUserFields>): TahashUser {
        return new TahashUser({ ...doc });
    }
}

// get only the necessary values from a user's wca data
// returns { wcaId, name, photoUrl }
export function getCompactWCAData(wcaData) {
    return { wcaId: wcaData.wca_id, name: wcaData.name, photoUrl: wcaData.avatar ? wcaData.avatar.url : "" }
}

export interface TahashUserFields {
    /**
     * The user's wca account id.
     */
    readonly userId: number;

    /**
     * The user's wca data as {@link UserInfo}.
     */
    readonly userInfo: Readonly<UserInfo>;

    /**
     * Epoch number of date of last wca data update
     */
    readonly lastUpdatedWcaData: number;

    /**
     * Comp number of the last comp the user competed in.
     */
    readonly lastComp: number;

    /**
     * Array of the user's records.
     */
    readonly records: Record<EventId, EventRecords<TimeFormat>>; /*
        user records structure:
        records: [
            {
                eventId: str,
                // bestResults contains the best results for the event, and for each type of result
                //      it also saves the comp number (as an integer)
                //      the comp number's values:
                //          * >0 -> a tahash comp
                //          * =0 -> a wca comp
                //          * -1 -> never competed
                bestResults:
                    --- different for each event type:
                    --  AO5:
                        { single, singleComp
                            average, averageComp }
                    --  MO3/BO3:
                        { single, singleComp
                            mean, meanComp }
                    --  BO3:
                        { single, singleComp,
                            mean, meanComp }
                    --  Multi:
                        { best total points / -1,
                        time of attempt with best score / -1,
                        bestComp }
                times: packedTimes (-- the full attempt)
            }
        ]
    */

    /**
     * User's results of the last comp the user competed in.
     */
    readonly currCompTimes: Record<EventId, UserEventResult>;
}

