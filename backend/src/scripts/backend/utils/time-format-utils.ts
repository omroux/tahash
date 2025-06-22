import {getPureCentisArr, PackedResult} from "../../interfaces/packed-result.js";
import {Penalties} from "../../constants/penalties.js";
import {DNF_STRING, NULL_TIME_CENTIS} from "./time-utils.js";
import {NumScrambles, TimeFormat} from "../../constants/time-formats.js";
import {ExtraArgsMbld} from "../../interfaces/event-extra-args/extra-args-mbld.js";

export function calculateAO5(results: PackedResult[]): number {
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

    average = Math.floor(average / 3);
    return average;
}

function calculateMO3(results: PackedResult[]): number {
    let mean = 0;
    const pureCentis: number[] = getPureCentisArr(results);

    for (let i = 0; i < NumScrambles[TimeFormat.mo3]; i++) {
        if (results[i].penalty == Penalties.DNF)
            return NULL_TIME_CENTIS; // max 1 dnf

        mean += pureCentis[i];
    }

    mean = Math.floor(mean / NumScrambles.); // get the mean
    return mean;
}

function calculateBO3(results: PackedResult[]): number {
    let best = results[0].centis;

    for (let i = 1; i < NumScrambles[TimeFormat.bo3]; i++)
        best = Math.min(best, results[i].centis)
    
    return best;
}

// TODO: come back to this
function calculateMultiResult(result: PackedResult<ExtraArgsMbld>) {
    const extraArgs = result.extraArgs;
    return `${extraArgs.numSuccess}/${extraArgs.numAttempt} ${centisToString(packedTimes[0].centis)}`;
}

function calculateFMCResult(packedTimes) {
    let mean = 0;

    for (let i = 0; i < packedTimes.length; i++) {
        if (packedTimes[i].penalty == Penalties.DNF)
            return DNF_STRING; // max 1 dnf

        if (!packedTimes.extraArgs.fmcSolution) {
            console.error("ERROR: No FMC solution. Returning -1 (CompEvent.calculateFMCResult)");
            return -1;
        }
        mean += packedTimes.extraArgs.fmcSolution.length;
    }

    mean = Math.floor(mean / 3); // get the mean
    return centisToString(mean);
}
