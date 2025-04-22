// Manages the "users" collection
import {TahashUser} from "./TahashUser.js";

export class UserManager {
    #collection;

    // Construct a UserManager
    constructor(userCollection) {
        this.#collection = userCollection;
    }

    // Get a user in the database by id.
    // If the user doesn't exist, returns a new TahashUser object of this manager and with the given id,
    // but DOES NOT save the user to the database.
    async getUserById(userId) {
        const userJSON = await this.#collection.findOne({ userId: userId });
        return new TahashUser(this, userJSON ?? { userId: userId });
    }

    // save a TahashUser to the database by their user id (if they already exist, just update their values)
    // returns whether the update has been acknowledged (usually true)
    async saveUser(tahashUser) {
        if (tahashUser == null)
            return false;

        return await this.#collection.updateOne({ userId: tahashUser.userId },
            { $set: {
                userId: tahashUser.userId,
                data: tahashUser.data
            } },
            { upsert: true }).acknowledged;
    }
}
