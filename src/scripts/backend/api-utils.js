require('dotenv').config();

const appId = process.env.APP_ID;
const clientSecret = process.env.CLIENT_SECRET;
const WCA_AUTH_URL = (callbackURI) => `https://www.worldcubeassociation.org/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackURI)}&response_type=code&scope=`;

// given an HTTP request (and response), redirects the requester to the auth page, securely :)
function redirectToWCAAuth(req, res) {
    // {protocol}://{host}/auth-callback
    const callbackUri = `${req.protocol}://${req.get('host')}/auth-callback`;
    res.redirect(WCA_AUTH_URL(callbackUri));
}


module.exports = {
    redirectToWCAAuth: redirectToWCAAuth
};
