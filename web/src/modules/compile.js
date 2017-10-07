const sass = require("node-sass");
const fs = require("fs");
const fsPath = require("fs-path");

const sassSuc = "\x1b[42m[Sass]\x1b[0m ";

module.exports = () => {
    sass.render({
        file: "sass/global.sass",
        includePaths: ["sass"],
        outputStyle: "compressed"
    }, function(err, result) {
        if (err) throw err;
        let newFilePath = "static/global.css";
        fsPath.writeFile(newFilePath, result.css, function(err) {
            if (err) throw err;
            console.log(sassSuc+"Rendered & Written file global.sass");
        });
    });
}
