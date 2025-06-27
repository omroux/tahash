import fetch, { RequestInit, Response } from "node-fetch";
import { config } from "dotenv";
import { getEnvConfigOptions, getHostname } from "../../../../server-utils.js";
import { getEnv } from "./env.js";
import {ErrorObject, errorObject} from "../../interfaces/error-object.js";
import {wcaUserToWcaUserInfo, UserInfo} from "../../interfaces/user-info.js";
import {WcaMeResponse, WcaUser} from "../../interfaces/wca-api/wca-user.js";

config(getEnvConfigOptions()); // configure .env file

/**
 * WCA OAuth application id (environment variable)
 */
const appId = getEnv("APP_ID");

/**
 * WCA Application Secret
 */
const clientSecret = getEnv("CLIENT_SECRET");

/**
 * WCA Api Path
 */
const wcaApiPath = "/api/v0";
export const WCA_AUTH_URL = (hostname: string): string =>
    `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(`${hostname}/auth-callback`)}&response_type=code&scope=`;

/**
 * Sends a request to the WCA API. handles the response
 * @param path The path for the request url (e.g "/oauth/token").
 * @param options Options for the fetch request.
 * @returns
 * - If an error occurred, returns an {@link ErrorObject} with information.
 * - Otherwise, returns the data received from the API as a JSON object.
 */
async function sendWCARequest(path: string, options: RequestInit = { method: 'GET' }): Promise<ErrorObject | any> {
    const reqUrl = `https://www.worldcubeassociation.org${path}`;
    const httpRes: Response = await fetch(reqUrl, options);
    if (!httpRes.ok)
        return errorObject(`HTTP Error: "${httpRes.statusText}"`);

    const data: any = await httpRes.json();
    if (data.error)
        return errorObject(`WCA API Error: "${data.error}" - ${data.error_description}`);

    return data;
}

/**
 * Get the {@link UserInfo} of a user using an access token.
 * @param token The user's authentication token.
 * @return
 * - If an error occurred, returns an {@link ErrorObject} with details.
 * - Otherwise, returns the requested {@link UserInfo}.
 */
export async function getUserDataByToken(token: string): Promise<ErrorObject | UserInfo> {
    if (!token)  return errorObject("invalid (null) access token");

    const options = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    };

    const response: ErrorObject | any = await sendWCARequest(`${wcaApiPath}/me`, options);
    if (response.error)
        return response as ErrorObject;

    // no error, build and return the WCAUserData
    const wcaMeData: WcaMeResponse = response as WcaMeResponse;
    return wcaUserToWcaUserInfo(wcaMeData.me);
}

// get the "WCA-me" data of a user, given their user id (number)
// if an error has occurred, returns an object with a string field called error (api response)
export async function getUserDataByUserId(userId: number): Promise<ErrorObject | UserInfo> {
    if (!userId || isNaN(userId)) return errorObject("invalid userId");
    return (await sendWCARequest(`${wcaApiPath}/users/${userId}`)).user;
}

/* returns a "records" array of the user's WCA records */
// TODO: implement getWCARecordsOfUser
export async function getWCARecordsOfUser(userId) {
    console.error("getWCARecordsOfUser not implemented");
    return [];
}

// uses an http request from the wca auth app (wca login page) to fetch an auth token
// hostname is the base url
// returns the response as json
// if an error has occurred, returns an object with a string field called error
/* JSON RETURN FORMAT:
{
    "access_token": "0srFoq3y6_8IN0lu4iSl4Mlv5d2IAUuVFDeJWwPQTKo",
    "token_type": "Bearer",
    "expires_in": 7200,
    "refresh_token": "DkuIE_1QWfq7bZSdXv-Ul0OZWRduIzCAmySra_ziZdk",
    "scope": "public",
    "created_at": 1750961954
}
 */
export async function fetchToken(auth_code) {
    if (!auth_code) return errorObject("invalid (null) authentication code.");

    // build the HTTP Request
    const body = {
        client_id:        appId,
        client_secret:    clientSecret,
        grant_type:       "authorization_code",
        code:             auth_code,
        redirect_uri:     getHostname() + "/auth-callback"
    };

    /*

    curl -X POST -d 'client_id=4p0nZQNQLG3es117azdy9QXHikPURSTSQ-BR3WhFCA4' -d 'client_secret=_faDjKU89UopU2BuLutMmw7E6bXrpycrJ4jMhMmfa3A' -d 'grant_type=authorization_code' -d 'code=9b9GXScCc_31WNxQUDyZPe0Z2n6yzRrh2vDlVRIzZ7o' -d 'redirect_uri=http://localhost:3000/auth-callback'


     */

    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    };

    // curl -X POST --json '{client_id: "}
    // -h 'Content-Type=application/json'

    return await sendWCARequest("/oauth/token", options);
}

// hostname is the base url
// returns the response as json
// if an error has occurred, returns an object with a string field called error
export async function fetchRefreshToken(refreshToken) {
    if (!refreshToken)  return errorObject("invalid (null) refresh token");

    const body = {
        client_id:        appId,
        client_secret:    clientSecret,
        grant_type:       "refresh_token",
        refresh_token:    refreshToken
    };

    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    };

    return await sendWCARequest("/oauth/token", options);
}
