const express = require('express');
const app = express();
const PORT = 3000;


// home page
app.get("/", (req, res) => {
    console.log(`Client with ip "${req.ip}" connected`);
    res.send("<h1>tahash moment</h1>");
});


app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
