/**
 * returns a random string in any length
 * default charset is numbers and english alphabet (lowercase and uppercase)
 * solution from https://stackoverflow.com/a/1349462/17702407
 * @param len The length of the string.
 * @param charSet A string representing the character set (alphabet) to generate from (for example "ABC" would be the letters A B and C). If left null, uses english uppercase and lowercase letters and numbers 0-9.
 */
export function getRandomString(len: number = 8, charSet: string | null = null) {
    charSet = charSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString: string = '';

    for (let i = 0; i < len; i++) {
        const randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz + 1);
    }

    return randomString;
}

/**
 * Get the number of days between two dates (absolute value).
 * Take the difference between the dates and divide by milliseconds per day.
 * Round to nearest whole number to deal with DST.
 * solution from https://stackoverflow.com/a/543152
 * @param first First date.
 * @param second Second date.
 */
export function datediff(first: Date, second: Date): number {
    return datediffEpoch(first.getTime(), second.getTime());
}

/**
 * Get the number of days between two dates (absolute value).
 * Take the difference between the dates and divide by milliseconds per day.
 * Round to nearest whole number to deal with DST.
 * solution from https://stackoverflow.com/a/543152
 * @param first First date.
 * @param second Second date.
 */
export function datediffEpoch(first: number, second: number): number {
    return Math.round(Math.abs(second - first) / (1000 * 60 * 60 * 24));
}

/**
 * Format a number into a string of a certain length (pads with 0s).
 * @param num The number to format
 * @param digits The number of digits to pad
 */
export const pad = (num: number, digits: number = 2): string =>
    num.toString().padStart(digits, '0');

/**
 * Check if a string is a number.
 * @param {string} value The string to check.
 * @returns Whether the string represents a valid number.
 */
export function isNumber(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
}

/**
 * Check if a number is an integer.
 * @param x The number to check.
 */
export function isInteger(x: number): boolean {
    return x % 1 === 0;
}

