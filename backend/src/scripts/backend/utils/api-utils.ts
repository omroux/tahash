import fetch, { RequestInit, Response } from "node-fetch";
import {errorObject} from "./global-utils.js";
import { config } from "dotenv";
import { getEnvConfigOptions, getHostname } from "../../../../server-utils.js";
import { getEnv } from "./env.js";

config(getEnvConfigOptions()); // configure .env file

/**
 * WCA OAuth application id (environment variable)
 */
const appId = getEnv("APP_ID"); // TODO: env

/**
 * WCA Application Secret
 */
const clientSecret = getEnv("CLIENT_SECRET"); // TODO: env

/**
 * WCA Api Path
 */
const wcaApiPath = "/api/v0";
export const WCA_AUTH_URL = (hostname: string): string => `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(`${hostname}/auth-callback`)}&response_type=code&scope=`;

// send a request to the WCA API, handles the response
// location: the path for the request url (e.g "/oauth/token")
// returns:
//      - if an error occurred, returns an error object
//      - otherwise, returns the data received as JSON

/**
 * sends a request to the WCA API. handles the response
 * @param path The path for the request url (e.g "/oauth/token").
 * @param options 
 * @returns 
 */
async function sendWCARequest(path: string, options: RequestInit = { method: 'GET' }) {
    const reqUrl = `https://www.worldcubeassociation.org${path}`;
    const httpRes: Response = await fetch(reqUrl, options);
    if (!httpRes.ok)
        return errorObject(`HTTP Error: "${httpRes.statusText}"`);

    const data: any = (await httpRes.json());
    if (data.error)
        return errorObject(`WCA API Error: "${data.error}" - ${data.error_description}`);

    return data;
}

// get the "WCA-me" user data with the given access token
// if an error has occurred, returns an object with a string field called error (api response)
export async function getUserData(token) {
    if (!token)  return errorObject("invalid (null) access token");

    const options = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    };

    return await sendWCARequest(`${wcaApiPath}/me`, options);
}

// get the "WCA-me" data of a user, given their user id (number)
// if an error has occurred, returns an object with a string field called error (api response)
export async function getUserDataByUserId(userId) {
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

    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    };

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
