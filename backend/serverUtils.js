import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import ms from 'ms';
import { fetchRefreshToken, getUserData } from "./src/scripts/backend/apiUtils.js";
import {MongoClient} from "mongodb";
import { WeekManager } from './src/scripts/backend/database/weeks/WeekManager.js';
import { UserManager } from './src/scripts/backend/database/users/UserManager.js';


// -- General constants/properties
export const authTokenCookie = "authToken";
export const refreshTokenCookie = "refreshToken";
export const __dirname = path.dirname(new URL(import.meta.url).pathname);

// config data property
let _configData = null;
let _hostname = null;
export const getConfigData = () => _configData ?? (_configData = readConfigFile());
export const getHostname = () =>
        _hostname ?? (_hostname = getConfigData().baseUrl + (getConfigData().local ? `:${getConfigData().port}` : ""));

// config options for reading .env file
export const envConfigOptions = getConfigData().local ? { path: path.join(__dirname + "/.env") } : {};


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
        layoutOptions.loggedIn = await isLoggedIn(req, res);

        // week number in header
        layoutOptions.weekNumber = weekManager().getLastWeekNumber();

        res.render("layout.ejs", layoutOptions);
    });
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
export function storeTokenCookies(res, tokenData) {
    storeCookie(res, authTokenCookie, {
        access_token:   tokenData.access_token
    }, tokenData.expires_in * 60);  // convert to milliseconds

    // store the refresh token for 7 days until the user will be required to generate a new token.
    storeCookie(res, refreshTokenCookie, { refresh_token:  tokenData.refresh_token }, ms('7d'));
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


// read the config file (default/local)
// handles exceptions (by throwing them :p )
// returns the configData
export function readConfigFile() {
    const localConfigFile = "config.local.json";

    // config data defaults to website config
    let configData = {
        "port": 3000,
        "baseUrl": "https://comp.kehilush.com",
        "local": false
    };

    // read content from local file, if it exists
    if (fs.existsSync(localConfigFile)) {
        try { configData = JSON.parse(fs.readFileSync(localConfigFile, 'utf-8')); }
        catch (err) {
            console.error("Error reading config file.");
            throw err;
        }

        if (!configData.baseUrl || (configData.local === undefined) || !configData.port)
            throw Error("Error: invalid config file.");

        // validate port
        const parsedPort = parseInt(configData.port.toString(), 10);
        // check if the port is a valid number and within the valid range (0–65535)
        if (isNaN(parsedPort) || parsedPort < 0 && parsedPort > 65535)
            throw Error("Invalid port in config file.");
        configData.port = parsedPort;

        // validate "local" boolean
        configData.local = configData.local.toString();
        if (configData.local === "true")        configData.local = true;
        else if (configData.local === "false")  configData.local = false;
        else throw Error("Config 'local' has to be a valid boolean");
    }

    // build hostname
    return configData;
}


const fromClientHeader = "from-client";
// check if a request was sent from a client
export const sentFromClient = (req) => (req.headers[fromClientHeader] === "true");


// retrieve the WCAMe information of a user
// needs both request and response in order to update the user's cookies. does not send or alter the response.
// returns:
//      - if the user was logged in, returns the WCA-Me json object of the user
//      - if the user wasn't logged in, returns null
export async function retrieveWCAMe(req, res) {
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
}


// optimized function to check whether the user is logged in.
// needs both request and response in order to update the user's cookies. does not send or alter the response.
export const isLoggedIn = async (req, res) => (tryGetCookie(req, authTokenCookie)
            ? true
            : ((await retrieveWCAMe(req, res)) != null));


// #region Database Management

// database variables
const tahashDbName = "tahash";
const weeksCollectionName = "weeks";
const usersCollectionName = "users";

let _tahashDb = null;
let _weekManager = null;
let _userManager = null;
export const tahashDB = () => _tahashDb;
export const weekManager = () => _weekManager;
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
    const host = process.env.MONGO_SERVICE || (getConfigData().local ? "localhost" : "mongodb");

    // use the credentials, if they exist
    const hasCredentials = (mongoUsername && mongoPassword);
    const mongoUrlPrefix = hasCredentials ? `${mongoUsername}:${mongoPassword}@` : "";
    const mongoUrlParams = hasCredentials ? "?authSource=admin" : "";

    // build mongo connection string
    const connectionString = `mongodb://${mongoUrlPrefix}${host}:27017/tahash${mongoUrlParams}`;

    // connect to Mongo and retrieve database
    const mongoClient = await MongoClient.connect(connectionString, { connectTimeoutMS: 5000 });
    _tahashDb = mongoClient.db(tahashDbName);

    // get weeks and users collections
    _weekManager = new WeekManager(_tahashDb.collection(weeksCollectionName));
    _userManager = new UserManager(_tahashDb.collection(usersCollectionName));

    return _tahashDb;
}

// #endregion
