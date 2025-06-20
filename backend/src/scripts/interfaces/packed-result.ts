import { ExtraArgs } from "./extra-args.js";
import {Penalties, Penalty} from "../constants/penalties.js";
import {maxTimeParts, TimeUnit} from "../constants/time-unit.js";
import {unpackTime} from "../backend/utils/time-utils.js";
import {formatTimeParts, formatTimeWithPenalty} from "./time-parts.js";

/**
 * Packed result - smaller size.
 */
export interface PackedResult {
    /**
     * The time of the solve represented in centiseconds.
     */
    centis: number;

    /**
     * The {@link Penalty} of the solve.
     */
    penalty: Penalty;

    /**
     * Extra arguments of the solve (undefined if there aren't any).
     */
    extraArgs: ExtraArgs;
}

/**
 * Apply a penalty on a centiseconds value.
 * @param centis The amount of centiseconds.
 * @param penalty The {@link Penalty} to apply.
 * @return The number of centiseconds that yields after applying the penalty.
 */
function applyPenaltyCentis(centis: number, penalty: Penalty = Penalties.None): number {
    return penalty == Penalties.Plus2
        ? (centis + 2 * maxTimeParts[TimeUnit.Centis])
        : centis;
}

/**
 * Formats an array of {@link PackedResult} times into readable strings.
 * @param packedResults The array of {@link PackedResult} to format.
 */
export const formatPackedResults = (packedResults: PackedResult[]): string[] =>
    packedResults.map((pr) => formatCentisWithPenalty(pr.centis, pr.penalty));

// TODO: fix
export function getEmptyPackedTimes(compEvent) {
    let nTimes = compEvent.getNumScrambles();
    nTimes = nTimes < 1 ? 1 : nTimes;
    const times = [];

    for (let i = 0; i < nTimes; i++) {
        const newTime = { centis: -1, penalty: Penalties.None, extraArgs: undefined };
        if (compEvent.emptyExtraArgs != null)
            newTime.extraArgs = Object.assign({ }, compEvent.emptyExtraArgs);

        times.push(newTime);
    }

    return times;
}

// given a packed times arr returns whether the user finished the event
/**
 * Check if a {@link PackedResult} array is full of valid solves.
 * @param packedResults
 */
export const isFullPackedTimesArr = (packedResults: PackedResult[]) =>
    // if the last result was submitted the event is finished
    (packedResults[packedResults.length - 1].centis > 0) || (packedResults[packedResults.length - 1].extraArgs != null);

/**
 * Convert a centiseconds value to its representing string format.
 * @param centis The amount of centiseconds.
 */
export const formatCentis = (centis: number): string =>
    formatTimeParts(unpackTime(centis));

/**
 * Convert a centiseconds value to its representing string format.
 * @param centis The amount of centiseconds.
 * @param penalty The {@link Penalty} of the attempt.
 */
export const formatCentisWithPenalty = (centis: number, penalty: Penalty): string =>
    formatTimeWithPenalty(unpackTime(centis), penalty);


