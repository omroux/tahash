import {ExtraArgs} from "../extra-args.js";

/**
 * Extra arguments for the FMC event.
 */
export interface ExtraArgsFmc {
    /**
     * An array of moves of an FMC solution.
     */
    fmcSolution: string[];
}