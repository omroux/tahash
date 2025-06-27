import {WcaMeResponse} from "./wca-api/wca-user.js";

/**
 * Represents a user's information from the WCA database.
 */
export interface UserInfo {
    id: number,
    name: string,
    wcaId: string,
    country: string,
    photoUrl: string
}

/**
 * Convert "WCA-me" (user data from API) to a {@link UserInfo}.
 * @param wcaUser The {@link WcaMeResponse} object from the api.
 */
export function wcaUserToWcaUserInfo(wcaUser: WcaMeResponse): UserInfo {
    return {
        id: wcaUser.me.id,
        name: wcaUser.me.name,
        wcaId: wcaUser.me.wca_id,
        country: wcaUser.me.country,
        photoUrl: wcaUser.me.avatar.url
    };
}
