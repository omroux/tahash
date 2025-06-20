import { Request } from "express";

/**
 * Contains the names of query string parameters accepted by various HTTP endpoints.
 * Use these constants to ensure consistency when reading or writing query parameters in requests.
 */
export const QueryParams = {
    CompNumber: "comp-number",
    EventId: "event-id"
};

/**
 * A query parameter key
 */
export type QueryParam = typeof QueryParams[keyof typeof QueryParams];

/**
 * Get a query parameter from an HTTP request's {@link Request} object.
 * @param req The {@link Request} object.
 * @param param The query parameter's name to find.
 * @returns If the parameter was found, returns it. Otherwise, returns undefined.
 */
export function getQueryParam(req: Request, param: QueryParam): string | undefined {
  const value = req.query[param];
  return value == undefined ? undefined : (value as string);
}

/**
 * Get the value of a query parameter from an HTTP request and parse it as a number.
 * @param req The request's {@link Request} object.
 * @param paramKey The key of the query parameter.
 * @returns The numeric value if the parameter exists and can be parsed as a valid number, otherwise `undefined`.
 */
export function getQueryParamNumber(req: Request, paramKey: string): number | undefined {
    const strValue = getQueryParam(req, paramKey);
    if (strValue === undefined) return undefined;

    const parsed = Number(strValue);
    return isNaN(parsed) ? undefined : parsed;
}
