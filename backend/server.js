import { fetchToken, fetchRefreshToken, getUserData, WCA_AUTH_URL } from "./src/scripts/backend/api-utils.js";
import path from "path";
import fs from "fs";
import ejs from "ejs";
import express from "express";
import cookieParser from "cookie-parser";
const app = express();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
let hostname, config;

const authTokenCookie = "authToken";
const localConfigFile = "config.local.json";

// use EJS as the view engine
app.set('view engine', 'ejs');

// set the default views directory to src/views
app.set('views', path.join(__dirname, "src/views/"));

// middleware to parse cookies
app.use(cookieParser());

// region page routing
// filePath = the page's file path *inside* src/views/pages, including .ejs extension. (src/views/pages/:filePath)
// cssFiles = *string[]* paths to extra css stylesheets (inside src/stylesheets/)
function renderPage(req, res, filePath, layoutOptions = {}, pageOptions = {}, cssFiles = []) {
    // redirect to lowercase page request (not really necessary, but better to have)
    const pathname = req.url;
    if (pathname.toLowerCase() !== pathname) {
        res.redirect(pathname.toLowerCase());
        return;
    }

    // render the file
    ejs.renderFile(path.join(__dirname, "src/views/pages/", filePath), pageOptions ?? {}, (err, str) => {
        if (err) {
            console.error(`Error occurred receiving ${filePath} page.\nDetails:`, err);
            res.status(404).send(err);
            return;
        }
        layoutOptions = layoutOptions ?? {};
        layoutOptions.content = str;
        layoutOptions.cssFiles = cssFiles ?? [];
        res.render("layout.ejs", layoutOptions);
    });
}

// render the error page with a specific error
function renderError(req, res, error = null) {
    renderPage(req,
        res,
        "error.ejs",
        {title: "Error"},
        { error: error });
}

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

    renderPage(req,
        res,
        "login.ejs",
        { title: "Login" },
        { auth_path: "/redirect-to-auth" },
        ["pages/login.css"]);
});

// Route for profile page
app.get("/profile", async (req, res) => {
    renderPage(req,
        res,
        "profile.ejs",
        { title: "Profile", loading: true });
});

// Automatically redirect to authentication
app.get("/redirect-to-auth", (req, res) => {
    res.redirect(WCA_AUTH_URL(hostname));
});

// Route for auth-callback
app.get("/auth-callback", async (req, res) => {
    // if we didn't receive a code, redirect to home
    if (!req.query.code) {
        res.redirect("/");
        return;
    }

    // fetch token in callback
    const tokenData = await fetchToken(req, hostname);
    if (!tokenData.access_token) {
        renderPage(req,
            res,
            "error.ejs",
            {title: "Error"},
            { error: JSON.stringify(tokenData.error) ?? "שגיאה בתהליך ההתחברות." });
        return;
    }

    // set authToken cookie
    storeTokenCookie(res, tokenData);

    // redirect to profile page
    res.redirect("/profile");
});
// endregion

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
    try { authToken = JSON.parse(req.cookies[authTokenCookie]); }
    catch {
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
    if (userData.me)    res.json(userData.me);
    else                clearCookieAndRedirect();

    function clearCookieAndRedirect(toHome = false) {
        res.clearCookie(authTokenCookie);
        res.redirect(toHome ? "/home" : "/login");
    }
});

// get a source file
app.get("/src/*", (req, res) => {
    const filePath = path.resolve(path.join(__dirname, req.url));

    // TODO: i don't even think this does anything
    // a file is valid if the requested path is inside __dirname, for security reasons.
    const validFile = filePath.startsWith(path.resolve(__dirname));
    if (!validFile) {
        // permission denied html response
        res.status(403).send(`Permission denied - invalid file path.`);
        return;
    }

    // if the requested file doesn't exist, return a 404
    if (!fs.existsSync(filePath)) {
        res.status(404).send(`File ${req.url} not found.`);
        return;
    }

    res.sendFile(filePath);
});

// save a cookie
// cookieData is a JSON object or a string. (automatically stringifies)
// leave options null to use default cookieOptions (httpOnly=true, secure=true, sameSite=strict, maxAge=1 day)
function storeCookie(res, cookieName, cookieData, options = null) {
    // default cookie options
    options = options ?? {
        httpOnly:   true,               // Prevents JavaScript access (helps mitigate XSS)
        secure:     true,               // Ensures cookie is only sent over HTTPS
        sameSite:   'Strict',           // Prevents cross-site requests (mitigates CSRF)
        maxAge:     24 * 60 * 60 * 1000 // Cookie expires after 1 day
      };

    // cookieData is not a string
    if (typeof(cookieData) !== "string")
        cookieData = JSON.stringify(cookieData);

    res.cookie(cookieName, cookieData,options);
}

// store auth token cookie (specifically)
// tokenData is the full json response from the WCA API (assuming there wasn't an error)
function storeTokenCookie(res, tokenData) {
    storeCookie(res, authTokenCookie, {
        access_token:   tokenData.access_token,
        refresh_token:  tokenData.refresh_token,
        expires_in:     tokenData.expires_in
    });
}

// read the config file (default/local)
// handles exceptions (by throwing them :p )
function readConfigFile() {
    // config data defaults to website config
    let configData = {
        "port": 3000,
        "baseUrl": "https://comp.kehilush.com",
        "local": false
    };

    // local config file exists
    if (fs.existsSync(localConfigFile)) {
        try {
            configData = JSON.parse(fs.readFileSync(localConfigFile, 'utf-8'));
        }
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
    hostname = configData.baseUrl + (configData.local ? `:${configData.port}` : "")
    return configData;
}

// TODO: log out button logic
// TODO: for dynamic hiding/showing of login/profile pages, use options.loggedIn (for ejs options in the renderPage function)
// TODO: serverutils.js file to store function that server.js uses (like renderPage, renderError, readConfigFile...)

console.log("Reading config file...");
config = readConfigFile();
app.listen(config.port, () => {
    console.log(`Listening on ${hostname} (port ${config.port})${(config.local ? ", locally" : "")}`);
});
