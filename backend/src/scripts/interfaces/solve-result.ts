import {packTime, TimeParts} from "./time-parts.js";
import {BaseResult} from "./base-result.js";
import {PackedResult} from "./packed-result.js";

/**
 * Result of a single solve.
 * Represents the solve's result.
 */
export interface SolveResult extends BaseResult {
    /**
     * The time of the solve.
     */
    time: TimeParts | null;
}

/**
 * Convert each element in an array of {@link SolveResult} to its respective {@link PackedResult}.
 * @param results The given {@link SolveResult} array.
 * @return The result {@link PackedResult}[]. For every `null` time, uses
 */
export const packResults = (results: SolveResult[]): PackedResult[] =>
    results.map((result) => ({ ...result, centis: packTime(result.time) }));

/**
 * Check if a {@link SolveResult} array is full of valid solves (valid times).
 * @param arr The array of {@link SolveResult}s.
 */
export const isFullResultArr = (arr: SolveResult[]): boolean =>
    (arr[arr.length - 1].time !== null) || (arr[arr.length - 1].extraArgs !== undefined); // full arr valid <=> last solve is valid
// O(n) alternative - arr.some((sr) => sr.time === null && sr.extraArgs === undefined);

