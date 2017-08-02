'use strict';

var sass = require('node-sass');
var http = require("http");
var fs = require("fs");
var S = require('string');

// var ferrumErr = "\x1b[41m[Ferrum]\x1b[0m ";
var ferrumSuc = "\x1b[42m[Ferrum]\x1b[0m ";
var ferrumInf = "\x1b[46m[Ferrum]\x1b[0m ";
var sassErr = "\x1b[41m[Node-Sass]\x1b[0m ";
var sassSuc = "\x1b[42m[Node-Sass]\x1b[0m ";
sass.render({
    file: "sass/index.sass",
    includePaths: ["sass-includes"],
    outputStyle: "compressed"
}, function(error, result) {
    if (error) console.error(sassErr+error);
    else {
        console.log(sassSuc+"rendered successfully");
        fs.writeFile("css/index.css", result.css, function (err) {
            if (err) console.log(sassErr+"rendered file could not be written\x1b[0m");
            else console.log(sassSuc+"rendered file successfully");
        })
    }
});

function getHead(title) {
    var r = Math.trunc(Math.random()*1000);
    var a = `\n    <title>${title}</title>`
    var b = `\n    <link href=\"https://fonts.googleapis.com/css?family=Roboto:400,500\" rel=\"stylesheet\">`;
    var c = `\n    <link rel=\"stylesheet\" type=\"text/css\" href=\"/css${path}.css\">`;
    if (!fs.existsSync(`css${path}.css`)) c = "";
    return `<html>\n<head>`+a+b+c+`\n</head>\n<body>\n`;
}
function getJS(a = "", b = "", c = "") {
    var scripts = [a, b, c];
    var html = "";
    for (var i = 0; i < scripts.length; i++) {
        var toAdd = "";
        if (scripts[i] == "jquery")      toAdd = `https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js`;
        if (scripts[i] == "jscookie")    toAdd = `/js/js.cookie-2.1.4.min.js`;
        if (scripts[i] == "rangeslider") toAdd = `/js/rangeSlider-0.3.11.min.js`;
        if (toAdd != "") html += `<script src="${toAdd}"></script>\n`;
    }
    return `\n${html}</body>\n</html>\n`;
}

function extractJS(file) {
    file = file.toString(); // buffer -> string
    var fi = file.indexOf("\n"); // get first newline
    var head = eval(file.substr(0, fi)); // getHead()

    file = file.substr(fi+1); // remove first line
    var li = file.lastIndexOf("\n", file.length-2); // get 2nd last line
    var js = eval(file.substr(li+1)); // getJS()

    file = file.substr(0, li); // remove last line
    file = head+file+js;
    return new Buffer(file); // string -> buffer
}

var path;
http.createServer(function (req, res) {
    path = S(req.url).split("?")[0].substr(1);  // remove GET queries and starting slash

    if (S(path).startsWith("css/")) {
        if (exists(path)) respond(path, "text/css");
        else give404();
    } else if (S(path).startsWith("js/")) {
        if (exists(path)) respond(path, "text/javascript");
        else give404();
    } else {
        if (path == "") {
            respond("html/index.html", "text/html");
        } else if (exists(`html/${path}/index.html`)) {
            respond(`html/${path}/index.html`, "text/html");
        } else if (exists(`html/${path}.html`)) {
            respond(`html/${path}.html`, "text/html");
        } else {
            give404();
        }
    }
    function exists(filepath) {
        return fs.existsSync(filepath) ? true : false;
    }
    function give404() {
        respond("html/404.html", "text/html", 404);
    }
    function respond(path, contentType, stat = 200) {
        fs.readFile(path, function(err, data) {
            if (!err) {
                res.writeHead(stat, {"Content-Type": contentType});
                if (contentType == "text/html") data = extractJS(data);
                res.write(data);
                res.end();
            } else console.log("OHNO THAT'S NO GOOD, LITTLE SWEET BOY");
        });
    }

function old() {
    var done = false;
    if      (!done && S(path).startsWith("/css/")) read(path.substr(1), "text/css");
    else if (!done && S(path).startsWith("/js/")) read(path.substr(1), "text/js");
    else {
        if (path == "/") path = "/index";
        if      (fs.existsSync(`html${path}/index.html`)) path = `html${path}/index.html`;
        else if (fs.existsSync(`html${path}.html`))       path = `html${path}/index.html`;
        else path = `html/404.html`;
        read(path, "text/html", true);
    }

    function read(path, contentType, possible404 = false) {
        done = true;
        fs.readFile(path, function(err, data) {
            if (!err) {
                res.writeHead(200, {"Content-Type": contentType});
                if (contentType == "text/html") data = extractJS(data);
                res.write(data);
                res.end();
            }
        });
    }
}
}).listen(80);

console.log(ferrumInf+"server.js run through");
