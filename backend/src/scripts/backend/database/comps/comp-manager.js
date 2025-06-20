import { getEventById } from "../comp-event.js";
import { getNewCompSrc, TahashComp } from "./tahash-comp.js";

// Manages the "comps" collection
export class CompManager {
    #collection;
    #userManager;
    #_currCompNum = -1;

    // Construct a CompManager
    constructor(compsCollection, userManager = null) {
        this.#collection = compsCollection;
        this.#userManager = userManager;
    }

    // initialize comps collection if it's empty
    async initComps() {
        const count = await this.#collection.countDocuments({}, { limit: 1 });
        if (count > 0) return;

        console.log("Initializing empty comp...");
        
        // save an empty comp with compNumber 0
        await this.saveComp(new TahashComp(this, { compNumber: 0, endDate: new Date(1) }));
        await this.#collection.findOne({}); // mongodb needs more time to register saving the new comp
    }

    // get a TahashComp object from the database by its comp number
    // returns null if a comp wasn't found
    async getTahashComp(compNumber) {
        // find the comp in the database
        const compDoc = await this.#collection.findOne({ compNumber: compNumber });

        // create and return the comp object
        return compDoc ? new TahashComp(this, {
            compNumber: compDoc.compNumber,
            startDate: compDoc.startDate,
            endDate: compDoc.endDate,
            data: docDataToCompData(compDoc.data)
        }) : null;
    }

    // check if a comp with a comp number exists
    compExists(compNumber) {
        return !isNaN(compNumber) && compNumber > 0 && compNumber <= this.getCurrentCompNumber();
    }

    // save a TahashComp to the database by its comp number (if it already exists, just update its values).
    // returns whether the update has been acknowledged (usually true).
    async saveComp(tahashComp) {
        return (await this.#collection.updateOne({ compNumber: tahashComp.compNumber },
            { $set: {
                compNumber: tahashComp.compNumber,
                startDate: tahashComp.startDate,
                endDate:  tahashComp.endDate,
                data:  compDataToDocData(tahashComp.data)
                } },
            { upsert: true })).acknowledged;
    }

    // get the current comp in the database (by highest comp number)
    // force - whether to force accessing the database and comparing the comp number
    async getCurrentComp(force = false) {
        if (force || this.#_currCompNum < 0)
            this.#setCompNumber((await this.#collection.find({}, { _id: 0 }).sort({ compNumber: -1 }).limit(1).toArray())[0].compNumber);
        return await this.getTahashComp(this.#_currCompNum);
    }

    /* get the current comp number */
    getCurrentCompNumber() {
        return this.#_currCompNum;
    }

    // validate the current comp - if the current comp isn't active, create a new comp
    // returns the new comp's TahashComp object.
    // extraEvents - an array of Events
    // force - whether to force creation of a new comp
    async validateCurrentComp(extraEvents = null, endDate = null, force = false) {
        const currComp = await this.getCurrentComp(true);

        // check if the current comp is still active
        if (!force && currComp.isActive())
            return;
        
        // create the new comp's source object
        const src = getNewCompSrc(currComp.compNumber + 1, extraEvents, null, endDate);

        // create a new comp and save it to the database
        const newComp = new TahashComp(this, src);
        newComp.initScrambles();
        await newComp.saveToDB();
        this.#setCompNumber(this.#_currCompNum + 1);
    }

    #setCompNumber(newCompNumber) {
        this.#_currCompNum = newCompNumber;
        if (this.#userManager)
            this.#userManager.setCompNumber(newCompNumber);
    }

    // an array of all the saved comps in the database
    async getAllComps() {
        return await this.#collection.find().project({ _id: 0 }).toArray();
    }

    // update the submission state for a user's submission
    // returns whether updating was successful
    async updateSubmissionState(compNumber, eventId, userId, newSubmissionState) {
        if (!this.compExists(compNumber))
            return false;

        const res = await this.#collection.updateOne({
            compNumber: compNumber,
            "data.eventId": eventId,
            "data.results.userId": userId
        },
        {
            $set: { "data.$[event].results.$[result].submissionState": newSubmissionState }
        },
        {
            arrayFilters: [
                { "event.eventId": eventId },
                { "result.userId": userId }
            ]
        });

        return res.matchedCount > 0;
    }
}

// get tahash comp data as a database document object data
function compDataToDocData(compData) {
    const docData = [];

    // replace CompEvent with just id
    compData ??= [];
    for (let i = 0; i < compData.length; i++) {
        docData.push({
            eventId: compData[i].event.eventId,
            scrambles: compData[i].scrambles,
            results: compData[i].results
        });
    }

    return docData;
}

// get database document object data as tahash comp data
function docDataToCompData(docData) {
    const compData = [];

    // replace id with event
    docData ??= [];
    for (let i = 0; i < docData.length; i++) {
        compData.push({
            event: getEventById(docData[i].eventId),
            scrambles: docData[i].scrambles,
            results: docData[i].results
        });
    }

    return compData;
}
