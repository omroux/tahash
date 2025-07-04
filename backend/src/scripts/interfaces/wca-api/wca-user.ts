/**
 * Represents a user returned by the WCA API (`/me` or `/users/:wca_id`).
 */
export interface WcaUser {
    /**
     * Internal numeric ID of the user in the WCA database.
     */
    id: number;

    /**
     * Full name of the user.
     */
    name: string;

    /**
     * WCA ID (e.g., "2021TEST01"), or `null` if the user has never competed.
     */
    wca_id: string;

    /**
     * Full name of the user's country (e.g., "Israel").
     */
    country: string;

    /**
     * URLs for the user's avatar image.
     */
    avatar: {
        /**
         * Direct URL to the user's avatar image.
         */
        url: string;
    };
}

/**
 * Response from the `/api/v0/me` endpoint.
 * Contains information about the currently authenticated user.
 */
export interface WcaMeResponse {
    me: WcaUser;
}

/**
 * Response from the `/api/v0/users/:wca_id` endpoint.
 * Contains information about a specific WCA user.
 */
export interface WcaUserResponse {
    user: WcaUser;
}
