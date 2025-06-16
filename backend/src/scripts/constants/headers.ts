import {Request} from "express";

/**
 * Contains the names of HTTP headers used throughout the application.
 * Use these constants when reading or writing request and response headers to ensure consistency.
 */
export const Headers = {
    FromClient: "from-client",
    Hostname: "hostname",
    UserId: "user-id",
    WcaId: "wca-id",
    EventId: "event-id",
    AccessToken: "access-token",
    AuthCode: "auth-code",
    RefreshToken: "refresh-token"
} as const;

/**
 * Key of {@link Headers}
 */
export type HeaderKey = typeof Headers[keyof typeof Headers];

/**
 * Get the value of a header from an HTTP request.
 * @param req The request's {@link Request} object.
 * @param headerKey The key of the desired {@link Header}.
 * @returns The header if it was found. Otherwise, returns `undefined`.
 */
export function getHeader(req: Request, header: HeaderKey): string | undefined {
    return req.get(header);
}

/**
 * Get the value of a header from an HTTP request and parse it as a number.
 * @param req The request's {@link Request} object.
 * @param headerKey The key of the desired {@link Header}.
 * @returns The numeric value if the header exists and can be parsed as a valid number. Otherwise, returns `undefined`.
 */
export function getHeaderNumber(req: Request, headerKey: HeaderKey): number | undefined {
    const value = req.get(headerKey);
    if (value === undefined) return undefined;

    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
}
