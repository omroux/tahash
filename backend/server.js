import path from "path";
import fs from "fs";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import cron from "node-cron";
import {
    fetchToken,
    fetchRefreshToken,
    WCA_AUTH_URL
} from "./src/scripts/backend/utils/apiUtils.js";
import {
    renderPage,
    renderError,
    tryGetCookie,
    authTokenCookie,
    __dirname,
    sentFromClient,
    retrieveWCAMe,
    isLoggedIn,
    getHostname,
    initDatabase,
    compManager,
    userManager,
    getEnvConfigOptions,
    setHostname,
    ADMINS_LIST
} from "./serverUtils.js";
import { errorObject, getNumberValue } from "./src/scripts/backend/utils/globalUtils.js";
import { tryAnalyzeTimes, getDisplayTime, getTimesObjStr, packTimes, unpackTimes, Penalties, getEmptyPackedTimes, isFullPackedTimesArr } from "./src/scripts/backend/utils/timesUtils.js"
import { getEventById } from "./src/scripts/backend/database/CompEvent.js";


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


// #region page routing

// "/" => redirect to home page
app.get("/", (req, res) => {
    res.redirect("/home");
});

// Route for home
app.get("/home", async (req, res) => {
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
app.get("/login", async (req, res) => {
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
app.get("/profile", async (req, res) => {
    // the case where the user isn't logged in is handled by profile.js
    renderPage(req,
        res,
        "profile.ejs",
        { title: "Profile" },
        {},
        ["/src/stylesheets/pages/profile.css"]);
});

// Automatically redirect to authentication
app.get("/redirect-to-auth", (req, res) => {
    res.redirect(WCA_AUTH_URL(getHostname()));
});

const hostnameHeader = "hostname";
app.post("/updateHostname", (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    setHostname(req.headers[hostnameHeader]);
    res.status(200).json({ });
});

// Route for auth-callback
app.get("/auth-callback", async (req, res) => {
    renderPage(req, res, "auth-callback.ejs", { title: "Auth Callback", loading: true });
});

// Route for scrambles page
app.get("/scrambles", async (req, res) => {
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
            "/src/stylesheets/eventBoxes.css",
            eventIconsSrc ]);
});

app.get("/error", async (req, res) => {
    renderError(req, res, errorObject("שגיאה."));
});

// Route for competing in events
app.get("/compete/:eventId", async (req, res) => {
    const currComp = await compManager().getCurrentComp();
    const loggedIn = isLoggedIn(req);

    // not logged in -> login
    if (!loggedIn) {
        res.redirect("/login");
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

const compNumberParamName = "comp-number";
const eventIdParamName = "event-id";
// Route for admin dashboard
// Takes in a comp number query parameter (/admin-dashboard?comp-number=)
app.get("/admin-dashboard", async (req, res) => {
    const compNum = getNumberValue(req.query, compNumberParamName);
    if (!compNum || !compManager().compExists(compNum)) {
        // if the comp number received was invalid, redirect to current comp
        const currCompNum = await compManager().getCurrentCompNumber();
        res.redirect(`/admin-dashboard?${compNumberParamName}=${currCompNum}`);
        return;
    }

    renderPage(req,
        res,
        "/admin-dashboard.ejs",
        { title: "לוח בקרה", loading: true },
        { compNumber: compNum },
        [ "/src/stylesheets/pages/admin-dashboard.css",
            "/src/stylesheets/eventBoxes.css",
            eventIconsSrc ]);
});

// #endregion


// #region other request handling

// the user requests

const userIdHeader = "user-id";
const wcaIdHeader = "wca-id";
const eventIdHeader = "event-id";

/*  /updateTimes:
    - Input (in json request body):
        * userId: number
        * eventId: str
        * times: packedTimes
    - Output (json):
        * status 400 if: user finished event/invalid request
        * otherwise, status 200
*/
app.post("/updateTimes", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    const userId = req.body.userId;
    const eventId = req.body.eventId;
    const times = req.body.times;
    if (!userId || !eventId || !times) {
        console.log("Invalid body for updateTimes. Request:", req);
        res.status(400).json(errorObject("Invalid headers"));
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

/*  /retrieveTimes:
    - Input (headers):
        * sent from client
        * userId (WCA User ID)
        * eventId (id of the event to retrieve)
    - Output (json):
        * if there was an error, an error object
        * otherwise, returns an array of the requested user's times
*/
app.get("/retrieveTimes", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    // get headers
    const userId = parseInt(req.headers[userIdHeader]);
    const eventId = req.headers[eventIdHeader];

    const userObj = await userManager().getUserById(userId);
    const compEvent = getEventById(eventId);

    if (!compEvent) { // event doesn't exist
        res.json(errorObject("Invalid event."));
        return;
    }

    const times = userObj.getEventTimes(eventId) ?? getEmptyPackedTimes(compEvent);
    res.json(times);
});

/*  /eventStatuses get event statuses
    - Input (headers):
        * userId
    - Output (json):
        * [ { eventId: "finished"/"unfinished" } ]
*/
app.get("/eventStatuses", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    // get header
    const userId = getNumberValue(req.headers, userIdHeader);
    if (!userId) {
        res.status(400).json(errorObject("No user id sent"));
        return;
    }

    const userObj = await userManager().getUserById(userId);    
    res.json(userObj.getEventStatuses());
});

app.get("/isAdmin", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    const wcaId = req.headers[wcaIdHeader];
    if (!wcaId) {
        res.status(400).json(errorObject("WCA ID not sent."));
        return;
    }

    res.json({ isAdmin: ADMINS_LIST.includes(wcaId) });
});

// /getCompEvents: takes competition number as a query parameter (?comp=)
// output: (as json) [ { eventId, iconName, eventTitle } ]
app.get("/getCompEvents", async(req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    const compNumber = getNumberValue(req.query, compNumberParamName);
    if (!compNumber) {
        res.status(400).json(errorObject(`Invalid comp number ${compNumber}`));
        return;
    }

    const comp = await compManager().getTahashComp(compNumber);
    if (!comp) {
        res.status(404).json(errorObject(`Comp with comp number ${compNumber} does not exist.`));
        return;
    }

    res.status(200).json(comp.getEventsInfo());
});

/*  /getEventSubmissions: 
    - Input (query parameters):
        * compNumber
        * eventId
    - Output (json):
        * [ { userId, userData: { wcaId, name }, submissionState, times, resultStr } ]
*/
app.get("/getEventSubmissions", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    const compNumber = getNumberValue(req.query, compNumberParamName);
    const eventId = req.query[eventIdParamName];

    if (!compNumber || !eventId) {
        console.log(req.query);
        res.status(400).json(errorObject(`Comp number and event id must be included in the request parameters`));
        return;
    }

    const comp = await compManager().getTahashComp(compNumber);
    const submissions = comp.getEventSubmissions(eventId);
    
    if (!submissions) {
        res.status(400).json(errorObject(`Event data not found`));
    }

    // load users' data
    for (let i = 0; i < submissions.length; i++) {
        const fullUserData = await userManager().getUserDataById(submissions[i].userId);
        submissions[i].userData = { wcaId: fullUserData.wcaId, name: fullUserData.name };
    }

    res.status(200).json(submissions);
});

/* /updateSubmissionState:
    - Input (in request body):
        * compNumber (number)
        * eventId (string)
        * userId (number)
        * submissionState (number)
    - Output (as json):
        * errorObject/{ text: successful }
*/
app.post("/updateSubmissionState", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
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

app.get("/wca-me", async (req, res) => {
    const userData = await retrieveWCAMe(req);
    if (userData)                   res.json(userData);
    else if (sentFromClient(req))   res.json(errorObject("error occurred"));
    else                            res.redirect("/login");
});

app.get("/authenticateWithCode", async (req, res) => {
    const authCodeHeader = "auth-code";
    const authCode = req.headers[authCodeHeader];
    if (!authCode) {
        if (sentFromClient(req))    res.json(errorObject("No code received."));
        else                        res.redirect("/");
        return;
    }

    // fetch token in callback
    const tokenData = await fetchToken(authCode);
    if (tokenData.error) {
        if (sentFromClient(req))    res.json(errorObject("Authentication Error."));
        else                        res.redirect("/");
        return;
    }

    // send back the new token data
    res.json(tokenData);
});

app.get("/authenticateRefreshToken", async (req, res) => {
    const refreshTokenHeader = "refresh-token";
    const refreshToken = req.headers[refreshTokenHeader];
    if (!refreshToken) {
        if (sentFromClient(req))    res.json(errorObject("No refresh token received."));
        else                        res.redirect("/");
        return;
    }

    const tokenData = await fetchRefreshToken(refreshToken);
    if (tokenData.error) {
        if (sentFromClient(req))    res.json(errorObject("Refresh token error"));
        else                        res.redirect("/");
        return;
    }

    // send back the new token data
    res.json(tokenData);
});

// get a source file
app.get("/src/*", (req, res) => {
    const filePath = path.resolve(path.join(__dirname, req.url));

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
    res.redirect("/");
});

// #endregion


// Start receiving HTTP requests
app.listen(WEBSITE_PORT, () => {
    console.log(`Website is running on port ${WEBSITE_PORT}.`);
});


// #region new tahash comp schedule

// Every Monday at 20:01
cron.schedule('1 20 * * 1', async () => {
    await compManager().validateCurrentComp();
}, { scheduled: true, timezone: "Israel" })/*.start()*/;
// TODO: uncomment .start() to make cron actually schedule the job

// #endregion
