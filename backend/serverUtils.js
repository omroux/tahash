import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import ms from 'ms';
import { fetchRefreshToken, getUserData } from "./src/scripts/backend/utils/apiUtils.js";
import {MongoClient} from "mongodb";
import { CompManager } from './src/scripts/backend/database/comps/CompManager.js';
import { UserManager } from './src/scripts/backend/database/users/UserManager.js';


// -- General constants/properties
export const ADMINS_LIST = [ "2019SAHA01", "2022STON03", "2019KEHI01" ];
export const authTokenCookie = "authToken";
export const refreshTokenCookie = "refreshToken";
export const loggedInCookie = "loggedIn";
export const __dirname = path.dirname(new URL(import.meta.url).pathname);

// only update hostname if it hasn't been set yet
let _hostname = null;
export const getHostname = () => _hostname;
export const setHostname = (hostname) => {
    if (_hostname) return;

    console.log(`Setting hostname to '${hostname}'`);
    return _hostname = hostname;
};

// config options for reading .env file
let _envConfigOptions = null;
let _isContainer = false; // is the app running on a docker container
export const getEnvConfigOptions = () => {
    if (_envConfigOptions)
        return _envConfigOptions;

    const deployEnvPath = path.join(__dirname + "/../deploy/.env");
    _isContainer = !fs.existsSync(deployEnvPath);
    return _envConfigOptions = (_isContainer ? { } : { path: deployEnvPath });
};


// filePath = the page's file path *inside* src/views/pages, including .ejs extension. (src/views/pages/:filePath)
// stylesheets = *string[]* paths to extra css stylesheets (complete path)
export function renderPage(req, res, filePath, layoutOptions = {}, pageOptions = {}, stylesheets = []) {
    // redirect to lowercase page request (not really necessary, but better to have)
    const pathname = req.url;
    if (pathname.toLowerCase() !== pathname) {
        res.redirect(pathname.toLowerCase());
        return;
    }

    // render the file
    (async () => {
        pageOptions.loggedIn = isLoggedIn(req);
        ejs.renderFile(path.join(__dirname, "src/views/pages/", filePath), pageOptions ?? {}, async (err, str) => {
            if (err) {
                console.error(`Error occurred receiving ${filePath} page.\nDetails:`, err);
                res.status(404).send(err);
                return;
            }
            layoutOptions = layoutOptions ?? {};
            layoutOptions.content = str;
            layoutOptions.stylesheets = stylesheets ?? [];
    
            // first try to get the auth token cookie. if it exists, the user is logged in.
            layoutOptions.loggedIn = pageOptions.loggedIn;
    
            // comp number in header
            layoutOptions.compNumber = compManager().getCurrentCompNumber();
    
            res.render("layout.ejs", layoutOptions);
        });
    })();
}


// render the error page with a specific error
export function renderError(req, res, error = null) {
    renderPage(req,
        res,
        "error.ejs",
        { title: "Error" },
        { error: error });
}


// #region Cookie Management

// save a cookie
// cookieData is a JSON object or a string. (automatically stringifies)
// leave options null to use default cookieOptions (httpOnly=true, secure=true, sameSite=strict, maxAge=1 day)
// default value for maxAge is 1 day. maxAge is in milliseconds or in ms format (https://www.npmjs.com/package/ms)
export function storeCookie(res, cookieName, cookieData, maxAge = null, options = null) {
    // default cookie options
    options = options ?? {
        httpOnly:   true,               // Prevents JavaScript access (helps mitigate XSS)
        secure:     true,               // Ensures cookie is only sent over HTTPS
        sameSite:   'Strict',           // Prevents cross-site requests (mitigates CSRF)
        maxAge:     maxAge ?? 24 * 60 * 60  // Defaults to 1 day
      };

    // cookieData is not a string
    if (typeof(cookieData) !== "string")
        cookieData = JSON.stringify(cookieData);

    res.cookie(cookieName, cookieData, options);
}


// store auth token cookies
// tokenData is the full json response from the WCA API (assuming there wasn't an error)
// TODO: remove this and all other cookie management functions (and remove references) (EXCEPT TRYGETCOOKIE)
export function storeTokenCookies(res, tokenData) {
    storeCookie(res, authTokenCookie, {
        access_token:   tokenData.access_token
    }, ms(tokenData.expires_in + "s"));  // convert to milliseconds

    // store the refresh token for 7 days until the user will be required to generate a new token.
    storeCookie(res, refreshTokenCookie, { refresh_token:  tokenData.refresh_token }, ms('7d'));
    // res.setHeader("accessToken", tokenData.accessToken ?? null);
    // res.setHeader("refreshToken", tokenData.refreshToken ?? null);
}


// clear the authentication token cookies
export function clearTokenCookies(res) {
    res.clearCookie(authTokenCookie);
    res.clearCookie(refreshTokenCookie);
}


// check whether the request contains a specific cookie
// isJson:  whether to parse the cookie's value to JSON.
//          When `isJson=true`: if the cookie doesn't exist, or the cookie's value wasn't a JSON, returns null.
// returns:
//      - if the cookie doesn't exist, returns null.
//      - if the cookie exists, returns its value (according to `isJson`)
export function tryGetCookie(req, cookieName, isJson = true) {
    const cookieStr = req.cookies[cookieName];
    if (!cookieStr) return null;
    if (!isJson) return cookieStr;

    try { return JSON.parse(cookieStr); }
    catch { return null; }
}

// #endregion


const fromClientHeader = "from-client";
// check if a request was sent from a client
export const sentFromClient = (req) => (req.headers[fromClientHeader] === "true");


// retrieve the WCAMe information of a user
// needs both request and response in order to update the user's cookies. does not send or alter the response.
// returns:
//      - if the user was logged in, returns the WCA-Me json object of the user
//      - if the user wasn't logged in, returns null
/*export async function retrieveWCAMe(req, res) {
    // no cookie -> redirect to /login
    let authToken = tryGetCookie(req, authTokenCookie);
    if (!authToken)
        res.clearCookie(authTokenCookie);
    else {
        // get the user's data using the access token
        let userData = await getUserData(authToken.access_token);

        // data received successfully
        if (userData.me)
            return userData.me;
    }

    // generate a new token (with refresh token)
    let refresh = tryGetCookie(req, refreshTokenCookie);
    const tokenData = await fetchRefreshToken(refresh?.refresh_token);
    if (tokenData.error) {
        clearTokenCookies(res);
        return null;
    }

    // store the cookies with the new token
    storeTokenCookies(res, tokenData);

    // try to use the new refresh token
    // note: we're not reloading the page in order to avoid an infinite loop of refreshing the page
    let userData = await getUserData(tokenData.access_token);
    return userData ? userData.me : null; // automatically null if it doesn't exist
}*/

export async function retrieveWCAMe(req) {
    const accessTokenHeader = "access-token";
    const accessToken = req.headers[accessTokenHeader];
    if (!accessToken)
        return null;

    const userData = await getUserData(accessToken);
    return userData.me ? userData.me : null;
}


// optimized function to check whether the user is logged in.
export const isLoggedIn = (req) => tryGetCookie(req, loggedInCookie, false) != null;


// #region Database Management

// database variables
const tahashDbName = "tahash";
const compsCollectionName = "comps";
const usersCollectionName = "users";

let _tahashDb = null;
let _compManager = null;
let _userManager = null;
export const tahashDB = () => _tahashDb;
export const compManager = () => _compManager;
export const userManager = () => _userManager;

// initialize MongoDB and load tahash database
export async function initDatabase() {
    if (_tahashDb != null) {
        console.warn("database is already initialized.");
        return _tahashDb;
    }

    // retrieve mongodb host url
    const mongoUsername = process.env.MONGO_INITDB_ROOT_USERNAME;
    const mongoPassword = process.env.MONGO_INITDB_ROOT_PASSWORD;
    const host = _isContainer ? process.env.MONGO_SERVICE : "localhost";

    // use the credentials, if they exist
    const hasCredentials = (mongoUsername && mongoPassword);
    const mongoUrlPrefix = hasCredentials ? `${mongoUsername}:${mongoPassword}@` : "";
    const mongoUrlParams = hasCredentials ? "?authSource=admin" : "";

    // build mongo connection string
    const connectionString = `mongodb://${mongoUrlPrefix}${host}:27017/tahash${mongoUrlParams}`;

    // connect to Mongo and retrieve database
    const mongoClient = await MongoClient.connect(connectionString, { connectTimeoutMS: 5000 });
    _tahashDb = mongoClient.db(tahashDbName);

    // get comps and users collections
    _userManager = new UserManager(_tahashDb.collection(usersCollectionName));
    _compManager = new CompManager(_tahashDb.collection(compsCollectionName), _userManager);

    // initialize comps collection in case it's empty
    await _compManager.initComps();

    // validate current comp
    await _compManager.validateCurrentComp();

    return _tahashDb;
}

// #endregion

// #region admin dashboard

// #endregion
