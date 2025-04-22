// get an object with this structure: { error: err }
// obj - (optional) the object to add the error object to (additional information)
export const errorObject = (err, obj = {}) => {
    obj = obj ?? {};
    obj.error = err;
    return obj;
}

// result penalties
export const Penalties = Object.freeze({
    None: 0,
    Plus2: 1,
    DNF: 2
});
