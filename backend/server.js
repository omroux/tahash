import {
    fetchToken,
    fetchRefreshToken,
    getUserData,
    WCA_AUTH_URL,
} from "./src/scripts/backend/api-utils.js";
import {
    renderPage,
    renderError,
    storeCookie,
    tryGetCookie,
    authTokenCookie,
    storeTokenCookie,
    readConfigFile,
    __dirname, sentFromClient,
} from "./serverutils.js";
import { errorObject } from "./src/scripts/backend/global_utils.js";
import path from "path";
import fs from "fs";
import express from "express";
import cookieParser from "cookie-parser";
const app = express();

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
app.get("/login", (req, res) => {
    // has token cookie, meaning the user is logged in
    if (req.cookies.authToken) {
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
    renderPage(req,
        res,
        "profile.ejs",
        {title: "Profile", loading: true},
        {},
        ["src/stylesheets/pages/profile.css"]);
});

// Automatically redirect to authentication
app.get("/redirect-to-auth", (req, res) => {
    res.redirect(WCA_AUTH_URL(hostname));
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
    const tokenData = await fetchToken(auth_code, hostname);
    if (tokenData.error) {
        renderError(req, res, tokenData.error ?? "שגיאה בתהליך ההתחברות.");
        return;
    }

    // set authToken cookie
    storeTokenCookie(res, tokenData);

    // redirect to profile page
    res.redirect("/profile");
});

app.get("/scrambles", (req, res) => {
    const events =[
        {
            eventId: "333",
            eventTitle: "3x3",
            iconName: "event-333"
        },
        {
            eventId: "222so",
            eventTitle: "2x2",
            iconName: "event-222"
        },
        {
            eventId: "444wca",
            eventTitle: "4x4",
            iconName: "event-444"
        },
        {
            eventId: "555wca",
            eventTitle: "5x5",
            iconName: "event-555"
        }
    ];

    renderPage(req,
        res,
        "/scrambles.ejs",
        {title: "Scrambles"},
        { events },
        [ "src/stylesheets/pages/scrambles.css",
            "https://cdn.cubing.net/v0/css/@cubing/icons/css" ]);
});

// endregion

// region other request handling

// use the requester's authToken cookie to fetch and send their "WCA-Me" information.
// if an error occurres - clears the cookie, and:
//          - if the request was received from a client, sends an error object
//          - otherwise, redirect to login
//
app.get("/wca-me", async (req, res) => {
    // no cookie -> redirect to /login
    let authToken = tryGetCookie(req, authTokenCookie);
    if (!authToken) {
        dataFailed();
        return;
    }

    // get the user's data using the access token
    let userData = await getUserData(authToken.access_token);
    // data received successfully
    if (userData.me) {
        res.json(userData.me);
        return;
    }

    // generate a new token (with refresh token)
    const tokenData = await fetchRefreshToken(userData.refresh_token);
    if (tokenData.error) {
        dataFailed();
        return;
    }

    // store the cookie with the new token
    storeTokenCookie(res, tokenData);

    // try to use the new refresh token
    // note: we're not reloading the page in order to avoid an infinite loop of refreshing the page
    userData = await getUserData(tokenData.access_token);
    if (userData.me) res.json(userData.me);
    else dataFailed();

    // clear the token cookie and redirect to /login
    function dataFailed(error = "error occurred") {
        res.clearCookie(authTokenCookie);
        if (sentFromClient(req))    res.json(errorObject(error, { redirectTo: "/login" }));
        else                        res.redirect("/login");
    }
});

// if the request was made by a client, clear the authToken cookie.
// otherwise, redirect to /profile
app.get("/logout", (req, res) => {
    if (sentFromClient(req))    { res.clearCookie(authTokenCookie); res.json({ response: "Success" }); }
    else                        res.redirect("/profile");
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

// Read config file
const config = readConfigFile();
const hostname = config.baseUrl + (config.local ? `:${config.port}` : "");

// Start receiving HTTP requests
app.listen(config.port, () => {
    console.log(
        `Listening on ${hostname} (port ${config.port})${config.local ? ", locally" : ""}`,
    );
});
