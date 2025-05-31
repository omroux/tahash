import path from "path";
import fs from "fs";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import ms from "ms";
import cron from "node-cron"
import {
    fetchToken,
    fetchRefreshToken,
    getUserData,
    WCA_AUTH_URL
} from "./src/scripts/backend/utils/apiUtils.js";
import {
    renderPage,
    renderError,
    storeCookie,
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
import { errorObject } from "./src/scripts/backend/utils/globalUtils.js";
import { tryAnalyzeTimes, getDisplayTime, getTimesObjStr, packTimes, unpackTimes, Penalties, getEmptyPackedTimes } from "./src/scripts/backend/utils/timesUtils.js"
import { getEventById } from "./src/scripts/backend/database/CompEvent.js";


// general setup
const app = express();  // express app
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
    // event icons cdn link
    const eventIconsSrc = "https://cdn.cubing.net/v0/css/@cubing/icons/css";
    const currComp = await compManager().getCurrentComp();
    
    renderPage(req,
        res,
        "/scrambles.ejs",
        { title: "Scrambles" },
        {
            compNumber: currComp.compNumber,
            events: currComp.getEventsInfo()
        },
        [ "/src/stylesheets/pages/scrambles.css",
            eventIconsSrc ]);
});

app.get("/error", async (req, res) => {
    renderError(req, res, errorObject("שגיאה."));
});

// Route for competing in events
app.get("/compete/:eventId", async (req, res) => {
    const eventIconsSrc = "https://cdn.cubing.net/v0/css/@cubing/icons/css";
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

app.get("/admin-dashboard", async (req, res) => {
    const currComp = await compManager().getCurrentComp();
    
    renderPage(req,
        res,
        "/admin-dashboard.ejs",
        { title: "לוח בקרה", loading: true },
        {
            compNumber: currComp.compNumber
        });
});

// #endregion


// #region other request handling

// the user requests

const userIdHeader = "user-id";
const wcaIdHeader = "wca-id";
const eventIdHeader = "event-id";

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
        res.json(errorObject("Invalid headers"));
        return;
    }

    const currCompNumber = compManager().getCurrentCompNumber();
    const userObj = await userManager().getUserById(userId);
    userObj.setEventTimes(currCompNumber, eventId, times);
    await userObj.saveToDB();
    res.json({ text: "Saved successfully!" });
});

/*
    /retrieveTimes:
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

    const currCompNumber = compManager().getCurrentCompNumber();
    const userObj = await userManager().getUserById(userId);
    const compEvent = getEventById(eventId);

    if (!compEvent) { // event doesn't exist
        res.json(errorObject("Invalid event."));
        return;
    }

    const times = userObj.getEventTimes(currCompNumber, eventId) ?? getEmptyPackedTimes(compEvent);
    res.json(times);
});

app.get("/eventStatuses", async (req, res) => {
    if (!sentFromClient(req)) {
        res.redirect("/");
        return;
    }

    if (!req.headers[userIdHeader]) {
        res.status(400).json(errorObject("No user id sent."));
        return;
    }

    // get header
    const userId = parseInt(req.headers[userIdHeader]);

    const currCompNumber = compManager().getCurrentCompNumber();
    const userObj = await userManager().getUserById(userId);
    
    res.json(userObj.getEventStatuses(currCompNumber));
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
app.get("/newcomp", async (req, res) => {
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
cron.schedule('1 20 * * 1', () => {
    compManager().validateCurrentComp();
}, { scheduled: true, timezone: "Israel" })/*.start()*/;
// TODO: uncomment .start() to make cron actually schedule the job

// #endregion
