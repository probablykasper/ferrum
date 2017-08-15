const express = require("express");
const path = require("path");
const db = require("./db");
const pug = require("./pug");
const compile = require("./compile");
compile.dir("pages");

// Init server
const app = express();

// load view engine
app.set("views", path.join(__dirname, "pages"));
app.set("view engine", "pug");

// js/css/favicons
app.use("/", express.static("static/", { redirect: false }));
app.use("/", express.static("static/favicon", { redirect: false }));

function page(url, pugOptions = {}) {
    app.get(`${url}`, (req, res) => {
        // remove query and last slash if it exists
        global.reqPath = req.url.split("?")[0];
        if (global.reqPath.slice(-1) == "/") global.reqPath = global.reqPath.slice(0, -1);
        pugOptions.filters = {
            "head": pug.head,
            "js": pug.js
        }
        res.render("music/index", pugOptions);
    });
}
page("/music");

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
