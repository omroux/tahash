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
 * Get a the value of an object's parameter as a number.
 * Returns null if the object was not found or it's not a valid number.
 * @param {any} obj - The object to look in
 * @param {string} propertyName - The property's name
 * @returns {number | null} The property's value
 */
export function getNumberValue(obj, propertyName) {
    const num = Number(obj[propertyName]);
    return isNaN(num) ? null : num;
}
