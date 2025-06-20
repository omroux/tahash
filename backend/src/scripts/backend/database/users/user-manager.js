// Manages the "users" collection
import { getUserDataByUserId, getWCARecordsOfUser } from "../../utils/api-utils.ts";
import { TahashUser } from "./tahash-user.ts";
import { getCompactWCAData } from "./tahash-user.ts";

export class UserManager {
    #collection;

    // Construct a UserManager
    constructor(userCollection) {
        this.#collection = userCollection;
    }

    // get a user's doc from the database by their id
    // null if not found
    async getUserDocById(userId) {
        return await this.#collection.findOne({ userId: userId });
    }

    // Get a user in the database by id.
    // If the user doesn't exist, returns a new (empty) TahashUser object of this manager and with the given id.
    // if saveIfCreated is true and the user doesn't exist in the database, fetches the user's WCA data and results and saves the user in the database.
    // if the compNumber is positive, updates the user's comp number
    async getUserById(userId, saveIfCreated = true) {
        let userSrc = await this.getUserDocById(userId);
        const isNewUser = userSrc == null;

        userSrc ??= { userId: userId }
        if (isNewUser && saveIfCreated) {
            userSrc.wcaData = getCompactWCAData(await getUserDataByUserId(userId));
            userSrc.records = await getWCARecordsOfUser(userId);
            userSrc.lastUpdatedWcaData = Date.now();
        }
        
        const newUser = new TahashUser(this, userSrc);
        newUser.updateCompNumber(this.#_currCompNumber, isNewUser);

        if (!isNewUser) {
            if (await newUser.updateWCAData())
                await this.saveUser(newUser);
        }

        if (isNewUser && saveIfCreated)
            await this.saveUser(newUser);

        return newUser;
    }

    // save a TahashUser to the database by their user id (if they already exist, just update their values)
    // returns whether the update has been acknowledged (usually true)
    async saveUser(tahashUser) {
        if (!tahashUser)
            return false;

        return await this.#collection.updateOne({ userId: tahashUser.userId },
            { $set: {
                userId: tahashUser.userId,
                wcaData: tahashUser.wcaData,
                lastUpdatedWcaData: tahashUser.lastUpdatedWcaData,
                lastComp: tahashUser.lastComp,
                records: tahashUser.records,
                currCompTimes: tahashUser.currCompTimes
            } },
            { upsert: true }).acknowledged;
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
