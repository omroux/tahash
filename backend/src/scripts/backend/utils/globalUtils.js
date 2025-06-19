// get an object with this structure: { error: err }
// obj - (optional) the object to add the error object to (additional information)
export const errorObject = (err, obj = {}) => {
    obj = obj ?? {};
    obj.error = err;
    return obj;
}

// returns a random string in any length
// default charset is numbers and english alphabet (lowercase and uppercase)
// solution from https://stackoverflow.com/a/1349462/17702407
export function getRandomString(len = 8, charSet = null) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

/**
 * get the number of days between two dates
 * Take the difference between the dates and divide by milliseconds per day.
 * Round to nearest whole number to deal with DST.
 * solution from https://stackoverflow.com/a/543152
 */
export function datediff(first, second) {        
    return Math.round(Math.abs(second - first) / (1000 * 60 * 60 * 24));
}

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

