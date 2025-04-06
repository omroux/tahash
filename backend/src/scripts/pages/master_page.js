const loadingContainer = document.querySelector("#loading_container");
const contentContainer = document.querySelector("#content_container");
const logsContainer = document.getElementById("logsContainer");


const postLog = (txt) => {
    const newEl = document.createElement("h2");
    newEl.innerText = txt;
    newEl.style.textAlign = "left";
    newEl.style.direction = "ltr";
    logsContainer.appendChild(newEl);
};

// #region cookies

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

// #region loading
const getLoadingState = () => contentContainer.hidden;
// set the loading state of the page
// true =>  hide content, show loading
// false => show content, hide loading
const setLoadingState = (state) => { loadingContainer.hidden = !(contentContainer.hidden = state); }
// #endregion

// #region login system
let _isLoggedIn = false;
const isLoggedIn = () => _isLoggedIn;
function setLoggedInState(state) { _isLoggedIn = state; };

// tokenData = response from WCA API
function storeLoginData(tokenData) {
    localStorage.setItem(accessTokenStorage, tokenData.access_token);
    localStorage.setItem(tokenExpireStorage, new Date().getTime() + 1000 * tokenData.expires_in);
    localStorage.setItem(refreshTokenStorage, tokenData.refresh_token);
    setCookie(loggedInCookie, "true", 1000 * tokenData.expires_in);
}

function clearLoginData() {
    localStorage.removeItem(accessTokenStorage);
    localStorage.removeItem(tokenExpireStorage);
    localStorage.removeItem(refreshTokenStorage);
    deleteCookie(loggedInCookie);
}
// #endregion

const accessTokenStorage = "accessToken";
const refreshTokenStorage = "refreshToken";
const tokenExpireStorage = "tokenExpire";
const loggedInCookie = "loggedIn";

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

    return await (await fetch(path, options)).json();
}
// TODO: setLoadingText(text="טוען...") possibly?

const hasTokenExpired = () => {
    if (!localStorage.getItem(tokenExpireStorage) || localStorage.getItem(tokenExpireStorage) <= new Date().getTime()) {
        localStorage.removeItem(accessTokenStorage);
        return true;
    }
    return false;
};

const pageLoadCallback = [];
const onPageLoad = (callback) => { pageLoadCallback.push(callback); };
let _invokedPageLoad = false;
const _invokePageLoad = () => {
    if(_invokedPageLoad) return;
    _invokedPageLoad = true;
    setTimeout(() => {
        pageLoadCallback.forEach(f => f());
    }, 10);
};

setLoadingState(true);
setLoggedInState(false);

// -- check if logged in
if (!hasTokenExpired() && localStorage.getItem(accessTokenStorage)) {
    setLoadingState(finishSetupLoadingState);
    setLoggedInState(true);
    _invokePageLoad();
}
else if (localStorage.getItem(refreshTokenStorage)) {
    sendRequest("/authenticateRefreshToken").then(res => {
        if (res.error) {
            clearLoginData();
            setLoadingState(finishSetupLoadingState);
            _invokePageLoad();
            return;
        }

        storeLoginData(res);
        setLoadingState(finishSetupLoadingState);
        setLoggedInState(true);
        _invokePageLoad();
    });
}
else {
    clearLoginData();
    setLoadingState(finishSetupLoadingState);
    _invokePageLoad();
}

