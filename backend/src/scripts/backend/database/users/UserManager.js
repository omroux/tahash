// Manages the "users" collection
import {TahashUser} from "./TahashUser.js";

export class UserManager {
    #collection;

    // Construct a UserManager
    constructor(userCollection) {
        this.#collection = userCollection;
    }

    // Get a user in the database by id.
    // If the user doesn't exist, returns null.
    async getUserById(userId) {
        const userJSON = await this.#collection.findOne({ userId: userId });
        return userJSON ? new TahashUser(userJSON) : null;
    }

    // save a TahashUser to the database by their user id (if they already exist, just update their values)
    // returns whether the update has been acknowledged (usually true)
    async saveUser(tahashUser) {
        return await this.#collection.updateOne({tahashUser},
            { $set: {
                userId: tahashUser.userId,
                data: tahashUser.data
            } },
            { upsert: true }).acknowledged;
    }
}