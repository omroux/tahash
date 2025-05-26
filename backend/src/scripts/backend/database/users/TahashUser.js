import { isFullPackedTimesArr } from "../../utils/timesUtils.js";

export class TahashUser {
    #manager;
    userId = -1; // wca account id
    data;
    /*
    user data structure:
    data: [
        {
            compNumber: uint,
            results: [
                {
                    eventId: str,
                    times: { centis: <time in centiseconds>, penalty: 0|1|2 } (penalty: 0=nothing, 1=+2, 2=dnf)
                }
            ]
        }
    ]
    */

    // src - { userId, data }
    constructor(userManager, src) {
        this.#manager = userManager;

        src = src || {};
        this.userId = src.userId    || -1;
        this.data = src.data        || [];
    }

    // save this TahashUser using the linked UserManager
    async saveToDB() {
        await this.#manager.saveUser(this);
    }

    // get the user's results of a competition by the competition number
    // returns null if the user hasn't competed in this competition
    getCompResults(compNumber) {
        const compData = this.data.find((comp) => comp.compNumber == compNumber);
        return compData ? compData.results : null;
    }

    // set the results of a competition by its competition number
    // if compResults is null, removes the data of the competition from the user's data
    setCompResults(compNumber, compResults) {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].compNumber == compNumber) {
                if (compResults == null)
                    this.data.splice(i, 1);
                else
                    this.data[i].results = compResults;
                return;
            }
        }

        if (compResults)
            this.data.push({ compNumber: compNumber, results: compResults });
    }

    // set the times object for an event at a competition
    // times is an allTimes object
    // TODO: if times is null remove the user's submition for the event?
    setEventTimes(compNumber, eventId, times) {
        const compResults = this.getCompResults(compNumber);
        if (!compResults) { // first event submitted by the user to this competition
            this.setCompResults(compNumber, [ { eventId: eventId, times: times } ]);
            return;
        }

        let eventIndex = compResults.findIndex(r => r.eventId == eventId);
        if (eventIndex >= 0)
            compResults[eventIndex].times = times;
        else { // first time this event was submitted by the user to the competition
            compResults.push({ eventId: eventId, times: times });
            eventIndex = 0;
        }

        compResults[eventIndex].finished = isFullPackedTimesArr(results[eventIndex].times);
        this.setCompResults(compResults);
    }

    // get the times object for an event at a competition
    // returns null if the user hasn't competed in this event
    getEventTimes(compNumber, eventId) {
        const compResults = this.getCompResults(compNumber);
        if (!compResults)
            return null;

        const eventResults = compResults.find(r => r.eventId == eventId);
        return eventResults ? eventResults.times : null;
    }

    // check if the user finished an event (submitted a full result) in a competition
    finishedEvent(compNumber, eventId) {
        return isFullPackedTimesArr(this.getEventTimes(compNumber, eventId));
    }

    // returns { eventId: status }
    getEventStatuses(compNumber) {
        const statuses = { };
        const results = this.getCompResults(compNumber) ?? [];

        for (let i = 0; i < results.length; i++) {
            statuses[results[i].eventId] = isFullPackedTimesArr(results[i].times) ? "finished" : "unfinished";
        }

        return statuses;
    }
}


