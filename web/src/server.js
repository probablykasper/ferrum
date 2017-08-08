"use strict";
const http = require("http");
const S = require("string");
const fs = require("fs");
const sass = require("node-sass");
const fsPath = require("fs-path");
const pug = require("pug");
const compile = require("google-closure-compiler-js");

const production = false;

const ferrumSuc = "\x1b[42m[Ferrum]\x1b[0m ";
const ferrumErr = "\x1b[41m[Ferrum]\x1b[0m ";
const ferrumInf = "\x1b[46m[Ferrum]\x1b[0m ";
const jsSuc = "\x1b[42m[JS]\x1b[0m ";
const jsErr = "\x1b[41m[JS]\x1b[0m ";
const jsInf = "\x1b[46m[JS]\x1b[0m ";
const sassSuc = "\x1b[42m[Sass]\x1b[0m ";
const sassErr = "\x1b[41m[Sass]\x1b[0m ";
const sassInf = "\x1b[46m[Node-Sass]\x1b[0m ";



function pugRender(path) {
    function pugHead(text, options) {
        var html = "<!DOCTYPE html><html><head>";
        html += `<title>${text} - Ferrum</title>`;
        html += `<link href="https://fonts.googleapis.com/css?family=Nunito:400,500" rel="stylesheet">`;
        html += `<link href="https://fonts.googleapis.com/css?family=Roboto:400,500" rel="stylesheet">`;

        // favicons
        html += `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;
        html += `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">`;
        html += `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`;
        html += `<link rel="manifest" href="/manifest.json">`;
        html += `<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#1489ab">`;
        html += `<meta name="theme-color" content="#ffffff">`;

        // page css
        var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
        var cssPath = path.replace("pages/", "").replace(".pug", ".css");
        var pageCSS = `<link rel="stylesheet" type="text/css" href="/${cssPath}${r}">`;

        if (exists(`css/${cssPath}`)) html += pageCSS;
        return `${html}</head><body><div class="bg"></div>`;
    }
    function pugJS(text, options) {
        var html = "";
        if (options.jquery) html += `<script src="/jquery-3.2.1.min.js"></script>`;
        if (options.jscookie) html += `<script src="/js.cookie-2.1.4.min.js"></script>`;
        if (options.rangeslider) html += `<script src="/rangeSlider-0.3.11.min.js"></script>`;

        // page js
        var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
        var jsPath = path.replace("pages/", "").replace(".pug", ".js");
        var pageJS = `<script src="/${jsPath}${r}"></script>`;
        if (exists(`js/${jsPath}`)) {
            console.log("yeha");
            html += pageJS;
        } else {
            console.log(jsPath);
        }

        html += "</body></html>";
        return html;
    }
    return pug.renderFile(path, {
        "filename": path,
        "filters": {
            "head": pugHead,
            "js": pugJS
        }
    });
}
function jsRender(path) {
    fs.readFile(path, function(err, fileContent) {
        if (err) console.log(jsErr+`could not read file ${path}`)
        else {
            console.log(jsSuc+`read file ${path}`);
            var newFilePath = path.replace("pages/", "js/");
            fsPath.writeFile(newFilePath, fileContent, function(err) {
                if (err) console.log(jsErr+`read file ${path} could not be written`);
                else console.log(jsSuc+`written file ${newFilePath}`);
            });
        }
    });
}
function jsWatch(path) {
    if (!production) {
        fs.watch(path, function(eventType, filename) {
            jsRender(path);
        });
    }
}
function sassRender(path) {
    sass.render({
        file: path,
        includePaths: ["sass-includes"],
        outputStyle: "compressed"
    }, function(err, result) {
        if (err) console.log(sassErr+err.message);
        else {
            console.log(sassSuc+`rendered file ${path}`);
            var newFilePath = path.replace("pages/", "css/").replace(".sass", ".css");
            fsPath.writeFile(newFilePath, result.css, function(err) {
				if (err) console.log(sassErr+`rendered file ${path} could not be written`);
				else console.log(sassSuc+`written file ${path}`);
            });
        }
    });
}
function sassWatch(path, includesDir = false) {
    if (!production) {
        fs.watch(path, function(eventType, filename) {
            if (includesDir) processDir("pages");
            else sassRender(path);
        });
    }
}
function processFile(path, includesDir = false) {
    if (S(path).endsWith(".sass")) {
        if (!includesDir) sassRender(path);
        sassWatch(path, includesDir);
    } else if (S(path).endsWith(".js")) {
        jsRender(path);
        jsWatch(path);
    } else if (S(path).endsWith(".pug")) {
        // pugRender(path);
    }
}
function processDir(dirpath, includesDir = false) {
    var files = fs.readdirSync(dirpath);
    for (var i = 0; i < files.length; i++) {
        var current = dirpath+"/"+files[i];
        var stat = fs.statSync(current);
        if (stat.isDirectory()) processDir(current, includesDir);
        else if (stat.isFile()) processFile(current, includesDir);
    }
}
processDir("pages");
processDir("sass-includes", true);



function exists(path) {
	return fs.existsSync(path) ? true : false;
}
function getPath(path) {
    // content-types: https://msdn.microsoft.com/en-us/library/ms527550(v=exchg.10).aspx
    var object = { stat: 200 }
    var file404 = false;
    // HTML homepage
        if (path == "") {
            object.contentType = `text/html`;
            object.path = `pages/index.pug`;
    // CSS
        } else if (S(path).endsWith(".css")) {
            if (exists(`css/${path}`)) {
                object.contentType = `text/css`;
                object.path = `css/${path}`;
            } else file404 = true;
    // JS
        } else if (S(path).endsWith(".js")) {
            if (exists(`js/${path}`)) {
                object.contentType = `text/javascript`;
                object.path = `js/${path}`;
            } else file404 = true;
    // CDN
        } else if (S(path).startsWith("cdn/")) {
            if (exists(path)) {
                if (S(path).endsWith(".jpg")) {
                    object.contentType = `image/jpeg`;
                }
                object.path = path;
            } else file404 = true;
    // HTML page
        } else if (exists(`pages/${path}/index.pug`)) {
            object.contentType = `text/html`;
            object.path = `pages/${path}/index.pug`;
    // Favicons
        } else if (
               path == "android-chrome-192x192.png"
            || path == "android-chrome-256x256.png"
            || path == "apple-touch-icon.png"
            || path == "browserconfig.xml"
            || path == "favicon-16x16.png"
            || path == "favicon-32x32.png"
            || path == "favicon.ico"
            || path == "manifest.json"
            || path == "mstile-150x150.png"
            || path == "safari-pinned-tab.svg"
            || path == "favicon-32x32.png"
        ) {
            object.path = `cdn/favicons/${path}`;
            object.contentType = "image/x-icon";
    // HTML 404 page
        } else {
            object.contentType = `text/html`;
            object.path = `pages/404/index.pug`;
            object.stat = 404;
        }
    // non-HTML 404
        if (file404) {
            object.contentType = `text/html`;
            object.path = `pages/404/index.pug`;
            object.stat = 404;
        }
    return object;
}
function read(path, callback) {
    // callback(fileContent, contentType, htmlStatus)
    var pathInfo = getPath(path);
    fs.readFile(pathInfo.path, function(err, fileContent) {
        if (pathInfo.contentType == "text/html") fileContent = pugRender(pathInfo.path);
        if (!err) callback(fileContent, pathInfo.contentType, pathInfo.stat);
        else console.log(ferrumErr+`Failed to read file ${pathInfo.path}`);
    });
}
function respond(req, res) {
    // Remove GET query and trim slashes
    var path = S(req.url).split("?")[0].slice(1);
    if (path.slice(-1) == "/") path = path.slice(0, -1);

    read(path, function(fileContent, contentType, stat) {
        res.writeHead(stat, {"Content-Type": contentType});
        res.write(fileContent);
        res.end();
    });
}
http.createServer(respond).listen(80);
