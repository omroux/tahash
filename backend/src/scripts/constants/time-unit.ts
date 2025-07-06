/**
 * A unit of time.
 */
export enum TimeUnit {
    Centis = "centis",
    Seconds = "seconds",
    Minutes = "minutes",
    Hours = "hours"
}

/**
 * Maximum amount of each {@link TimeUnit} amount allowed.
 * (For each unit, the number is the amount it isn't allowed to reach).
 */
export const maxTimeParts: Record<TimeUnit, number> = {
    [TimeUnit.Centis]: 100,
    [TimeUnit.Seconds]: 60,
    [TimeUnit.Minutes]: 60,
    [TimeUnit.Hours]: 2
};

/**
 * Determine the number of centiseconds in other time units.
 */
export const centisPerUnit: Record<TimeUnit, number> =  {
    [TimeUnit.Centis]: 1,
    [TimeUnit.Seconds]: 100,
    [TimeUnit.Minutes]: 60 * 100,
    [TimeUnit.Hours]: 60 * 60 * 100
};
