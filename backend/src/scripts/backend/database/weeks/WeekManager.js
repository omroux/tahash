import { getEventById } from "../CompEvent.js";
import {getNewWeekSrc, TahashWeek} from "./TahashWeek.js";

// Manages the "weeks" collection
export class WeekManager {
    #collection;
    #_currCompNum = -1;

    // Construct a WeekManager
    constructor(weeksCollection) {
        this.#collection = weeksCollection;
    }

    // get a TahashWeek object from the database by its week number
    // returns null if a week wasn't found
    async getTahashWeek(compNumber) {
        // find the week in the database
        const weekDoc = await this.#collection.findOne({ compNumber: compNumber });

        // create and return the week object
        return weekDoc ? new TahashWeek(this, {
            compNumber: weekDoc.compNumber,
            startDate: weekDoc.startDate,
            endDate: weekDoc.endDate,
            data: docDataToWeekData(weekDoc.data)
        }) : null;
    }

    // save a TahashWeek to the database by its week number (if it already exists, just update its values).
    // returns whether the update has been acknowledged (usually true).
    async saveWeek(tahashWeek) {
        return await this.#collection.updateOne({ compNumber: tahashWeek.compNumber },
            { $set: {
                compNumber: tahashWeek.compNumber,
                startDate: tahashWeek.startDate,
                endDate:  tahashWeek.endDate,
                data:  weekDataToDocData(tahashWeek.data)
                } },
            { upsert: true }).acknowledged;
    }

    // get the current week in the database (by highest week number)
    // force - whether to force accessing the database and comparing the comp number
    async getCurrentWeek(force = false) {
        if (force || this.#_currCompNum < 0)
            this.#_currCompNum = (await this.#collection.find({}, { _id: 0 }).sort({ compNumber: -1 }).limit(1).toArray())[0].compNumber;
        return await this.getTahashWeek(this.#_currCompNum);
    }

    getCurrentCompNumber() {
        return this.#_currCompNum;
    }

    // validate the current week - if the current week isn't active, create a new week
    // returns the new week's TahashWeek object.
    // extraEvents - an array of Events
    // force - whether to force creation of a new week
    async validateCurrentWeek(extraEvents = null, endDate = null, force = false) {
        const currentWeek = await this.getCurrentWeek();

        // check if the current week is still active
        if (!force && currentWeek.isActive())
            return;
        
        // create the new week's source object
        const src = getNewWeekSrc(currentWeek.compNumber + 1, extraEvents, null, endDate);

        // create a new week and save it to the database
        const newWeek = new TahashWeek(this, src);
        newWeek.initScrambles();
        await newWeek.saveToDB();
        this.#_currCompNum += 1;
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
    weekData ??= [];
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
    docData ??= [];
    for (let i = 0; i < docData.length; i++) {
        weekData.push({
            event: getEventById(docData[i].eventId),
            scrambles: docData[i].scrambles,
            results: docData[i].results
        });
    }

    return weekData;
}
