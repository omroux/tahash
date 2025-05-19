import { getEventById } from "../CompEvent.js";
import { getNewCompSrc, TahashComp } from "./TahashComp.js";

// Manages the "comps" collection
export class CompManager {
    #collection;
    #_currCompNum = -1;

    // Construct a CompManager
    constructor(compsCollection) {
        this.#collection = compsCollection;
    }

    // initialize comps collection if it's empty
    async initComps() {
        const count = await this.#collection.countDocuments({}, { limit: 1 });
        console.log("There are", count, "comps in the database.");
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
            this.#_currCompNum = (await this.#collection.find({}, { _id: 0 }).sort({ compNumber: -1 }).limit(1).toArray())[0].compNumber;
        return await this.getTahashComp(this.#_currCompNum);
    }

    getCurrentCompNumber() {
        return this.#_currCompNum;
    }

    // validate the current comp - if the current comp isn't active, create a new comp
    // returns the new comp's TahashComp object.
    // extraEvents - an array of Events
    // force - whether to force creation of a new comp
    async validateCurrentComp(extraEvents = null, endDate = null, force = false) {
        const currComp = await this.getCurrentComp();

        // check if the current comp is still active
        if (!force && currComp.isActive())
            return;
        
        // create the new comp's source object
        const src = getNewCompSrc(currComp.compNumber + 1, extraEvents, null, endDate);

        // create a new comp and save it to the database
        const newComp = new TahashComp(this, src);
        newComp.initScrambles();
        await newComp.saveToDB();
        this.#_currCompNum += 1;
    }

    // an array of all the saved comps in the database
    async getAllComps() {
        return await this.#collection.find().project({ _id: 0 }).toArray();
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
