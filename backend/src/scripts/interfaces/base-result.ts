import {Penalties, Penalty} from "../constants/penalties.js";
import {ExtraArgs} from "./extra-args.js";

/**
 * Represents the result of a solve without the time.
 */
export interface BaseResult {
    /**
     * The penalty of the solve.
     */
    penalty: Penalty;

    /**
     * Extra arguments of the solve (undefined if there aren't any).
     */
    extraArgs: ExtraArgs;
}

/**
 * Check if an array of {@link BaseResult} have a DNF.
 * @param results The array to search.
 */
export const hasDNF = (results: BaseResult[]): boolean =>
    results.some((r) => r.penalty == Penalties.DNF);