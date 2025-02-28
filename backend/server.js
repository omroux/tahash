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
    loadDatabase
} from "./serverUtils.js";
import { errorObject } from "./src/scripts/backend/globalUtils.js";
import path from "path";
import fs from "fs";
import express from "express";
import cookieParser from "cookie-parser";
import {config} from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import ms from "ms";
import {WeekManager} from "./src/scripts/backend/database/weeks/WeekManager.js";
import {UserManager} from "./src/scripts/backend/database/users/UserManager.js";


// general setup
const app = express();  // express app
config(envConfigOptions); // configure .env file


// -- Database
// database constants
const tahashDbName = "tahash";
const weeksCollectionName = "weeks";
const usersCollectionName = "users";

// MongoDB
console.log("Connecting to MongoDB...", getConfigData());
const tahashDb = await loadDatabase(tahashDbName);
console.log("Connected to MongoDB!");
const weekManager = new WeekManager(tahashDb.collection(weeksCollectionName));
const userManager = new UserManager(tahashDb.collection(usersCollectionName));


// use EJS as the view engine
app.set("view engine", "ejs");

// set the default views directory to src/views
app.set("views", path.join(__dirname, "src/views/"));

// middleware to parse cookies
app.use(cookieParser());


// region page routing

// "/" => redirect to home page
app.get("/", (req, res) => {
    res.redirect("/home");
});

// Route for home
app.get("/home", (req, res) => {
    renderPage(req, res, "home.ejs", { title: "Home" });
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
        [ "src/stylesheets/pages/login.css" ],
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
        ["src/stylesheets/pages/profile.css"]);
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

app.get("/scrambles", (req, res) => {
    const events =[
        {
            eventId: "333",
            scrType: "333",
            eventTitle: "3x3x3",
            iconName: "event-333"
        },
        {
            eventId: "222",
            scrType: "222so",
            eventTitle: "2x2x2",
            iconName: "event-222"
        },
        {
            eventId: "444",
            eventTitle: "4x4x4",
            scrType: "444wca",
            iconName: "event-444"
        },
        {
            eventId: "444",
            scrType: "555wca",
            eventTitle: "5x5x5",
            iconName: "event-555"
        },
        {
            eventId: "666",
            scrType: "666wca",
            eventTitle: "6x6",
            iconName: "event-666"
        }
    ];

    renderPage(req,
        res,
        "/scrambles.ejs",
        { title: "Scrambles" },
        { events },
        [ "src/stylesheets/pages/scrambles.css",
            "https://cdn.cubing.net/v0/css/@cubing/icons/css" ]);   // event icons cdn link
});

// endregion


// region other request handling

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

// endregion


// Start receiving HTTP requests
app.listen(getConfigData().port, async () => {
    console.log(
        `Listening on ${getHostname()} (port ${getConfigData().port})${getConfigData().local ? ", locally" : ""}`,
    );
});
