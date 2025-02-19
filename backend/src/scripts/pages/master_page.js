xconst loadingContainer = document.querySelector("#loading_container");
const contentContainer = document.querySelector("#content_container");


const hideElement = (e) => e.setAttribute("hidden", "");
const unhideElement = (e) => e.removeAttribute("hidden");

// set the loading state of the page
// true =>  hide content, show loading
// false => show content, hide loading
function setLoadingState(state) {
    if (state) {
        // hide content, show loading
        unhideElement(loadingContainer);
        hideElement(contentContainer);
    }
    else {
        // show content, hide loading
        hideElement(loadingContainer);
        unhideElement(contentContainer);
    }
}

// send a fetch request, specifically to the server
// path: the local path (e.g. "/home", "/wca-me"...)
// options: the http request (fetch) options.
//          For any unset properties, the default property will be used. (method="GET",headers={},body=undefined).
//          In addition, sending a request this way sets the "From-Client" to true,
//          to tell the server this request was sent from a client (and not from a browser)
// returns: the response from the server *as a JSON object*.
async function sendRequest(path, options = {}) {
    const fromClientHeader = "From-Client";
    options.method = options.method ?? "GET";
    options.headers = options.headers ?? {};
    options.headers[fromClientHeader] = "true";

    return await (await fetch(path, options)).json();
}

// TODO: setLoadingText(text="טוען...") possibly?
