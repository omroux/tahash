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
} from "./src/scripts/backend/apiUtils.js";
import {
    renderPage,
    renderError,
    storeCookie,
    tryGetCookie,
    authTokenCookie,
    storeTokenCookies,
    readConfigFile,
    __dirname,
    sentFromClient,
    clearTokenCookies,
    retrieveWCAMe,
    isLoggedIn,
    envConfigOptions,
    getConfigData,
    getHostname,
    initDatabase,
    weekManager
} from "./serverUtils.js";
import { errorObject } from "./src/scripts/backend/globalUtils.js";
import cstimer from "cstimer_module";


// general setup
const app = express();  // express app
config(envConfigOptions); // configure .env file


// MongoDB
console.log("Connecting to MongoDB...", getConfigData());
await initDatabase();
console.log("Connected to MongoDB!");


// use EJS as the view engine
app.set("view engine", "ejs");

// set the default views directory to /src/views
app.set("views", path.join(__dirname, "/src/views/"));

// middleware to parse cookies
app.use(cookieParser());


// #region page routing

// "/" => redirect to home page
app.get("/", (req, res) => {
    res.redirect("/home");
});

// Route for home
app.get("/home", async (req, res) => {
    const currWeek = await weekManager().getCurrentWeek();

    renderPage(req, res, "home.ejs", { title: "Home" }, 
        { compInfo: {
            compNumber: currWeek.compNumber,
            startDate: currWeek.startDate,
            endDate: currWeek.endDate,
            events: currWeek.getEventsInfo()
         } },
         [ "src/stylesheets/pages/home.css" ]
    );
});

// Route for login page
app.get("/login", async (req, res) => {
    // has token cookie, meaning the user is logged in
    if (await isLoggedIn(req, res)) {
        res.redirect("/profile");
        return;
    }

    renderPage(
        req,
        res,
        "login.ejs",
        { title: "Login" },
        { auth_path: "/redirect-to-auth" },
        [ "/src/stylesheets/pages/login.css" ],
    );
});

// Route for profile page
app.get("/profile", async (req, res) => {
    // the case where the user isn't logged in is handled by profile.js
    renderPage(req,
        res,
        "profile.ejs",
        {title: "Profile", loading: true},
        {},
        ["/src/stylesheets/pages/profile.css"]);
});

// Automatically redirect to authentication
app.get("/redirect-to-auth", (req, res) => {
    res.redirect(WCA_AUTH_URL(getHostname()));
});

// Route for auth-callback
app.get("/auth-callback", async (req, res) => {
    // if we didn't receive a code, redirect to home
    const auth_code = req.query.code;
    if (!auth_code) {
        res.redirect("/");
        return;
    }

    // fetch token in callback
    const tokenData = await fetchToken(auth_code);
    if (tokenData.error) {
        renderError(req, res, tokenData.error ?? "שגיאה בתהליך ההתחברות.");
        return;
    }

    // set authToken cookie
    storeTokenCookies(res, tokenData);

    // redirect to profile page
    res.redirect("/profile");
});

// Route for scrambles page
app.get("/scrambles", async (req, res) => {
    // event icons cdn link
    const eventIconsSrc = "https://cdn.cubing.net/v0/css/@cubing/icons/css";
    const currWeek = await weekManager().getCurrentWeek();
    
    renderPage(req,
        res,
        "/scrambles.ejs",
        { title: "Scrambles" },
        {
            compNumber: currWeek.compNumber,
            events: currWeek.getEventsInfo()
        },
        [ "/src/stylesheets/pages/scrambles.css",
            eventIconsSrc ]);
});

// Route for competing in events
app.get("/compete/:eventId", async (req, res) => {
    const currentWeek = await weekManager().getCurrentWeek();
    const loggedIn = await isLoggedIn(req, res);

    // not logged in -> login
    if (!loggedIn) {
        res.redirect("/login");
        return;
    }

    const pageOptions = {};
    const eventData = currentWeek.getEventDataById(req.params.eventId);
    if (eventData) {
        const scrImages = [];
        // images
        for (let i = 0; i < eventData.scrambles.length; i++)
            scrImages.push(cstimer.getImage(eventData.scrambles[i], eventData.event.scrType));

        pageOptions.eventData = {
            event: eventData.event,
            scrambles: eventData.scrambles,
            scrImages: scrImages
        };

    }


    renderPage(req,
        res,
        "/compete.ejs",
        { title: "מדידת זמן" },
        pageOptions,
        [ "/src/stylesheets/pages/compete.css" ]);
});

// #endregion


// #region other request handling

// use the requester's authToken cookie to fetch and send their "WCA-Me" information.
// if an error occurs - clears the cookie, and:
//          - if the request was received from a client, sends an error object
//          - otherwise, redirect to login
//
app.get("/wca-me", async (req, res) => {
    const userData = await retrieveWCAMe(req, res);
    if (userData)                   res.json(userData);
    else if (sentFromClient(req))   res.json(errorObject("error occurred", { redirectTo: "/login" }));
    else                            res.redirect("/login");
});

// if the request was made by a client, clear the authToken cookie.
// otherwise, redirect to /profile
app.get("/logout", (req, res) => {
    if (sentFromClient(req)) {
        clearTokenCookies(res);
        res.json({ response: "Success" });
    }
    else
        res.redirect("/profile");
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
app.get("/newweek", async (req, res) => {
    // validate (create a new one - the last one is not active anymore)
    await weekManager().validateCurrentWeek(null, null, true);
    res.redirect("/");
});

// #endregion


// Start receiving HTTP requests
app.listen(getConfigData().port, () => {
    console.log(
        `Listening on ${getHostname()} (port ${getConfigData().port})${getConfigData().local ? ", locally" : ""}`,
    );
});


// #region new tahash week schedule

// Every Monday at 20:01
cron.schedule('1 20 * * 1', () => {
    weekManager.validateCurrentWeek();
}, { scheduled: true, timezone: "Israel" })/*.start()*/;
// TODO: uncomment .start() to make cron actually schedule the job

// #endregion
