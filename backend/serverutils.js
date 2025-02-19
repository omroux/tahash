import ejs from 'ejs';
import path from 'path';

export const authTokenCookie = "authToken";
export const __dirname = path.dirname(new URL(import.meta.url).pathname);

// filePath = the page's file path *inside* src/views/pages, including .ejs extension. (src/views/pages/:filePath)
// cssFiles = *string[]* paths to extra css stylesheets (inside src/stylesheets/)
export function renderPage(req, res, filePath, layoutOptions = {}, pageOptions = {}, cssFiles = []) {
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
export function renderError(req, res, error = null) {
    renderPage(req,
        res,
        "error.ejs",
        {title: "Error"},
        { error: error });
}


// save a cookie
// cookieData is a JSON object or a string. (automatically stringifies)
// leave options null to use default cookieOptions (httpOnly=true, secure=true, sameSite=strict, maxAge=1 day)
export function storeCookie(res, cookieName, cookieData, options = null) {
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
export function storeTokenCookie(res, tokenData) {
    storeCookie(res, authTokenCookie, {
        access_token:   tokenData.access_token,
        refresh_token:  tokenData.refresh_token,
        expires_in:     tokenData.expires_in
    });
}


// read the config file (default/local)
// handles exceptions (by throwing them :p )
export function readConfigFile() {
    const localConfigFile = "config.local.json";

    // config data defaults to website config
    let configData = {
        "port": 3000,
        "baseUrl": "https://comp.kehilush.com",
        "local": false
    };

    // read content from local file, if it exists
    if (fs.existsSync(localConfigFile)) {
        try { configData = JSON.parse(fs.readFileSync(localConfigFile, 'utf-8')); }
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
    return configData;
}
