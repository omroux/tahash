import {datediffEpoch} from "../../utils/global-utils.js";
import {getUserDataByUserId} from "../../utils/api-utils.js";
import {UserInfo} from "../../../interfaces/user-info.js";
import {EventRecords} from "../../../interfaces/event-records.js";
import {TimeFormat} from "../../../constants/time-formats.js";
import {EventId} from "../comp-event.js";
import {UserEventResult} from "../../../interfaces/user-event-result.js";
import {WithId} from "mongodb";
import {CompManager} from "../comps/comp-manager.js";
import {isFullPackedTimesArr, PackedResult} from "../../../interfaces/packed-result.js";
import {UserManager} from "./user-manager.js";
import {EventSubmissionStatus} from "../../../constants/event-submission-status.js";
import {isErrorObject} from "../../../interfaces/error-object.js";

const updateWCADataInterval: Readonly<number> = 28; /* number of days to wait between updating wca data */
export class TahashUser implements TahashUserFields {
    /**
     * The user's wca account id.
     */
    public readonly userId: number;

    /**
     * The user's wca data as {@link UserInfo}.
     */
    public userInfo: Readonly<UserInfo>;

    /**
     * Epoch number of date of last wca data update
     */
    public lastUpdatedWcaData: number;

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
    public readonly eventResults: Record<EventId, UserEventResult>;

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
        this.eventResults = src.eventResults;

        // update the current comp number
        if (CompManager.getInstance().getActiveCompNum() != this.lastComp) {
            this.eventResults = { };
            this.lastComp = CompManager.getInstance().getActiveCompNum();
        }
    }

    /**
     * Save this {@link TahashUser} using the {@link UserManager} singleton.
     */
    public async saveToDb(): Promise<boolean> {
        return await UserManager.getInstance().saveUser(this);
    }

    /**
     * Update a user's result of an event.
     * @param eventId The event's id.
     * @param times The times of the event.
     * @param overwrite Whether to overwrite the event if the user already finished it.
     */
    public setEventTimes(eventId: EventId, times: PackedResult[], overwrite = false): boolean {
        if (!overwrite && this.finishedEvent(eventId))
            return false;

        const finished = isFullPackedTimesArr(times);

        // update the user's submission for the event
        this.eventResults[eventId] = ({
            finished: finished,
            times: times
        });

        return true;
    }

    /**
     * Get the user's results in an event in the current competition.
     * @param eventId The event's id.
     * @return
     * - If the event was not found, returns `null`.
     * - Otherwise, returns a {@link UserEventResult} of the user's results in the event.
     */
    getEventResult(eventId: EventId): UserEventResult | undefined {
        return this.eventResults[eventId];
    }

    /**
     * Check if the user finished an event (submitted a full result) in the current competition.
     * @param eventId The event's id.
     */
    finishedEvent(eventId: EventId): boolean {
        const eventResult = this.eventResults[eventId];
        return eventResult !== undefined && eventResult.finished;
    }

    /**
     * Get the user's event statuses for the current competition.
     * @return For each event the user started to submit (and not finished), its value will be {@link EventSubmissionStatus.InProgress}.
     * For events the user fully submitted, returns {@link EventSubmissionStatus.Completed}.
     * All other events in the competition are not included in the returned {@link Record}.
     */
    getEventStatuses(): Record<EventId, EventSubmissionStatus> {
        const statuses: Record<EventId, EventSubmissionStatus> = { };

        for (const [ eventId, results ] of Object.entries(this.eventResults))
            statuses[eventId] = results.finished ? EventSubmissionStatus.Completed : EventSubmissionStatus.InProgress;

        return statuses;
    }

    /**
     * Try to update the user's user info ({@link UserInfo}).
     * @param force Whether to force updating.
     * @return Whether the data was updated (data will not update unless enough time has passed or forced=true).
     */
    public async tryUpdateWcaData(force = false): Promise<boolean> {
        if (!force && datediffEpoch(this.lastUpdatedWcaData, Date.now()) < updateWCADataInterval)
            return false;

        this.lastUpdatedWcaData = Date.now();
        const response = await getUserDataByUserId(this.userId);
        if (isErrorObject(response)) {
            console.error(`User ${this.userInfo.wcaId} encountered an error (get user data) in TahashUser.updateWCAData().\nError:${response.error} - ${response.context}`);
            return false;
        }

        this.userInfo = response;
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
    readonly eventResults: Record<EventId, UserEventResult>;
}

