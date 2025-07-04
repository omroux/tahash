import { PackedResult } from "./packed-result.js";
import { TimeFormat } from "../constants/time-formats.js";

/**
 * Best results for events using the {@link TimeFormat.ao5} format.
 */
export type AO5BestResults = {
    /**
     * Best single solve as a {@link PackedResult}.
     */
    single: PackedResult;

    /**
     * All 5 attempts of the average that contains the best single.
     */
    singleAttempts: PackedResult[];

    /**
     * Competition number where the best single was achieved.
     * - `>0`: tahash comp
     * - `0`: WCA comp
     * - `-1`: never competed
     */
    singleComp: number;

    /**
     * Best average of 5 result, in centiseconds.
     */
    average: number;

    /**
     * All 5 attempts that formed the best average.
     */
    averageAttempts: PackedResult[];

    /**
     * Competition number where the best average was achieved.
     * - `>0`: tahash comp
     * - `0`: WCA comp
     * - `-1`: never competed
     */
    averageComp: number;
};

/**
 * Best results for events using the {@link TimeFormat.mo3} format.
 */
export type MO3BestResults = {
    /**
     * Best single solve as a {@link PackedResult}.
     */
    single: PackedResult;

    /**
     * All 3 attempts of the mean that contains the best single.
     */
    singleAttempts: PackedResult[];

    /**
     * Competition number where the best single was achieved.
     * - `>0`: tahash comp
     * - `0`: WCA comp
     * - `-1`: never competed
     */
    singleComp: number;

    /**
     * Best mean of 3 result, in centiseconds.
     */
    mean: number;

    /**
     * All 3 attempts that formed the best mean.
     */
    meanAttempts: PackedResult[];

    /**
     * Competition number where the best mean was achieved.
     * - `>0`: tahash comp
     * - `0`: WCA comp
     * - `-1`: never competed
     */
    meanComp: number;
};

/**
 * BO3 (Best of 3) events use the same format as MO3.
 */
export type BO3BestResults = MO3BestResults;

/**
 * Best results for the 3x3 Multi-Blind format.
 */
export type MultiBestResults = {
    /**
     * Highest multi-blind score achieved (number of points).
     * - `<0`: never succeeded
     * - `>=0`: best total points
     */
    bestPoints: number;

    /**
     * Time of the attempt that achieved the best score, in centiseconds.
     */
    timeOfBestAttempt: number;

    /**
     * Competition number where the best multi-blind attempt was achieved.
     * - `>0`: tahash comp
     * - `0`: WCA comp
     * - `-1`: never competed
     */
    bestComp: number;
};

/**
 * A mapping from each `TimeFormat` to its corresponding result structure type.
 * Used to infer the type of `bestResults` for a given event.
 */
export type ResultFormatMap = {
    [TimeFormat.ao5]: AO5BestResults;
    [TimeFormat.mo3]: MO3BestResults;
    [TimeFormat.bo3]: BO3BestResults;
    [TimeFormat.multi]: MultiBestResults;
};
