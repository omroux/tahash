import { getEventById } from "../CompEvent.js";
import {getNewWeekSrc, TahashWeek} from "./TahashWeek.js";

// Manages the "weeks" collection
export class WeekManager {
    #collection;
    #_lastWeekNumber = -1;

    // Construct a WeekManager
    constructor(weeksCollection) {
        this.#collection = weeksCollection;
    }

    // get a TahashWeek object from the database by its week number
    async getTahashWeek(weekNumber) {
        // find the week in the database
        const weekDoc = await this.#collection.findOne({ weekNumber: weekNumber });

        // create and return the week object
        return weekDoc ? new TahashWeek(this, {
            weekNumber: weekDoc.weekNumber,
            startDate: weekDoc.startDate,
            endDate: weekDoc.endDate,
            data: docDataToWeekData(weekDoc.data)
        }) : null;
    }

    // save a TahashWeek to the database by its week number (if it already exists, just update its values).
    // returns whether the update has been acknowledged (usually true).
    async saveWeek(tahashWeek) {
        return await this.#collection.updateOne({ weekNumber: tahashWeek.weekNumber },
            { $set: {
                weekNumber: tahashWeek.weekNumber,
                startDate: tahashWeek.startDate,
                endDate:  tahashWeek.endDate,
                data:  weekDataToDocData(tahashWeek.data)
                } },
            { upsert: true }).acknowledged;
    }

    // get the last week in the database (by highest week number)
    async getLastWeek() {
        if (this.#_lastWeekNumber < 0)
            this.#_lastWeekNumber = (await this.#collection.find({}, { _id: 0 }).sort({ weekNumber: -1 }).limit(1).toArray())[0].weekNumber;
        return await this.getTahashWeek(this.#_lastWeekNumber);
    }

    // validate the last week - if the last week isn't active, create a new week
    // returns the new week's TahashWeek object.
    // extraEvents - an array of Events
    async validateLastWeek(extraEvents = null, endDate = null) {
        const lastWeek = await this.getLastWeek();

        // check if the last week is still active
        if (lastWeek.isActive()) return;
        
        // create the new week's source object
        const src = getNewWeekSrc(lastWeek.weekNumber + 1, extraEvents, null, endDate);

        // create a new week and save it to the database
        const newWeek = new TahashWeek(this, src);
        await newWeek.saveToDB();
        this.#_lastWeekNumber += 1;
    }

    // an array of all the saved weeks in the database
    async getAllWeeks() {
        return await this.#collection.find().project({ _id: 0 }).toArray();
    }
}

// get tahash week data as a database document object data
function weekDataToDocData(weekData) {
    const docData = [];

    // replace CompEvent with just id
    for (let i = 0; i < weekData.length; i++) {
        docData.push({
            eventId: weekData[i].event.eventId,
            scrambles: weekData[i].scrambles,
            results: weekData[i].results
        });
    }

    return docData;
}

// get database document object data as tahash week data
function docDataToWeekData(docData) {
    const weekData = [];

    // replace id with event
    for (let i = 0; i < docData.length; i++) {
        weekData.push({
            event: getEventById(docData[i].eventId),
            scrambles: docData[i].scrambles,
            results: docData[i].results
        });
    }

    return weekData;
}
