import path from "path";
import fs from "fs";
import express, {Request, Response} from "express";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import cron from "node-cron";
import {
    fetchToken,
    fetchRefreshToken,
    WCA_AUTH_URL,
    getUserData as getWCAUserData
} from "./src/scripts/backend/utils/api-utils.js";
import {
    renderPage,
    renderError,
    __dirname,
    sentFromClient,
    isLoggedIn,
    getHostname,
    initDatabase,
    compManager,
    userManager,
    getEnvConfigOptions,
    setHostname,
    ADMINS_LIST
} from "./server-utils.js";
import { errorObject } from "./src/scripts/backend/utils/global-utils.js";
import { tryAnalyzeTimes, getDisplayTime, formatTimeWithPenalty, packResults, unpackTimes, Penalties, getEmptyPackedTimes, isFullPackedTimesArr } from "./src/scripts/backend/utils/time-utils.js"
import { getEventById } from "./src/scripts/backend/database/comp-event.js";
import { Routes } from "./src/scripts/constants/routes.js";
import { getQueryParam, getQueryParamNumber, QueryParams } from "./src/scripts/constants/query-params.js";
import { getHeader, getHeaderNumber, Headers } from "./src/scripts/constants/headers.js";
import { RequestFields } from "./src/scripts/constants/request-fields.js";
import { WCAUserData } from "./src/scripts/interfaces/wca-user-data.js";


// general setup
const eventIconsSrc = "https://cdn.cubing.net/v0/css/@cubing/icons/css"; // event icons cdn link
const app = express(); // express app
config(getEnvConfigOptions()); // configure .env file

const WEBSITE_PORT = process.env.PORT || 3000;

// MongoDB
console.log("Connecting to MongoDB...");
await initDatabase();
console.log("Connected to MongoDB!");


// use EJS as the view engine
app.set("view engine", "ejs");

// set the default views directory to /src/views
app.set("views", path.join(__dirname, "/src/views/"));

// middleware to parse cookies
app.use(cookieParser());

// middleware to parse json requests (Content-Type: application/json)
app.use(express.json());


// region page routing

// "/" => redirect to home page
app.get(Routes.Page.HomeRedirect, (req: Request, res: Response) => {
    res.redirect(Routes.Page.Home);
});


// Route for home
app.get(Routes.Page.Home, async (req, res) => {
    const currComp = await compManager().getCurrentComp();

    renderPage(req, res, "home.ejs", { title: "Home" }, 
        { compInfo: {
            compNumber: currComp.compNumber,
            startDate: currComp.startDate,
            endDate: currComp.endDate,
            events: currComp.getEventsInfo()
         } },
         [ "src/stylesheets/pages/home.css" ]
    );
});


// Route for login page
app.get(Routes.Page.Login, async (req, res) => {
    renderPage(
        req,
        res,
        "login.ejs",
        { title: "Login" },
        { needHostname: (getHostname() == null), auth_path: "/redirect-to-auth" },
        [ "/src/stylesheets/pages/login.css" ],
    );
});


// Route for profile page
app.get(Routes.Page.Profile, async (req, res) => {
    // the case where the user isn't logged in is handled by profile.js
    renderPage(req,
        res,
        "profile.ejs",
        { title: "Profile" },
        {},
        ["/src/stylesheets/pages/profile.css"]);
});


// Automatically redirect to authentication
app.get(Routes.Page.RedirectToAuth, (req, res) => {
    res.redirect(WCA_AUTH_URL(getHostname()));
});


// Route for auth-callback
app.get(Routes.Page.AuthCallback, async (req, res) => {
    renderPage(req, res, "auth-callback.ejs", { title: "Auth Callback", loading: true });
});


// Route for scrambles page
app.get(Routes.Page.Scrambles, async (req, res) => {
    const currComp = await compManager().getCurrentComp();
    
    renderPage(req,
        res,
        "/scrambles.ejs",
        { title: "Scrambles" },
        {
            compNumber: currComp.compNumber,
            loading: true,
            events: currComp.getEventsInfo()
        },
        [ "/src/stylesheets/pages/scrambles.css",
            "/src/stylesheets/event-boxes.css",
            eventIconsSrc ]);
});


// Route for error page
app.get(Routes.Page.Error, async (req, res) => {
    renderError(req, res, errorObject("שגיאה."));
});


/**
 * GET /compete/:eventId
 * 
 * Route for competing in an event.
 * 
 * Query Parameters:
 * - {@link QueryParams.EventId} - The event to compete in
 */
app.get(Routes.Page.CompeteEvent, async (req, res) => {
    const currComp = await compManager().getCurrentComp();
    const loggedIn = isLoggedIn(req);

    // not logged in -> login
    if (!loggedIn) {
        res.redirect(Routes.Page.Login);;
        return;
    }

    const pageOptions = {};
    const eventData = currComp.getEventDataById(req.params.eventId);
    if (eventData) {
        pageOptions.eventData = {
            event: eventData.event,
            scrambles: eventData.scrambles
        };
    }
    else {  // TODO: redirect to "event not found page"?
        res.redirect("/scrambles");
        return;
    }


    renderPage(req,
        res,
        "/compete.ejs",
        { title: "מדידת זמן " + eventData.event.eventTitle },
        pageOptions,
        [ "/src/stylesheets/pages/compete.css",
            eventIconsSrc ]);
});


/**
 * GET /admin-dashboard
 * 
 * Route for admin dashboard page.
 * 
 * Query Parameters:
 * - {@link QueryParams.CompNumber} The comp number to display the dashboard of.
 */
app.get(Routes.Page.AdminDashboard, async (req, res) => {
    const compNum: number | undefined = getQueryParamNumber(req, QueryParams.CompNumber);
    if (!compNum || !compManager().compExists(compNum)) {
        // if the comp number received was invalid, redirect to current comp
        const currCompNum = compManager().getCurrentCompNumber();
        res.redirect(`/admin-dashboard?${QueryParams.CompNumber}=${currCompNum}`);
        return;
    }

    renderPage(req,
        res,
        "/admin-dashboard.ejs",
        { title: "לוח בקרה", loading: true },
        { compNumber: compNum },
        [ "/src/stylesheets/pages/admin-dashboard.css",
            "/src/stylesheets/event-boxes.css",
            eventIconsSrc ]);
});

// endregion


// region other request handling

/**
 * POST /update-hostname
 * 
 * Update the website's hostname.
 * 
 * Headers:
 * - {@link Headers.Hostname} (string): The hostname to set.
 * 
 * Response:
 * - 200 OK: Header not found.
 * - 404 Not Found: Mandatory header not found.
 */
app.post(Routes.Post.UpdateHostname , (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const headerVal = getHeader(req, Headers.Hostname);
    if (!headerVal) {
        res.status(404).json(errorObject(`Mandatory header "${Headers.Hostname}"!`));
        return;
    }

    setHostname(headerVal);
    res.status(200).json({ });
});


/**
 * POST /updateTimes
 * 
 * Update the user's times in an event.
 * 
 * Request Body:
 * - {@link RequestFields.UserId} (number): The user's user id.
 * - {@link RequestFields.EventId} (string): The event id to update.
 * - {@link RequestFields.Times} (packedTimes): The (packed) times to update into.
 * 
 * Response:
 * - 200 OK: JSON - `{ text: "Saved successfully!" }`
 * - 400 Bad Request: JSON error object with an error (invalid body/user already submitted).
 */
app.post(Routes.Post.UpdateTimes, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const userId: number | undefined = req.body[RequestFields.UserId];
    const eventId: string | undefined = req.body;
    const times = req.body.times; // TODO: packed times
    if (!userId || !eventId || !times) {
        console.log("Invalid body for updateTimes. Request:", req);
        res.status(400).json(errorObject("Invalid request fields"));
        return;
    }

    const userObj = await userManager().getUserById(userId);
    if (userObj.finishedEvent(eventId)) {
        res.status(400).json(errorObject(`User ${userId} already submitted event ${eventId}`));
        return;
    }

    userObj.setEventTimes(eventId, times);
    await userObj.saveToDB();
    res.status(200).json({ text: "Saved successfully!" });
    
    if (userObj.finishedEvent(eventId)) {
        const currComp = await compManager().getCurrentComp();
        currComp.setCompetitorResults(eventId, userId, times);
        await currComp.saveToDB();
    }
});


/**
 * GET /retrieveTimes
 * 
 * Get a user's (packed) times of an event.
 * 
 * Headers:
 * - {@link Headers.UserId} (number): The user's id.
 * - {@link Headers.EventId} (string): The requested event's id.
 * 
 * Response:
 * - 200 OK: Array of the requested packed times in JSON.
 * - 400 Bad Request: JSON error object with details.
 * - 404 Not Found: The event was not found. Returns JSON error object.
 */
app.get(Routes.Get.RetrieveTimes, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    // user id header
    const userId: number | undefined = getHeaderNumber(req, Headers.UserId);
    if (!userId) {
        res.status(400).json(errorObject("Invalid user id"));
        return;
    }

    // event id header
    const eventId: string | undefined = getHeader(req, Headers.EventId);
    if (!eventId) {
        res.status(400).json(errorObject("Event id is required"));
        return;
    }

    const userObj = await userManager().getUserById(userId);
    const compEvent = getEventById(eventId);

    if (!compEvent) { // event doesn't exist
        res.status(404).json(errorObject("Invalid event"));
        return;
    }

    const times = userObj.getEventTimes(eventId) ?? getEmptyPackedTimes(compEvent);
    res.status(200).json(times);
});


/**
 * GET /event-statuses
 * 
 * Get a user's event statuses in the current competition.
 * 
 * Headers:
 * - {@link Headers.UserId} (number): The user's id.
 * 
 * Response:
 * - 200 OK: JSON of the event statuses - { eventId: status } (Documented in {@link TahashUser})
 * - 400 Bad Request: JSON error object - No user id sent.
 */
app.get(Routes.Get.EventStatuses, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    // get header
    const userId: number | undefined = getHeaderNumber(req, Headers.UserId);
    if (!userId) {
        res.status(400).json(errorObject("User id header must be an integer"));
        return;
    }

    const userObj = await userManager().getUserById(userId);
    res.status(200).json(userObj.getEventStatuses());
});

/**
 * GET /is-admin
 * 
 * Check if a user is an admin by their WCA id.
 * 
 * Headers:
 * - {@link Headers.WcaId} (string): The user's WCA id.
 * 
 * Response (JSON):
 * - 200 OK: { isAdmin: boolean }
 * - 400 Bad Request: Error object if the WCA id was not sent.
 */
app.get(Routes.Get.IsAdmin, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const wcaId: string | undefined = getHeader(req, Headers.WcaId);
    if (!wcaId) {
        res.status(400).json(errorObject("WCA ID not sent."));
        return;
    }

    res.status(200).json({ isAdmin: ADMINS_LIST.includes(wcaId) });
});

/**
 * GET /getCompEvents?comp-number=X
 * 
 * Get a competition's events.
 * 
 * Query Parameters:
 * - {@link QueryParams.CompNumber} (number): The competition number.
 * 
 * Response (JSON):
 * - 200 OK: An array [ { eventId: string, iconName: string, eventTitle: string } ].
 * - 400 Bad Request: Error object if the comp number was invalid.
 * - 404 Not Found: Error object if the requested comp was not found.
 */
app.get(Routes.Get.GetCompEvents, async(req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    // comp number parameter
    const compNumber: number | undefined = getQueryParamNumber(req, QueryParams.CompNumber);
    if (!compNumber) {
        res.status(400).json(errorObject("Required comp number as a query parameter"));
        return;
    }

    const comp = await compManager().getTahashComp(compNumber);
    if (!comp) {
        res.status(404).json(errorObject(`Comp with comp number ${compNumber} does not exist.`));
        return;
    }

    res.status(200).json(comp.getEventsInfo());
});

/**
 * GET /get-event-submissions
 * 
 * Get submissions for an event of a competition.
 * 
 * Query Parameters:
 * - {@link QueryParams.CompNumber} (number): The desired competition's number.
 * - {@link QueryParams.EventId} (string): The desired event's id.
 * 
 * Response (JSON):
 * - 200 OK: An array [ { userId, userData: { wcaId, name }, submissionState, times, resultStr } ]
 * - 400 Bad Request: Error object with details.
 * - 404 Not Found: Error object - the requested event was not found.
 */
app.get(Routes.Get.GetEventSubmissions, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const compNumber: number | undefined = getQueryParamNumber(req, QueryParams.CompNumber);
    const eventId: string | undefined = getQueryParam(req, QueryParams.EventId);

    if (!compNumber || !eventId) {
        res.status(400).json(errorObject(`Comp number and event id must be included in the request parameters`));
        return;
    }

    const comp = await compManager().getTahashComp(compNumber);
    const submissions = comp.getEventSubmissions(eventId);
    
    if (!submissions) {
        res.status(404).json(errorObject(`Event data not found`));
        return;
    }

    // load users' data
    for (let i = 0; i < submissions.length; i++) {
        const fullUserData = await userManager().getUserDataById(submissions[i].userId);
        submissions[i].userData = { wcaId: fullUserData.wcaId, name: fullUserData.name };
    }

    res.status(200).json(submissions);
});


/**
 * GET /update-submission-state
 * 
 * Update a user's submission's state for an event.
 * 
 * Request Fields:
 * - {@link RequestFields.CompNumber} (number): The submission's competition's number.
 * - {@link RequestFields.EventId} (string): The submission's event's id.
 * - {@link RequestFields.SubmissionState} (SubmissionState): The new submission state.
 * 
 * Response (json):
 * - 200 OK: { successful: boolean } - whether updating was successful.
 * - 400 Bad Request: Error object with details.
 */
app.post(Routes.Post.UpdateSubmissionState, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const compNumber = Number(req.body.compNumber);
    const eventId = req.body.eventId;
    const userId = Number(req.body.userId);
    const submissionState = Number(req.body.submissionState);

    if (!compNumber || !eventId || !userId || !submissionState) {
        console.log(req.body);
        res.status(400).json(errorObject("/updateSubmissionState must include compNumber, eventId, userId and submissionState values"));
        return;
    }

    if (!compManager().compExists(compNumber)) {
        res.status(400).json(errorObject(`Competition ${compNumber} does not exist`));
        return;
    }

    const successful = await compManager().updateSubmissionState(compNumber, eventId, userId, submissionState);
    res.status(200).json({ successful: successful });
});


/**
 * GET /wca-user-data
 * 
 * Get a user's WCA user data ({@link WCAUserData}).
 * 
 * Headers:
 * - {@link Headers.AccessToken} (string): The user's WCA access token.
 * 
 * Response (JSON):
 * - 400 Bad Request: Error object with details.
 * - 200 OK: The user's {@link WCAUserData}.
 */
app.get(Routes.Get.WCAUserData, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const accessToken: string | undefined = getHeader(req, Headers.AccessToken);
    if (!accessToken) {
        res.status(400).json(errorObject("Access token header is required"));
        return;
    }

    const userData: WCAUserData = await getWCAUserData(accessToken);
    if (userData)                   res.status(200).json(userData);
    else if (sentFromClient(req))   res.status(400).json(errorObject("error occurred"));
    else                            res.redirect(Routes.Page.Login);;
});

/**
 * GET /auth-with-code
 * 
 * Authenticate with an auth code.
 * 
 * Headers:
 * - {@link Headers.AuthCode} (string): The authentication code to use.
 * 
 * Response:
 * - 400 Bad Request: Error object with details.
 * - 200 OK: The token data received (response from the WCA API).
 */
app.get(Routes.Get.AuthenticateWithCode, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const authCode: string | undefined = getHeader(req, Headers.AuthCode);
    if (!authCode) {
        res.status(400).json(errorObject("Auth code header is required"));
        return;
    }

    // fetch token in callback
    const tokenData = await fetchToken(authCode);
    if (tokenData.error) {
        res.status(400).json(errorObject(`Authentication error - "${tokenData}"`));
        return;
    }

    // send back the new token data
    res.status(200).json(tokenData);
});


/**
 * GET /auth-refresh-token
 * 
 * Authenticate with a refresh token.
 * 
 * Headers:
 * - {@link Headers.RefreshToken} (string): The refresh token to use.
 * 
 * Response:
 * - 400 Bad Request: Error object with details.
 * - 200 OK: The token data received (resposne from the WCA API).
 */
app.get(Routes.Get.AuthenticateRefreshToken, async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect(Routes.Page.HomeRedirect);
        return;
    }

    const refreshToken: string | undefined = getHeader(req, Headers.RefreshToken);
    if (!refreshToken) {
        res.status(400).json(errorObject("Refresh token header is required"));
        return;
    }

    const tokenData = await fetchRefreshToken(refreshToken);
    if (tokenData.error) {
        res.status(400).json(errorObject(`Refresh token error - "${tokenData.error}"`));
        return;
    }

    // send back the new token data
    res.status(200).json(tokenData);
});

const srcPrefix = "/src";
const distPrefix = "/dist";
/**
 * GET /src/*
 * 
 * Get a source file.
 * 
 * The given path is the path to the file in the source code.
 * This handler aliases /src/* into /dist/* in the compiled source.
 */
app.get(`${srcPrefix}/*`, (req, res) => {
    // alias /src/* -> /dist/*
    const distPath = `${distPrefix}${req.url.substring(srcPrefix.length)}`;
    const filePath = path.resolve(path.join(__dirname, distPath));

    // if the requested file doesn't exist, return a 404
    if (!fs.existsSync(filePath)) {
        res.status(404).send(`File ${req.url} not found.`);
        return;
    }

    res.sendFile(filePath);
});

// TODO: remove before publishing
// dev commands
app.get("/newcompp1234", async (req, res) => {
    // validate (create a new one - the last one is not active anymore)
    await compManager().validateCurrentComp(null, null, true);
    res.redirect(Routes.Page.HomeRedirect);
});

// endregion


// Start receiving HTTP requests
app.listen(WEBSITE_PORT, () => {
    console.log(`Website is running on port ${WEBSITE_PORT}.`);
});


// region new tahash comp schedule

// Every Monday at 20:01
cron.schedule('1 20 * * 1', async () => {
    await compManager().validateCurrentComp();
}, { scheduled: true, timezone: "Israel" })/*.start()*/;
// TODO: uncomment .start() to make cron actually schedule the job

// endregion
