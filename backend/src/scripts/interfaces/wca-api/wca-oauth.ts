/**
 * Represents the OAuth token response from the WCA `/oauth/token` endpoint.
 * Used after exchanging an authorization code or refreshing a token.
 */
export interface WcaOAuthTokenResponse {
    /**
     * The access token to be used in authorized requests (as a Bearer token).
     */
    access_token: string;

    /**
     * The type of token returned.
     */
    token_type: "Bearer" | "bearer";

    /**
     * Lifetime of the access token in seconds (usually 7200).
     */
    expires_in: number;

    /**
     * A token that can be used to obtain a new access token after the current one expires.
     */
    refresh_token: string;

    /**
     * The granted access scope (e.g., "public").
     */
    scope: string;

    /**
     * Unix timestamp of when the token was created.
     */
    created_at: number;
}