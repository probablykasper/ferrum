// core modules
const path = require("path");
// modules
const bodyParser = require("body-parser");
// express modules
const express = require("express");
const app = express();
// local modules
const compile = require("./modules/compile");
compile();

// load view engine
app.set("views", "pug");
app.set("view engine", "pug");

// static content
app.use("/", express.static("static/", { redirect: false }));
app.use("/", express.static("static/favicon/", { redirect: false }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

app.use("/", (req, res) => {
    res.render("template")
});

// start server
app.listen(80, function() {
    console.log("Express server listening");
});
