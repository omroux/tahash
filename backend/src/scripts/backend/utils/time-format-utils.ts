import {getPureCentisArr, PackedResult} from "../../interfaces/packed-result.js";
import {Penalties} from "../../constants/penalties.js";
import {DNF_STRING, NULL_TIME_CENTIS} from "./time-utils.js";
import {NumScrambles, TimeFormat} from "../../constants/time-formats.js";
import {calcMultiBldTotalPoints, ExtraArgsMbld} from "../../interfaces/event-extra-args/extra-args-mbld.js";
import {ExtraArgsFmc} from "../../interfaces/event-extra-args/extra-args-fmc.js";
import {CompEvent, getEventById} from "../database/comp-event.js";

/**
 * Calculate an average of 5 given the full attempt.
 * @return The result, in centiseconds.
 */
function calculateAO5(results: PackedResult[]): number {
    const maxDNF: number = 2;
    const pureCentis: number[] = getPureCentisArr(results);

    let dnfCount: number = 0;
    let average: number = 0;
    let lowest: number = pureCentis[0];
    let highest: number = pureCentis[0];

    for (let i = 0; i < NumScrambles[TimeFormat.ao5]; i++) {
        if (results[i].penalty === Penalties.DNF) {
            dnfCount++;
            continue;
        }

        if (dnfCount >= maxDNF)
            return NULL_TIME_CENTIS;

        average += pureCentis[i];

        lowest = Math.min(lowest, pureCentis[i]);
        highest = Math.max(highest, pureCentis[i]);
    }

    if (dnfCount == 0) // don't count highest if there's no DNF
        average -= highest;
    average -= lowest;

    average = Math.floor(average / NumScrambles[TimeFormat.ao5]);
    return average;
}

/**
 * Calculate a mean of 3 given the full attempt.
 * @return The result, in centiseconds.
 */
function calculateMO3(results: PackedResult[]): number {
    let mean = 0;
    const pureCentis: number[] = getPureCentisArr(results);

    for (let i = 0; i < NumScrambles[TimeFormat.mo3]; i++) {
        if (results[i].penalty == Penalties.DNF)
            return NULL_TIME_CENTIS; // max 1 dnf

        mean += pureCentis[i];
    }

    mean = Math.floor(mean / NumScrambles[TimeFormat.mo3]); // get the mean
    return mean;
}

/**
 * Calculate the best of 3 result given the full attempt.
 * @return The result, in centiseconds.
 */
function calculateBO3(results: PackedResult[]): number {
    let best = results[0].centis;

    for (let i = 1; i < NumScrambles[TimeFormat.bo3]; i++)
        best = Math.min(best, results[i].centis)
    
    return best;
}

/**
 * Calculate the result of a MultiBLD attempt.
 * @return Same as {@link calcMultiBldTotalPoints}.
 */
function calculateMultiResult(result: PackedResult<ExtraArgsMbld>): number {
    return calcMultiBldTotalPoints(result.extraArgs);
}

/**
 * Calculate the result of an FMC attempt.
 * @return The average number of moves of all attempts in the mean.
 */
function calculateFMCResult(results: PackedResult<ExtraArgsFmc>[]): number {
    let sum = 0;

    for (let i = 0; i < NumScrambles[TimeFormat.mo3]; i++) {
        if (results[i].penalty == Penalties.DNF)
            return NULL_TIME_CENTIS; // max 1 dnf

        if (!results[i].extraArgs.fmcSolution) {
            console.error("ERROR: No FMC solution. Returning -1 (time-format-utils.ts . calculateFMCResult)");
            return NULL_TIME_CENTIS;
        }

        sum += results[i].extraArgs.fmcSolution.length;
    }

    return Math.floor(sum / NumScrambles[TimeFormat.mo3]); // calculate and return the mean
}
// almost the same but in a cool one liner:
// return results.reduce((sum, r) => sum + r.extraArgs.fmcSolution.length, 0) / NumScrambles[TimeFormat.mo3];

/**
 * Get the final result of the event (as a string), given the times (e.g. an ao5, mo3, ...).
 * @param eventId The event's id.
 * @param results The attempts.
 * @return
 * - If the event id was not found, returns -1.
 * - Otherwise, returns the result.
 */
export function calcEventResult(eventId: string, results: PackedResult[]): number {
    const compEvent: CompEvent | undefined = getEventById(eventId);

    if (!compEvent)
        return -1;

    if (eventId === "fmc")
        return calculateFMCResult(results);

    switch (compEvent.timeFormat) {
        case TimeFormat.ao5:
            return calculateAO5(results);

        case TimeFormat.mo3:
            return calculateMO3(results);

        case TimeFormat.bo3:
            return calculateBO3(results);

        case TimeFormat.multi:
            return calculateMultiResult(results[0]);
    }
}

