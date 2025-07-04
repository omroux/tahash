import { ExtraArgs } from "./extra-args.js";
import {Penalties, Penalty} from "../constants/penalties.js";
import {maxTimeParts, TimeUnit} from "../constants/time-unit.js";
import {unpackTime} from "../backend/utils/time-utils.js";
import {formatTimeParts, formatTimeWithPenalty} from "./time-parts.js";
import {BaseResult} from "./base-result.js";
import {CompEvent, createEmptyArgs} from "../backend/database/comp-event.js";

/**
 * Packed result - smaller size.
 */
export interface PackedResult<ArgsType = any> extends BaseResult<ArgsType> {
    /**
     * The time of the solve represented in centiseconds.
     */
    centis: number;
}

/**
 * Apply a penalty on a centiseconds value.
 * @param centis The amount of centiseconds.
 * @param penalty The {@link Penalty} to apply.
 * @return The number of centiseconds that yields after applying the penalty.
 */
export function applyPenaltyCentis(centis: number, penalty: Penalty = Penalties.None): number {
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

/**
 * Get an empty instance of a {@link PackedResult}[] for an event.
 * @param compEvent The event.
 */
export function getEmptyPackedResults<T extends ExtraArgs | undefined>(compEvent: CompEvent): PackedResult<T>[] {
    const numScrs = compEvent.getNumScrambles();
    const results: PackedResult<T>[] = [];

    for (let i = 0; i < numScrs; i++) {
        results.push({
            centis: -1,
            penalty: Penalties.None,
            extraArgs: createEmptyArgs(compEvent.eventId) as T
        });
    }

    return results;
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

/**
 * Convert a {@link PackedResult} into a centiseconds value, including penalty.
 * @param packedResult
 */
export function getPureCentis(packedResult: PackedResult): number {
    return applyPenaltyCentis(packedResult.centis, packedResult.penalty);
}

/**
 * Convert each element in a {@link PackedResult}[] to pure centiseconds.
 * @return The respective array of centiseconds.
 */
export function getPureCentisArr(results: PackedResult[]): number[] {
    return results.map((r) => getPureCentis(r));
}
