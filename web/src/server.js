"use strict";
const http = require("http");
const S = require("string");
const fs = require("fs");

const production = false;
const ferrumErr = "\x1b[41m[Ferrum]\x1b[0m ";
// const ferrumSuc = "\x1b[42m[Ferrum]\x1b[0m ";
// const ferrumInf = "\x1b[46m[Ferrum]\x1b[0m ";
// const sassErr = "\x1b[41m[Node-Sass]\x1b[0m ";
// const sassSuc = "\x1b[42m[Node-Sass]\x1b[0m ";

if (production) {
    
}

function exists(path) {
	return fs.existsSync(path) ? true : false;
}
function getPath(path) {
    var object = { stat: 200 }
    // Homepage HTML
        if (path == "") {
            object.contentType = `text/html`;
            object.path = `pages/index.html`;
    // CSS
        } else if (S(path).endsWith(".css") && exists(`css/${path}`)) {
            object.contentType = `text/css`;
            object.path = `css/${path}`;
    // JS
        } else if (S(path).endsWith(".js") && exists(`js/${path}`)) {
            object.contentType = `text/javascript`;
            object.path = `js/${path}`;
    // Normal page
        } else if (exists(`pages/${path}/index.html`)) {
            object.contentType = `text/html`;
            object.path = `pages/${path}/index.html`;
    // 404
        } else {
            object.contentType = `text/html`;
            object.path = `pages/404/index.html`;
            object.stat = 200;
        }
    return object;
}
function read(path, callback) {
    // callback(fileContent, contentType, htmlStatus)
    var pathInfo = getPath(path);
    fs.readFile(pathInfo.path, function(err, fileContent) {
        if (!err) callback(fileContent, pathInfo.contentType, pathInfo.stat);
        else console.log(ferrumErr+`Failed to read file ${pathInfo.path}`);
    });
}

function respond(req, res) {
    // Remove GET query and slash
    var path = S(req.url).split("?")[0].substr(1);

    read(path, function(fileContent, contentType, stat) {
        res.writeHead(stat, {"Content-Type": contentType});
        res.write(fileContent);
        res.end();
    });
}
http.createServer(respond).listen(80);
