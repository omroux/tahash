// Manages the "users" collection
import { TahashUser } from "./TahashUser.js";

export class UserManager {
    #collection;

    // Construct a UserManager
    constructor(userCollection) {
        this.#collection = userCollection;
    }

    // Get a user in the database by id.
    // If the user doesn't exist, returns a new (empty) TahashUser object of this manager and with the given id.
    // if saveIfCreated is true and the user doesn't exist in the database, fetches the user's WCA results and saves the user in the database.
    // if the compNumber is positive, updates the user's comp number
    async getUserById(userId, saveIfCreated = true) {
        const userSrc = (await this.#collection.findOne({ userId: userId }))
                ?? { userId: userId,
                lastComp: -1,
                records: (saveIfCreated ? (await getWCARecordsOfUser(userId)) : []),
                currCompTimes: [] };
        
        const newUser = new TahashUser(this, userSrc);
        newUser.updateCompNumber(this.#_currCompNumber);

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
}

/* returns a "records" array of the user's WCA records */
// TODO: implement getWCARecordsOfUser
async function getWCARecordsOfUser(userId) {
    console.error("getWCARecordsOfUser not implemented");
    return [];
}
