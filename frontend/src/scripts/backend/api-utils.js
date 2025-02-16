import fetch from 'node-fetch'
import { config } from "dotenv";
config();

const appId = process.env.APP_ID;
const clientSecret = process.env.CLIENT_SECRET;
export const WCA_AUTH_URL = (hostname) => `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(`${hostname}/auth-callback`)}&response_type=code&scope=`;

// uses an http request from the wca auth app (wca login page) to fetch an auth token
// hostname is the name
// returns the response as json
// if an error has occurred, returns an object with a string field called error
export async function fetchToken(req, hostname) {
    const auth_code = req.query.code;

    // build the HTTP Request
    const tokenReqUrl = 'https://www.worldcubeassociation.org/oauth/token';
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
          client_id:        appId,
          client_secret:    clientSecret,
          grant_type:       "authorization_code",
          code:             auth_code,
          redirect_uri:     hostname + "/auth-callback"
      })
    };

    // send request
    console.log(options);
    const httpRes = await fetch(tokenReqUrl, options);
//
    if (!httpRes.ok)
        return { error: `HTTP Error: "${httpRes.statusText}"` };

    const data = await httpRes.json();
    if (data.error)
        return { error: `API Error: "${data.error}" - ${data.error_description}` };

    return data;
}


// get the "WCA-me" user data with the given token
// if an error has occurred, returns an object with a string field called error (api response)
export async function getUserData(token) {
    const reqUrl = "https://www.worldcubeassociation.org/api/v0/me";
    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
      };

    const httpRes = await fetch(reqUrl, options);
    if (!httpRes.ok)
        return { error: `HTTP Error: "${httpRes.statusText}"` };

    const data = await httpRes.json();
    if (data.error)
        return { error: `API Error: "${data.error}" - ${data.error_description}` };

    return data;
}
