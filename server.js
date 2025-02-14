const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const express = require('express');
const app = express();
const PORT = 3000;


// use EJS as the view engine
app.set('view engine', 'ejs');

// set the default views directory to src/views
app.set('views', path.join(__dirname, "src/views/"));

// helper function for dynamic active page updating
app.locals.isActive = (path) => path === req.path ? "Current-Page" : "";


// region Page Routing
// filePath = the page's file path *inside* src/views/pages, including .ejs extension. (src/views/pages/:filePath)
function renderPage(req, res, filePath, options) {
    // redirect to lowercase page request (not really necessary, but better to have)
    const pathname = req.url;
    if (pathname.toLowerCase() !== pathname) {
        res.redirect(pathname.toLowerCase());
        return;
    }

    // render the file
    ejs.renderFile(path.join(__dirname, "src/views/pages/", filePath), {}, (err, str) => {
        if (err) {
            console.error(`Error occurred receiving ${filePath} page.\nDetails:`, err);
            res.status(404).send(err);
            return;
        }
        options.content = str;
        // helper function for getting the active page
        options.isActive = (path) => path === filePath;
        res.render("layout.ejs", options);
    });
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
    renderPage(req, res, "login.ejs", { title: "Login" });
});
// endregion


// get a source file
app.get("/src/*", (req, res) => {
    const filePath = path.resolve(path.join(__dirname, req.url));

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


app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
