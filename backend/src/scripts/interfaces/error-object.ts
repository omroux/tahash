/**
 * Represents an error.
 */
export interface ErrorObject {
    /**
     * A string detailing the error.
     */
    error: string;

    /**
     * An optional object detailing the error.
     */
    obj: any | undefined;
}


/**
 * Create an error object.
 * @param error A string detailing the error.
 * @param obj An optional object detailing the error.
 */
export const errorObject = (error: string, obj: any | undefined = undefined): ErrorObject =>
    ({ error, obj });
