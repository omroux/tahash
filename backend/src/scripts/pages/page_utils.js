const loggedInItem = "loggedIn";
// check if the user is logged in
const isLoggedIn = () => {
    if (sessionStorage.getItem(loggedInItem) == null) setLoggedIn(false);
    return sessionStorage.getItem(loggedInItem) === "true";
};
// set the logged in state to value
const setLoggedIn = (value) => {
    value = value.toString();
    if (value !== "false" && value !== "true")
        return;
    sessionStorage.setItem(loggedInItem, value);
};

// update the page menu
setLoggedIn(isLoggedIn());
