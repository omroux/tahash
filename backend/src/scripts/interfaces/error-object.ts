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
    context?: any;
}

/**
 * Create an error object.
 * @param error A string detailing the error.
 * @param context An optional object detailing the error.
 */
export const errorObject = (error: string, context: any = undefined): ErrorObject =>
    ({ error, context: context });

/**
 * Check if something is an {@link ErrorObject}.
 * Behaves as a TypeScript type guard.
 */
export function isErrorObject(data: any): data is ErrorObject {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.error === 'string'
    );
}

