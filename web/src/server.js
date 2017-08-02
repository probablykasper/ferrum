"use strict";
var production = false;

var sass = require("node-sass");
var http = require("http");
var fs = require("fs");
var mkdirp = require("mkdirp");
var getDirName = require("path").dirname;
var S = require("string");
const ferrumSuc = "\x1b[42m[Ferrum]\x1b[0m ";
const ferrumInf = "\x1b[46m[Ferrum]\x1b[0m ";
const sassErr = "\x1b[41m[Node-Sass]\x1b[0m ";
const sassSuc = "\x1b[42m[Node-Sass]\x1b[0m ";

processDir("pages");
function processDir(dir) {
	var files = fs.readdirSync(dir);
	for (var i = 0; i < files.length; i++) {
		var file = dir+"/"+files[i];
		var stat = fs.statSync(file);
		if (stat.isDirectory()) processDir(file);
		if (stat.isFile()) {
			if (S(file).endsWith(".sass")) renderSass(file);
		}
	}
}
function write(path, contents, cb) {
	mkdirp(getDirName(path), function(err) {
		if (err) return cb(err);
		fs.writeFile(path, contents, cb);
	});
}
function renderSass(file) {
	sass.render({
		file: file,
		includePaths: ["sass-includes"],
		outputStyle: "compressed"
	}, function(err, result) {
		if (err) return console.log(sassErr+err);
		else {
			console.log(sassSuc+`rendered file ${file} successfully`);
			fs.writeFile("css/index.css", result.css, function(err) {
				if (err) console.log(sassErr+`written file ${file} could not be written`);
				else console.log(sassSuc+`written file ${file} successfully`);
			});
		}
	});
}


function exists(filepath) {
	return fs.existsSync(filepath) ? true : false;
}

function getHead(title) {
	var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
	var a = `\n    <title>${title}</title>`;
	var b = `\n    <link href=\"https://fonts.googleapis.com/css?family=Roboto:400,500\" rel=\"stylesheet\">`;
	var c = `\n    <link rel=\"stylesheet\" type=\"text/css\" href=\"/${path}.css${r}\">`;
	if (!exists(`css/${path}.css`)) c = "";
	return `<html>\n<head>`+a+b+c+`\n</head>\n<body>\n`;
}
function getJS(a = "", b = "", c = "") {
	var r = production ? "" : "?r="+Math.trunc(Math.random()*1000);
	var scripts = [a, b, c];
	var html = "";
	for (var i = 0; i < scripts.length; i++) {
		var toAdd = "";
		if (scripts[i] == "jquery")      toAdd = `https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js`;
		if (scripts[i] == "jscookie")    toAdd = `/js/js.cookie-2.1.4.min.js`;
		if (scripts[i] == "rangeslider") toAdd = `/js/rangeSlider-0.3.11.min.js`;
		if (toAdd != "") html += `<script src="${toAdd}${r}"></script>\n`;
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
http.createServer(function(req, res) {
	path = S(req.url).split("?")[0].substr(1); // remove GET queries and starting slash

	if (S(path).startsWith("sass-includes") || S(path).startsWith("server.js")) {
		respond404();
	}

	if (S(path).endsWith(".css")) {
		if (exists(path)) respond(`css/${path}`, "text/css");
		else respond404();
	} else if (S(path).endsWith(".js")) {
		if (exists(path)) respond(path, "text/css");
		else respond404();
	} else {
		if (path == "")                                 respond("pages/index.html", "text/html");
		else if (exists(`pages/${path}/index.html`))    respond(`pages/${path}/index.html`, "text/html");
		else if (exists(`pages/${path}.html`))          respond(`pages/${path}.html`, "text/html");
		else                                            respond404();
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
