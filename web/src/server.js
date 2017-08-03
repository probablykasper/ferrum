"use strict";
var production = false;
var fs = require("fs");
var S = require("string");
var fsPath = require("fs-path");
const ferrumSuc = "\x1b[42m[Ferrum]\x1b[0m ";
const ferrumInf = "\x1b[46m[Ferrum]\x1b[0m ";
const sassErr = "\x1b[41m[Node-Sass]\x1b[0m ";
const sassSuc = "\x1b[42m[Node-Sass]\x1b[0m ";


function renderSass(file) {
	var sass = require("node-sass");
	sass.render({
		file: file,
		includePaths: ["sass-includes"],
		outputStyle: "nested"
	}, function(err, result) {
		if (err) return console.log(sassErr+err.file);
		else {
			console.log(sassSuc+`rendered file ${file} successfully`);
			var newFilePath = "css"+file.substr(5, file.length-5-4)+"css";
			fsPath.writeFile(newFilePath, result.css, function(err) {
				if (err) console.log(sassErr+`written file ${file} could not be written`);
				else console.log(sassSuc+`written file ${file} successfully`);
			});
		}
	});
}
function sassWatch(file, rerenderAll = false) {
    fs.watch(file, function(eventType, filename) {
        if (rerenderAll) processDir("pages");
        else renderSass(file);
    });
}
function processDir(dir, options = {}) {
	var files = fs.readdirSync(dir);
	for (var i = 0; i < files.length; i++) {
		var file = dir+"/"+files[i];
		var stat = fs.statSync(file);
		if (stat.isDirectory()) processDir(file);
		else if (stat.isFile()) {
			if (options.isSassIncludesDir && S(file).endsWith(".sass")) {
                sassWatch(file, true);
            } else if (S(file).endsWith(".sass")) {
                renderSass(file);
                sassWatch(file);
            }
		}
	}
}
processDir("pages");
processDir("sass-includes", {
    isSassIncludesDir: true
});

function exists(filepath) {
	return fs.existsSync(filepath) ? true : false;
}

function getHead(title) {
	var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
	var a = `\n    <title>${title}</title>`;
	var b = `\n    <link href=\"https://fonts.googleapis.com/css?family=Roboto:400,500\" rel=\"stylesheet\">`;
	var c = `\n    <link rel=\"stylesheet\" type=\"text/css\" href=\"/${path}.css${r}\">`;
	if (!exists(`css/${path}.css`) && !exists(`css/${path}/index.css`)) c = "";
	return `<html>\n<head>`+a+b+c+`\n</head>\n<body>\n`;
}
function getJS(a = "", b = "", c = "") {
	var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
	var html = "", scripts = [a, b, c];
	for (var i = 0; i < scripts.length; i++) {
		var toAdd = "";
		if (scripts[i] == "jquery")      toAdd = `https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js`;
		if (scripts[i] == "jscookie")    toAdd = `/js/js.cookie-2.1.4.min.js`;
		if (scripts[i] == "rangeslider") toAdd = `/js/rangeSlider-0.3.11.min.js`;
		if (toAdd != "") html += `<script src="${toAdd}"></script>\n`;
	}
	if (exists(`pages/${path}.js`) || exists(`pages/${path}/index.js`)) {
		html += `<script src="${path}.js${r}"></script>\n`;
	}
	return `\n${html}</body>\n</html>\n`;
}
function extractJS(file) {
	file = file.toString(); // buffer -> string
	var fi = file.indexOf("\n"); // get first newline position
	var head = eval(file.substr(0, fi)); // getHead()

	file = file.substr(fi+1); // remove first line
	var li = file.lastIndexOf("\n", file.length-2); // get 2nd last line
	var js = eval(file.substr(li+1)); // getJS()

	file = file.substr(0, li); // remove last line
	file = head+file+js;
	return new Buffer(file); // string -> buffer
}

var path;
var http = require("http");
http.createServer(function(req, res) {
	path = S(req.url).split("?")[0].substr(1); // remove GET queries and starting slash

	// Forbidden directories
	if      (S(path).startsWith("sass-includes")) respond404();
	else if (S(path).startsWith("server.js")) respond404();
	// Allowed filestypes
	else if (checkCSS());
	else if (checkJS());
	else if (checkImg());
	// HTML
	else {
		if (path == "")                                 respond("pages/index.html", "text/html");
		else if (exists(`pages/${path}/index.html`))    respond(`pages/${path}/index.html`, "text/html");
		else if (exists(`pages/${path}.html`))          respond(`pages/${path}.html`, "text/html");
		else                                            respond404();
	}
	function checkCSS() {
		if (S(path).endsWith(".css")) {
			var pathWE = path.substr(0, path.length-4); // without extension
			if      (exists(`css/${pathWE}.css`)) respond(`css/${pathWE}.css`, "text/css");
			else if (exists(`css/${pathWE}/index.css`)) respond(`css/${pathWE}/index.css`, "text/css");
			else respond404();
			return true;
		} else return false
	}
	function checkJS() {
		if (S(path).endsWith(".js")) {
			var pathWE = path.substr(0, path.length-3); // without extension
			if      (exists(`pages/${pathWE}.js`)) respond(`pages/${pathWE}.js`, "text/css");
			else if (exists(`pages/${pathWE}/index.js`)) respond(`pages/${pathWE}/index.js`, "text/css");
			else respond404();
			return true;
		} else return false
	}
	function checkImg() {
		if (S(path).endsWith(".jpg") && S(path).startsWith("cdn/")) {
			var pathWE = path.substr(0, path.length-4); // without extension
            console.log(pathWE);
			if      (exists(`${pathWE}.jpg`)) respond(`${pathWE}.jpg`, "image/jpg");
			else respond404();
			return true;
		} else return false
	}

	function respond404() {
		respond("pages/404.html", "text/html", 404);
	}
	function respond(path, contentType, stat = 200) {
		fs.readFile(path, function(err, data) {
			if (!err) {
				res.writeHead(stat, {"Content-Type": contentType});
				if (contentType == "text/html") data = extractJS(data);
				res.write(data);
				res.end();
			} else console.log("OH NO :o");
		});
	}
}).listen(80);

console.log(ferrumInf+"server.js run through");
