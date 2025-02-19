import fetch from 'node-fetch'
import {errorObject} from "./global_utils.js";
import { config } from "dotenv";
config();

const appId = process.env.APP_ID;
const clientSecret = process.env.CLIENT_SECRET;
export const WCA_AUTH_URL = (hostname) => `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(`${hostname}/auth-callback`)}&response_type=code&scope=`;

// send a request to the WCA API, handles the response
// location: the path for the request url (e.g "/oauth/token")
// returns:
//      - if an error occurred, returns an error object
//      - otherwise, returns the data received as JSON
async function sendWCARequest(path, options) {
    const reqUrl = `https://www.worldcubeassociation.org${location}`;
    const httpRes = await fetch(reqUrl, options);
    if (!httpRes.ok)
        return errorObject(`HTTP Error: "${httpRes.statusText}"`);

    const data = await httpRes.json();
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

    return await sendWCARequest("/api/v0/me", options);
}

// uses an http request from the wca auth app (wca login page) to fetch an auth token
// hostname is the base url
// returns the response as json
// if an error has occurred, returns an object with a string field called error
export async function fetchToken(auth_code, hostname) {
    if (!auth_code) return errorObject("invalid (null) authentication code.");

    // build the HTTP Request
    const body = {
        client_id:        appId,
        client_secret:    clientSecret,
        grant_type:       "authorization_code",
        code:             auth_code,
        redirect_uri:     hostname + "/auth-callback"
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
