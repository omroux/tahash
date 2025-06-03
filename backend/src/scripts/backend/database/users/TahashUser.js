import { isFullPackedTimesArr } from "../../utils/timesUtils.js";

export class TahashUser {
    /* user manager */
    #manager;

    /* the user's wca account id */
    userId;

    /* comp number of the last comp the user competed in */
    lastComp;

    /* array of the user's records */
    records; /*
        user records structure:
        records: [
            {
                eventId: str,
                // bestResults contains the best results for the event, and for each type of result
                //      it also saves the comp number (as an integer)
                //      the comp number's values:
                //          * >0 -> a tahash comp
                //          * =0 -> a wca comp
                //          * -1 -> never competed
                bestResults:
                    --- different for each event type:
                    --  AO5:
                        { single, singleComp
                            average, averageComp }
                    --  MO3/BO3:
                        { single, singleComp
                            mean, meanComp }
                    --  BO3:
                        { single, singleComp,
                            mean, meanComp }
                    --  Multi:
                        { best total points / -1,
                        time of attempt with best score / -1,
                        bestComp }
                times: packedTimes (-- the full attempt)
            }
        ]
    */

    /* user's results of the last comp the user competed in */
    currCompTimes; /*
    user currCompTimes structure:
    currCompTimes: [
        {
            eventId: str,
            finished: bool,
            times: packedTimes
        }
    ]
    */

    // src - { userId, lastComp, records, currCompTimes }
    constructor(userManager, src) {
        if (!userManager) {
            console.error("Initializing TahashUser with no user manager");
            return;
        }
        this.#manager = userManager;

        if (!src) {
            console.error("Initializing TahashUser with no source");
            return;
        }

        if (!src.userId || src.userId < 0) {
            console.error("Initializing TahashUser with invalid user id");
            return;
        }
        this.userId = src.userId;

        this.lastComp = src.lastComp || -1;
        this.records = src.records || [];
        this.currCompTimes = src.currCompTimes || [];
    }

    // save this TahashUser using the linked UserManager
    async saveToDB() {
        await this.#manager.saveUser(this);
    }

    // get the user's results of a competition by the competition number
    // returns null if the user hasn't competed in this competition
    /* getCompResults(compNumber) {
        const compData = this.data.find((comp) => comp.compNumber == compNumber);
        return compData ? compData.results : null;
    }*/

    // set the results of a competition by its competition number
    // if compResults is null, removes the data of the competition from the user's data
    /* setCompResults(compNumber, compResults) {
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
    } */
    
    // set the times object for an event at a competition
    // times is an allTimes object
    // TODO: if times is null remove the user's submition for the event?
    /*setEventTimes(compNumber, eventId, times) {
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

        this.setCompResults(compResults);
    }*/

    /* set the times object for an event in the current competition.
    times is a packedTimes object of the attempt.
    overwrite: whether to overwrite an event the user already submitted
    */
    setEventTimes(eventId, times, overwrite = false) {
        if (!eventId || !times)
            return;

        if (!overwrite && this.finishedEvent(eventId))
            return;

        const finished = isFullPackedTimesArr(times);

        // if a submition of this event already exists, update it
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId) {
                this.currCompTimes[i].finished = finished;
                this.currCompTimes[i].times = times;
                return;
            }
        }

        // no submission yet, add it
        this.currCompTimes.push({
            eventId: eventId,
            finished: finished,
            times: times
        });
    }

    // get the times object for an event at a competition
    // returns null if the user hasn't competed in this event
    /*getEventTimes(compNumber, eventId) {
        const compResults = this.getCompResults(compNumber);
        if (!compResults)
            return null;

        const eventResults = compResults.find(r => r.eventId == eventId);
        return eventResults ? eventResults.times : null;
    }*/

    /* get the times object of an event in the current competition.
    returns a packedTimes object of the attempt */
    getEventTimes(eventId) {
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId)
                return this.currCompTimes[i].times;
        }

        return null;
    }

    // check if the user finished an event (submitted a full result) in a competition
    /* check if the user finished an event (submitted a full result) in the current competition */
    finishedEvent(eventId) {
        for (let i = 0; i < this.currCompTimes.length; i++) {
            if (this.currCompTimes[i].eventId == eventId)
                return this.currCompTimes[i].finished;
        }
        
        return false;
    }

    /* get event statuses for the current competition:
    for each event the user started to submit returns "unfinished",
    and for events the user submitted returns "finished".
    returns { eventId: status } */
    getEventStatuses() {
        const statuses = { };

        for (let i = 0; i < this.currCompTimes.length; i++)
            statuses[this.currCompTimes[i].eventId] = this.currCompTimes[i].finished ? "finished" : "unfinished";

        return statuses;
    }

    /* update the user's last comp number,
    and clear the user's saved times if they haven't competed in the current comp */
    updateCompNumber(newCompNumber) {
        if (newCompNumber <= this.lastComp)
            return;
        this.currCompTimes = [];
        this.lastComp = newCompNumber;
    }
}
