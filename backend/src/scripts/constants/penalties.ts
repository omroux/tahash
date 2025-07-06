/**
 * An attempt's penalty.
 */
export const Penalties = Object.freeze({
    None: 0,
    Plus2: 1,
    DNF: 2
});

export type Penalty = typeof Penalties[keyof typeof Penalties];
