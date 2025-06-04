const loadingContainer = document.querySelector("#loading_container");
const contentContainer = document.querySelector("#content_container");
const logsContainer = document.getElementById("logsContainer");

// #region Debugging System

// post a new log at the top of the page
// returns the log element
const postLog = (txt, alignLeft = false) => {
    const newEl = document.createElement("h2");
    newEl.innerText = txt;
    if (alignLeft) {
        newEl.style.textAlign = "left";
        newEl.style.direction = "ltr";
    }
    logsContainer.appendChild(newEl);

    return newEl;
};

// #endregion

// #region Displaying Errors

const errorsStorage = "errorsList";
// go to /error and display error messages
// if the message is null, no context will be given
function throwError(...errors) {
    localStorage.setItem(errorsStorage, JSON.stringify(errors));
    window.location = "/error";
};

// #endregion

// #region Cookies Management

function setCookie(name, value, expireMs = null) {
    let expires = "";
    if (expireMs != null) {
        var date = new Date();
        date.setTime(date.getTime() + expireMs);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name, "", 0);
}

// #endregion

// #region Page Loading System

const getLoadingState = () => contentContainer.hidden;
// set the loading state of the page
// true =>  hide content, show loading
// false => show content, hide loading
const setLoadingState = (state) => { loadingContainer.hidden = !(contentContainer.hidden = state); }

// #endregion

// #region Login System

const accessTokenStorage = "accessToken";
const refreshTokenStorage = "refreshToken";
const tokenExpireStorage = "tokenExpire";
const wcaMeStorage = "wcaMe";
const loggedInCookie = "loggedIn";

let _isLoggedIn = false;
const isLoggedIn = () => _isLoggedIn;
function setLoggedInState(state) { _isLoggedIn = state; };

// store the login data received from the WCA API token
// tokenData = response from WCA API
function storeLoginData(tokenData) {
    if (!tokenData)
        return;

    localStorage.setItem(accessTokenStorage, tokenData.access_token);
    localStorage.setItem(tokenExpireStorage, new Date().getTime() + 1000 * tokenData.expires_in);
    localStorage.setItem(refreshTokenStorage, tokenData.refresh_token);
    setCookie(loggedInCookie, "true", 1000 * tokenData.expires_in);
    setLoggedInState(true);
}

function clearLoginData() {
    localStorage.removeItem(accessTokenStorage);
    localStorage.removeItem(tokenExpireStorage);
    localStorage.removeItem(refreshTokenStorage);
    sessionStorage.removeItem(wcaMeStorage);
    deleteCookie(loggedInCookie);
    setLoggedInState(false);
}

// has the saved token expired
const hasTokenExpired = () => {
    if (!localStorage.getItem(tokenExpireStorage) || localStorage.getItem(tokenExpireStorage) <= new Date().getTime()) {
        localStorage.removeItem(accessTokenStorage);
        return true;
    }
    return false;
};

// #endregion

// #region WCA me handling

function hasStoredWcaMeData() {
    return sessionStorage.getItem(wcaMeStorage) != null;
}

// retrieves WCA Me data (object) using data the website has.
// automatically disconnects in case of an error
async function getWcaMe(forceFetch = false) {
    if (!isLoggedIn())
        return null;

    let wcaMeData;
    if (!forceFetch) {
        wcaMeData = sessionStorage.getItem(wcaMeStorage);
        if (wcaMeData)
            return JSON.parse(wcaMeData);
    }

    wcaMeData = await sendRequest("/wca-me");
    if (wcaMeData.error) {
        clearLoginData();
        return null;
    }

    sessionStorage.setItem(wcaMeStorage, JSON.stringify(wcaMeData));
    
    return wcaMeData;
}

// #endregion

// #region Requests Handling

// "global" headers
const wcaIdHeader = "wca-id";
const userIdHeader = "user-id";
const eventIdHeader = "event-id";

// "global" (query) parameters
const compNumberParameter = "comp";

// send a fetch request, specifically to the server
// path: the local path (e.g. "/home", "/wca-me"...)
// options: the http request (fetch) options.
//          For any unset properties, the default property will be used. (method="GET",headers={},body=undefined).
//          In addition, sending a request this way sets the "From-Client" to true,
//          to tell the server this request was sent from a client (and not from a browser)
// returns: the response from the server *as a JSON object*.
async function sendRequest(path, options = {}) {
    const fromClientHeader = "from-client";
    const accessTokenHeader = "access-token";
    const refreshTokenHeader = "refresh-token";

    options.method = options.method ?? "GET";
    options.headers = options.headers ?? {};
    options.headers[fromClientHeader] = "true";
    options.headers[accessTokenHeader] = window.localStorage.getItem(accessTokenStorage);
    options.headers[refreshTokenHeader] = window.localStorage.getItem(refreshTokenStorage);

    try {
        const res = await fetch(path, options);
        return await res.json();
    }
    catch (e) {
        return await Promise.reject(e);
    }

}

// #endregion

// #region Admin Permissions

// update the admin permissions using the WCA API token data
// forces wca data to fetch, and fetches admin perms from the server.
async function getAdminPerms() {
    const wcaMeData = await getWcaMe(true);
    if (!wcaMeData)
        return false;

    const headers = { };
    headers[wcaIdHeader] = wcaMeData.wca_id;
    const res = await sendRequest("/isAdmin", { headers: headers });
    return res.isAdmin;
}

// #endregion

// #region On Page Load System
const pageLoadCallback = [];
let _invokedPageLoad = false;
const onPageLoad = (callback) => { if (_invokedPageLoad) { callback() } else { pageLoadCallback.push(callback); } };
const _invokePageLoad = () => {
    if(_invokedPageLoad) return;
    _invokedPageLoad = true;
    setTimeout(() => {
        pageLoadCallback.forEach(f => f());
    }, 10);
};

// #endregion

// #region Login Maintenance

setLoadingState(true);
setLoggedInState(false);

// -- check if logged in
if (!hasTokenExpired() && localStorage.getItem(accessTokenStorage)) {
    setLoadingState(finishSetupLoadingState);
    setLoggedInState(true);
    _invokePageLoad();
}
else if (localStorage.getItem(refreshTokenStorage)) {
    sendRequest("/authenticateRefreshToken").then(async (res) => {
        if (res.error) {
            clearLoginData();
            setLoadingState(finishSetupLoadingState);
            _invokePageLoad();
            return;
        }

        storeLoginData(res);
        window.location = window.location; // reload the page, so the website will reload with the new cookie
        return;
    });
}
else {
    clearLoginData();
    setLoadingState(finishSetupLoadingState);
    _invokePageLoad();
}

// #endregion

// #region General Utils

// Sleep for [ms] milliseconds
async function sleep(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}
// #endregion

// #region HTML Common Attribute

const hiddenAttribute = "hidden";

// #endregion
