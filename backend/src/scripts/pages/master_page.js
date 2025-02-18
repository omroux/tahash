const loadingContainer = document.querySelector("#loading_container");
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

// TODO: setLoadingText(text="טוען...") possibly?
