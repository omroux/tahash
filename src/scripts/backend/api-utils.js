require('dotenv').config();

const appId = process.env.APP_ID;
const clientSecret = process.env.CLIENT_SECRET;
const WCA_AUTH_URL = (callbackURI) => `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackURI)}&response_type=code&scope=`;

// given an HTTP request (and response), redirects the requester to the auth page, securely :)
function redirectToWCAAuth(req, res) {
    // {protocol}://{host}/auth-callback
    const pathArr = req.headers.referer.split('/');
    const protocol = pathArr[0];
    const host = pathArr[2];
    const callbackUri = `${protocol}//${host}/auth-callback`;
    res.redirect(WCA_AUTH_URL(callbackUri));
}


module.exports = {
    redirectToWCAAuth: redirectToWCAAuth
};
