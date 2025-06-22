/**
 * Represents an event's timing format.
 */
export enum TimeFormat {
    ao5 = "ao5",
    mo3 = "mo3",
    bo3 = "bo3",
    multi = "multi"
};

/**
 * The number of scrambles for each {@link TimeFormat}.
 * -1 -> generate seed
 */
export const NumScrambles: Record<TimeFormat, number> = {
    [TimeFormat.ao5]: 5,
    [TimeFormat.mo3]: 3,
    [TimeFormat.bo3]: 3,
    [TimeFormat.multi]: -1
};
