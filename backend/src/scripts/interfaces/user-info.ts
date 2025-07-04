import {WcaMeResponse, WcaUser} from "./wca-api/wca-user.js";

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
export function wcaUserToUserInfo(wcaUser: WcaUser): UserInfo {
    return {
        id: wcaUser.id,
        name: wcaUser.name,
        wcaId: wcaUser.wca_id,
        country: wcaUser.country,
        photoUrl: wcaUser.avatar.url
    };
}
