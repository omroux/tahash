import { Penalty } from "../backend/utils/timeUtils.js";
import { ExtraArgs } from "./ExtraArgs.js";
import { TimeParts } from "./TimeParts.js";

/**
 * Result of a single solve.
 * Represents the solve's result.
 */
export interface SolveResult {
    /**
     * The time of the solve.
     */
    time: TimeParts | null;

    /**
     * The penalty of the solve.
     */
    penalty: Penalty;

    /**
     * Extra arguments of the solve (undefined if there aren't any).
     */
    extraArgs: ExtraArgs;
}
