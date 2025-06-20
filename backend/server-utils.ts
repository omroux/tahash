import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import {Db, MongoClient } from "mongodb";
import {Request, Response} from "express";
import { CompManager } from './src/scripts/backend/database/comps/comp-manager.js';
import { UserManager } from './src/scripts/backend/database/users/user-manager.js';
import { IncomingHttpHeaders } from 'http';
import { getHeader, Headers } from './src/scripts/constants/headers.js';


// -- General constants/properties
/**
 * The name of the directory the process is running on
 */
export const __dirname: string = path.dirname(new URL(import.meta.url).pathname);

/**
 * The list of the WCA IDs of the website's admins
 */
export const ADMINS_LIST: string[] = [ "2019SAHA01", "2022STON03", "2019KEHI01" ];

/**
 * The key of the logged in cookie (whether the user is logged in)
 */
export const loggedInCookie = "loggedIn";


// region Hostname Control

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

// endregion

// region Reading Config File
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
// endregion

// region Page Rendering

/**
 * Render a page given the path to its `.ejs` file.
 * @param req The request's {@link Request} object.
 * @param res The request's {@link Response} object.
 * @param filePath The page's `.ejs` file path *inside* src/views/pages, including the .ejs extension - `"src/views/pages/:filePath"`.
 * @param layoutOptions Options for the layout `.ejs` file.
 * @param pageOptions Options for the page's `.ejs` file.
 * @param stylesheets Paths to extra CSS stylesheets (complete path).
 */
export function renderPage(req: Request,
        res: Response,
        filePath: string,
        layoutOptions?: { title?: string, loading?: boolean },
        pageOptions?: object,
        stylesheets?: string[]): void {
    // redirect to lowercase page request (not really necessary, but better to have)
    const pathname = req.url;
    if (pathname.toLowerCase() !== pathname) {
        res.redirect(pathname.toLowerCase());
        return;
    }

    // render the file, async
    (async () => {
        pageOptions ??= {};
        const pgOpts = {
            ...pageOptions,
            loggedIn: isLoggedIn(req)
        };

        await ejs.renderFile(path.join(__dirname, "src/views/pages/", filePath), pgOpts, async (err, str) => {
            if (err) {
                console.error(`Error occurred receiving ${filePath} page.\nDetails:`, err);
                res.status(404).send(err);
                return;
            }

            // construct layout options
            layoutOptions = layoutOptions ?? {};
            const layOpts = {
                ...layoutOptions,
                content: str,
                stylesheets: stylesheets,
                loggedIn: pgOpts.loggedIn,
                compNumber: compManager()?.getCurrentCompNumber() /* comp number in header */
            };

            res.render("layout.ejs", layOpts);
        });
    })();
}

/**
 * Render the error page with a specific error.
 * @param req The request's {@link Request} object.
 * @param res The request's {@link Response} object.
 * @param error An error represented as any object (most useful as string).
 */
export function renderError(req: Request, res: Response, error: any = "שגיאה כללית."): void {
    renderPage(req,
        res,
        "error.ejs",
        { title: "Error" },
        { error: error });
}

// endregion


/**
 * Check whether the request contains a specific cookie.
 * @param req The request's {@link Request} object.
 * @param cookieName The desired cookie's name.
 * @param isJson Whether to parse the cookie's value to JSON.
 * @returns 
 *   - If the cookie does not exist: `null`.
 *   - If `isJson` is `false`: returns the cookie's raw string value.
 *   - If `isJson` is `true` and parsing succeeds: returns the parsed JSON value.
 *   - If `isJson` is `true` but parsing fails: returns `null`.
 */
export function tryGetCookie(req: Request, cookieName: string, isJson: boolean = true) {
    const cookieStr = req.cookies[cookieName];
    if (!cookieStr) return null;
    if (!isJson) return cookieStr;

    try { return JSON.parse(cookieStr); }
    catch { return null; }
}

/**
 * Check if a request was sent from a client (fetch request from the website).
 * @param req The request's {@link Request} object.
 */
export const sentFromClient = (req: Request): boolean => (getHeader(req, Headers.FromClient) === "true");

/**
 * Check whether the user is logged in (using the request's cookie).
 * @param req The request's {@link Request} object.
 */
export const isLoggedIn = (req: Request): boolean => tryGetCookie(req, loggedInCookie, false) != null;

// region Database Management

// database variables
const tahashDbName = "tahash";
const compsCollectionName = "comps";
const usersCollectionName = "users";

let _tahashDb: Db | undefined;
let _compManager: CompManager | undefined;
let _userManager: UserManager | undefined;

/**
 * Get the singleton instance of the current active tahash database.
 * @returns The singleton instance of the Db.
 * @throws {Error} if the Tahash DB has not been initialized.
 */
export const tahashDB = (): Db => {
    if (!_tahashDb)
        throw new Error("Tahash DB is not initialized.");
    
    return _tahashDb;
}

/**
 * The current active {@link CompManager}.
 * @returns {CompManager} The singleton instance of the {@link CompManager}.
 * @throws {Error} if the {@link CompManager} singleton has not been initialized.
 */
export const compManager = (): CompManager => {
    if (!_compManager)
        throw new Error("Comp manager is not initialized.");

    return _compManager;
}

/**
 * Get the instance of the current active {@link UserManager}.
 * @returns {UserManager} The singleton instance of the {@link UserManager}.
 * @throws {Error} if the {@link UserManager} singleton has not been initialized.
 */
export const userManager = (): UserManager => {
    if (!_userManager)
        throw new Error("User manager is not initialized.");

    return _userManager;
}

/**
 * Initialize the MongoDB connection, load the database, {@link CompManager} and {@link UserManager}.
 * @returns {Db} The MongoDB database connected to.
 */
export async function initDatabase(): Promise<Db> {
    if (_tahashDb != null) {
        console.warn("Database is already initialized.");
        return tahashDB();
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

    // initialize user manaager
    _userManager = new UserManager(_tahashDb.collection(usersCollectionName));

    // initialize comp manager
    _compManager = new CompManager(_tahashDb.collection(compsCollectionName), userManager());

    // initialize comps collection in case it's empty
    await _compManager.initComps();

    // validate current comp
    await _compManager.validateCurrentComp();

    return _tahashDb;
}

// endregion
