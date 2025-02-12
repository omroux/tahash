const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 3000;


// home page
app.get("/", (req, res) => {
    console.log(`Client with ip "${req.ip}" connected`);
    // res.send("<h1>tahash moment</h1>");
    res.redirect("src/pages/home.html");
});

// get a source file
app.get("/src/*", (req, res) => {
    const filePath = path.join(__dirname, req.url);
    if (!fs.existsSync(filePath))
        res.status(404).send(`File ${req.url} not found.`);
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
