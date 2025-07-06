// Manages the "users" collection
import {Collection, WithId} from "mongodb";
import { getUserDataByUserId, getWCARecordsOfUser } from "../../utils/api-utils.ts";
import {TahashUser, TahashUserFields} from "./tahash-user.ts";
import { getCompactWCAData } from "./tahash-user.ts";
import {EventRecords} from "../../../interfaces/event-records.js";
import {TimeFormat} from "../../../constants/time-formats.js";
import {EventId} from "../comp-event.js";
import {UserInfo} from "../../../interfaces/user-info.js";

/**
 * A singleton to manage the "users" collection of the database.
 */
export class UserManager {
    /**
     * The singleton instance of {@link UserManager}.
     * @private
     */
    private static instance: UserManager;

    private readonly collection: Collection<TahashUserFields>;

    /**
     * Construct a {@link UserManager}.
     * @param userCollection The MongoDB {@link Collection} of the users.
     */
    constructor(userCollection: Collection<TahashUserFields>) {
        if (UserManager.instance !== undefined)
            throw new Error("Attempted to instantiate a new singleton instance of UserManager where an instance already exists.");

        this.collection = userCollection;
    }

    /**
     * Create an instance of the {@link UserManager} singleton.
     * @param usersCollection The MongoDB {@link Collection} of the users.
     * @return The new {@link UserManager} instance.
     * @throws Error If a {@link UserManager} instance already exists.
     */
    public static init(usersCollection: Collection<TahashUserFields>): UserManager {
        if (this.instance !== null)
            throw new Error("UserManager instance already exists. Use UserManager.getInstance() instead.");

        this.instance = new this(usersCollection);
        return this.instance;
    }

    /**
     * Get the singleton instance of the {@link UserManager}.
     */
    public static getInstance(): UserManager {
        if (!this.instance)
            throw new Error("UserManager not initialized. Call init() first.");

        return this.instance;
    }

    /**
     * Get a user's document from the database by their id.
     * @param userId The requested user's id.
     * @return
     * - If the user doesn't exist in the database, returns `null`.
     * - Otherwise, returns the document of the user.
     */
    public async getUserDocById(userId: number): Promise<WithId<TahashUserFields> | null> {
        return await this.collection.findOne({ userId: userId });
    }

    /**
     * Get a user in the database by id.
     * If the user doesn't exist, returns a new ("default") TahashUser object of this manager with the given id.
     * @param userId
     * @param saveIfCreated if true and the user doesn't exist in the database, fetches the user's WCA data and results and saves the user in the database.
     */
    public async getUserById(userId: number, saveIfCreated: boolean = true): TahashUser {
        let userDoc = await this.getUserDocById(userId);
        const isNewUser = userDoc == null;

        let userInfo: UserInfo = {
            id: userId,
            name: "NOT FOUND",
            wcaId: "NOT FOUND",
            country: "-",
            photoUrl: "-"
        };
        let records: Record<EventId, EventRecords<TimeFormat>> = { };
        let lastUpdatedWcaData: number = -1;

        if (isNewUser && saveIfCreated) {
            userInfo = getCompactWCAData(await getUserDataByUserId(userId));
            records = await getWCARecordsOfUser(userId);
            lastUpdatedWcaData = Date.now();
        }

        const userSrc: TahashUserFields = userDoc ? { ...userDoc } : {
            userId,
            userInfo: userInfo,
            lastUpdatedWcaData: lastUpdatedWcaData,
            lastComp: -1,
            records: records,
            currCompTimes: { }
        };

        const newUser = new TahashUser(userSrc);
        newUser.updateCompNumber(this.#_currCompNumber, isNewUser);

        if (!isNewUser) {
            if (await newUser.updateWCAData())
                await this.saveUser(newUser);
        }

        if (isNewUser && saveIfCreated)
            await this.saveUser(newUser);

        return newUser;
    }
    
    /**
     * Save a {@link TahashUser} to the database by their user id (if the user already exists, updates their values)
     * @param tahashUser The user to save.
     * @return Whether the update has been acknowledges (usually true).
     */
    public async saveUser(tahashUser: TahashUser): Promise<boolean> {
        return (await this.collection.updateOne({ userId: tahashUser.userId },
            { $set: {
                userId: tahashUser.userId,
                userInfo: tahashUser.userInfo,
                lastUpdatedWcaData: tahashUser.lastUpdatedWcaData,
                lastComp: tahashUser.lastComp,
                records: tahashUser.records,
                currCompTimes: tahashUser.currCompTimes
            } },
            { upsert: true })).acknowledged;
    }

    #_currCompNumber = -1;
    /* update the current comp number (updates to highest between current and new) */
    setCompNumber(newCompNum) {
        this.#_currCompNumber = newCompNum;
    }

    /* get the user's (compact) WCA user data by their id
    if the user wasn't found, returns null */
    async getUserDataById(userId) {
        const userDoc = await this.getUserDocById(userId);
        return userDoc ? userDoc.wcaData : null;
    }
}
