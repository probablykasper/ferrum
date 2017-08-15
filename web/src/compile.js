const fs = require("fs");
const fsPath = require("fs-path");
const S = require("string");
const sass = require("node-sass");

var jsSuc = "\x1b[42m[JS]\x1b[0m ";
var sassSuc = "\x1b[42m[Sass]\x1b[0m ";

function jsRender(filePath) {
    fs.readFile(filePath, function(err, fileContent) {
        if (err) throw err;
        let newFilePath = filePath.replace("pages/", "static/");
        fsPath.writeFile(newFilePath, fileContent, function(err) {
            if (err) throw err;
            console.log(jsSuc+"Rendered & Written file "+newFilePath);
        });
    });
}
function sassRender(filePath) {
    sass.render({
        file: filePath,
        includePaths: ["sass-includes"],
        outputStyle: "compressed"
    }, function(err, result) {
        if (err) throw err;
        let newFilePath = filePath.replace("pages/", "static/").replace(".sass", ".css");
        fsPath.writeFile(newFilePath, result.css, function(err) {
            if (err) throw err;
            console.log(sassSuc+"Rendered & Written file "+newFilePath);
        });
    });
}

function processFile(filePath) {
    if (S(filePath).endsWith(".sass")) {
        sassRender(filePath);
    } else if (S(filePath).endsWith(".js")) {
        jsRender(filePath);
    }
}

function processDir(dirpath) {
    let files = fs.readdirSync(dirpath);
    for (var i = 0; i < files.length; i++) {
        var current = dirpath+"/"+files[i];
        var stat = fs.statSync(current);
        if (stat.isDirectory()) processDir(current);
        else if (stat.isFile()) processFile(current);
    }
}

module.exports.dir = (dirPath) => {
    processDir(dirPath);
}
