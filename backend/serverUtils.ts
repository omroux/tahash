import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import { fetchRefreshToken, getUserData } from "./src/scripts/backend/utils/apiUtils.js";
import {Db, MongoClient } from "mongodb";
import {Request, Response} from "express";
import { CompManager } from './src/scripts/backend/database/comps/CompManager.js';
import { UserManager } from './src/scripts/backend/database/users/UserManager.js';


// -- General constants/properties
/**
 * The name of the directory the process is running on
 */
export const __dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * The list of the WCA IDs of the website's admins
 */
export const ADMINS_LIST: string[] = [ "2019SAHA01", "2022STON03", "2019KEHI01" ];

/**
 * The key of the logged in cookie (whether the user is logged in)
 */
export const loggedInCookie = "loggedIn";

// #region Hostname Control
// only update hostname if it hasn't been set yet
/**
 * The hostname the website is running on. Null 
 */
let _hostname: string | undefined = undefined;

/**
 * Get the hostname the website is running on
 * @returns If the hostname was set, returns the hostname. Otherwise, returns null.
 */
export const getHostname = (): string | undefined => _hostname;

/**
 * Set the website's hostname if it hasn't been set yet.
 * @param hostname The new hostname
 */
export const setHostname = (hostname: string): void => {
    if (_hostname)
        return;

    console.log(`Setting hostname to '${hostname}'`);
    _hostname = hostname;
};
// #endregion

// #region Reading Config File
// config options for reading .env file
/**
 * Environment file path
 */
let _envPath: string | undefined = "";

/**
 * Whether the process running on a docker container
 */
let _isContainer = false; // is the app running on a docker container

/**
 * Get the config file reading options
 */
export function getEnvConfigOptions(): { path?: string } {
    if (_envPath)
        return { path: _envPath };

    const deployEnvPath = path.join(__dirname + "/../deploy/.env");
    _isContainer = !fs.existsSync(deployEnvPath);
    return  (_isContainer ? { } : { path: deployEnvPath });
};
// #endregion

// #region Page Rendering

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
export function renderError(req, res, error) {
    renderPage(req,
        res,
        "error.ejs",
        { title: "Error" },
        { error: error });
}

// #endregion


// #region Cookie Management

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

const accessTokenHeader = "access-token";
/* retrieve WCA-me data from an http request.
    req is a request containing an access token header.
    returns null if the input was invalid */
export async function retrieveWCAMe(req) {
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

let _tahashDb: Db | null;
let _compManager: CompManager | null;
let _userManager: UserManager | null;

/**
 * Get the singleton instance of the current active tahash database.
 * @returns The singleton instanec of the Db, or `undefined` if it hasn't been initialized yet.
 */
export const tahashDB = (): Db | null => _tahashDb;

/**
 * The current active {@link CompManager}.
 * @returns {CompManager} The singleton instance of the {@link CompManager}, or `undefined` if it has not been initialized yet.
 */
export const compManager = (): CompManager | null => _compManager;

/**
 * Get the instance of the current active {@link UserManager}.
 * @returns {UserManager} The singleton instance of the {@link UserManager}, or `undefined` if it has not been initialized yet.
 */
export const userManager = (): UserManager | null => _userManager;

/**
 * Initialize the MongoDB connection, load the database, {@link CompManager} and {@link UserManager}.
 * @returns {Db} The MongoDB database connected to.
 */
export async function initDatabase(): Promise<Db> {
    if (_tahashDb != null) {
        console.warn("database is already initialized.");
        return _tahashDb;
    }

    // retrieve mongodb host url
    const mongoUsername: string | undefined = process.env.MONGO_INITDB_ROOT_USERNAME;
    const mongoPassword: string | undefined = process.env.MONGO_INITDB_ROOT_PASSWORD;
    const host: string | undefined = _isContainer ? process.env.MONGO_SERVICE : "localhost";

    // use the credentials, if they exist
    const hasCredentials: boolean = !!(mongoUsername && mongoPassword);
    const mongoUrlPrefix = hasCredentials ? `${mongoUsername}:${mongoPassword}@` : "";
    const mongoUrlParams = hasCredentials ? "?authSource=admin" : "";

    // build mongo connection string
    const connectionString = `mongodb://${mongoUrlPrefix}${host}:27017/tahash${mongoUrlParams}`;

    // connect to Mongo and retrieve database
    const mongoClient: MongoClient = await MongoClient.connect(connectionString, { connectTimeoutMS: 5000 });
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
