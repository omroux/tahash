import {WriteError} from "mongodb";
import {TahashWeek} from "./TahashWeek.js";

// Manages the "weeks" collection
export class WeekManager {
    #collection;

    constructor(weeksCollection) {
        this.#collection = weeksCollection;
    }

    // get a TahashWeek object by its week number
    // createIfNull:    whether to create a week with that number (if one doesn't already exist), and save it to the database.
    //                  if this is set to false and a week doesn't exist, returns null.
    async getTahashWeek(weekNumber, createIfNull = false) {
        const weekSrc = { weekNumber: weekNumber };

        // find the week, don't return the document's id
        const week = await this.#collection.findOne(weekSrc, { _id: 0 });

        if (week) return week;
        if (!createIfNull) return null;

        // create and save new week
        const newWeek = new TahashWeek(this, weekSrc);
        await this.saveWeek(newWeek);

        return newWeek;
    }

    // save a TahashWeek to the database by its week number (if it already exists, just update its values).
    // returns whether the update has been acknowledged (usually true).
    async saveWeek(tahashWeek) {
        return await this.#collection.updateOne({ weekNumber: tahashWeek.weekNumber },
            { $set: {
                weekNumber: tahashWeek.weekNumber,
                startDate: tahashWeek.startDate,
                endDate:  tahashWeek.endDate,
                competitors:  tahashWeek.competitors,
                submissions:  tahashWeek.submissions,
                scrambles:  tahashWeek.scrambles,
                events:  tahashWeek.events
                } },
            { upsert: true }).acknowledged;
    }


    // week with the highest week number in the database
    async getLastWeek() {
        return await this.#collection.find({}, { _id: 0 }).sort({ weekNumber: -1 }).limit(1);
    }


    // an array of all the saved weeks in the database
    async getAllWeeks() {
        return await this.#collection.find().project({ _id: 0 }).toArray();
    }
}
