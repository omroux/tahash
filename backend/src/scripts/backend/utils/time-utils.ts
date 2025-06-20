import { centisPerUnit, maxTimeParts, TimeUnit } from "../../constants/time-unit.js";
import { PackedResult } from "../../interfaces/packed-result.js";
import { SolveResult } from "../../interfaces/solve-result.js";
import {formatTimeParts, formatTimeWithPenalty, TimeParts} from "../../interfaces/time-parts.js";
import {Penalty} from "../../constants/penalties.js";

/**
 * "Value" of a null {@link TimeParts} as centiseconds.
 */
export const NULL_TIME_CENTIS: number = -1;

/**
 * String that represents an invalid time.
 */
export const INVALID_TIME_STR: string = '-';

/**
 * String that represents a time with a DNF {@link Penalty}.
 */
export const DNF_STRING: string = "DNF";

/**
 * Suffix for a time with a plus 2 {@link Penalty}.
 */
export const PLUS_2_SUFFIX = '+';


/**
 * Convert centiseconds to a {@link TimeParts} object.
 * @param centis The number of centiseconds to convert.
 * @return
 * - If centis is non-negative, returns its respective {@link TimeParts}.
 * - Otherwise, returns `null`.
 */
export function unpackTime(centis: number): TimeParts | null {
    if (centis < 0)
        return null;

    const hours = Math.floor(centis / centisPerUnit[TimeUnit.Hours]);
    centis %= centisPerUnit[TimeUnit.Hours];
    const minutes = Math.floor(centis / centisPerUnit[TimeUnit.Minutes]);
    centis %= centisPerUnit[TimeUnit.Minutes];
    const seconds = Math.floor(centis / centisPerUnit[TimeUnit.Seconds]);
    centis %= centisPerUnit[TimeUnit.Seconds];

    // return { numHours: numHours, numMinutes: numMinutes, numSeconds: numSeconds, numMillis: centis };
    return { centis, seconds, minutes, hours };
}

/**
 * Convert each element in an array of {@link PackedResult} to its respective {@link SolveResult}.
 * @param packResults The given {@link PackedResult} array.
 */
export const unpackResults = (packResults: PackedResult[]): SolveResult[] =>
    packResults.map((packed) => ({ ...packed, time: unpackTime(packed.centis) }));


// TODO: do something about the previewStr stuff
// format a packed times array to an allTimes array
// returns the result
// export function unpackTimes(packed: PackedResult[]) : SolveResult[] {
//     const result: TimeParts[] = [];
//
//     for (let i = 0; i < packed.length; i++) {
//         const time: TimeParts = centisToTime(packed[i].centis);
//
//         let penalty = packed[i].penalty;
//         let displayTime: string | null = formatTimeWithPenalty(time, penalty);
//
//         if (!displayTime) {
//             // invalid time including penalty - count as DNF.
//             penalty = Penalties.DNF;
//             displayTime = DNF_STRING;
//         }
//
//         const newTime = { previewStr: displayTime,
//                         timeStr: displayTime,
//                         times: time,
//                         penalty: penalty };
//
//         if (packed[i].extraArgs != null)
//             newTime.extraArgs = packed[i].extraArgs;
//         results.push(newTime);
//     }
//
//     // return allTimes;
//     return packed.map((pr) => ({  }));
// }

// TODO: re-write with more context
// /**
//  * Convert a {@link PackedResult} into a centiseconds value, including penalty.
//  * @param packedResult
//  */
// export function getPureCentis(packedResult: PackedResult): number {
//     const res: TimeParts = applyPenalty();
// }
// convert a packed times array to a pure centiseconds array;
// for +2 - adds to seconds
// for DNF - sets time to -1
// /**
//  * Convert a packed times array to a pure centiseconds array.
//  * @param packedTimes
//  */
// export function getPureCentisArr(packedResults: PackedResult[]): number[] {
//     return packedTimes.map((pr) => );
//
//     const result = [];
//     for (let i = 0; i < packedTimes.length; i++) {
//         result.push(packedTimes[i].penalty == Penalties.DNF ? -1
//                 : packedTimes[i].penalty == Penalties.Plus2 ? (packedTimes[i].centis + 200)
//                 : packedTimes[i].centis);
//     }
//
//     return result;
// }

// returns an empty packed times object

