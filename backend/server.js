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
    authTokenCookie,
    storeTokenCookie,
    readConfigFile,
    __dirname,
} from "./serverutils.js";
import path from "path";
import fs from "fs";
import ejs from "ejs";
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
        ["pages/login.css"],
    );
});

// Route for profile page
app.get("/profile", async (req, res) => {
    renderPage(req, res, "profile.ejs", { title: "Profile", loading: true });
});

// Automatically redirect to authentication
app.get("/redirect-to-auth", (req, res) => {
    res.redirect(WCA_AUTH_URL(hostname));
});

// Route for auth-callback
// TODO: clean this + wca-me
app.get("/auth-callback", async (req, res) => {
    // if we didn't receive a code, redirect to home
    if (!req.query.code) {
        res.redirect("/");
        return;
    }

    // fetch token in callback
    const tokenData = await fetchToken(req, hostname);
    if (!tokenData.access_token) {
        renderPage(
            req,
            res,
            "error.ejs",
            { title: "Error" },
            {
                error:
                    JSON.stringify(tokenData.error) ?? "שגיאה בתהליך ההתחברות.",
            },
        );
        return;
    }

    // set authToken cookie
    storeTokenCookie(res, tokenData);

    // redirect to profile page
    res.redirect("/profile");
});
//endregion

// If the user has an authToken cookie, send their "WCA-Me" information
// Otherwise, redirect to login
app.get("/wca-me", async (req, res) => {
    // get the saved user's token (from the cookie)
    if (!req.cookies[authTokenCookie]) {
        clearCookieAndRedirect();
        return;
    }

    // cookie has expired/doesn't exist/something happened to it -> redirect to /login
    let authToken = null;
    try {
        authToken = JSON.parse(req.cookies[authTokenCookie]);
    } catch {
        clearCookieAndRedirect();
        return;
    }

    if (!authToken || !authToken.access_token) {
        clearCookieAndRedirect();
        return;
    }

    let userData = await getUserData(authToken.access_token);
    // data received successfully
    if (userData.me) {
        res.json(userData.me);
        return;
    }

    // an error occurred
    // try to get a refresh token
    if (!userData.refresh_token) {
        clearCookieAndRedirect();
        return;
    }

    const tokenData = await fetchRefreshToken(userData.refresh_token);
    if (tokenData.error || !tokenData.access_token) {
        clearCookieAndRedirect();
        return;
    }

    // store the cookie with the new token
    storeTokenCookie(tokenData);

    // try to use the new refresh token
    // note: we're not reloading the page in order to avoid an infinite loop of refreshing the page
    userData = await getUserData(tokenData.access_token);
    if (userData.me) res.json(userData.me);
    else clearCookieAndRedirect();

    function clearCookieAndRedirect(toHome = false) {
        res.clearCookie(authTokenCookie);
        res.redirect(toHome ? "/home" : "/login");
    }
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

// TODO: log out button logic
// TODO: for dynamic hiding/showing of login/profile pages, use options.loggedIn (for ejs options in the renderPage function)

// Read config file
const config = readConfigFile();
const hostname = config.baseUrl + (config.local ? `:${config.port}` : "");

// Start receiving HTTP requests
app.listen(config.port, () => {
    console.log(
        `Listening on ${hostname} (port ${config.port})${config.local ? ", locally" : ""}`,
    );
});
