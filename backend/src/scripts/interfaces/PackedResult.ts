import { Penalty } from "../backend/utils/timeUtils.js";
import { ExtraArgs } from "./ExtraArgs.js";

/**
 * Packed result - smaller size.
 */
export interface PackedResult {
    centis: number;
    penalty: Penalty;
    extraArgs: ExtraArgs;
}
