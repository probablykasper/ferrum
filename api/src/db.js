var mysql = require("mysql");
var db = mysql.createConnection({
    host     : "db",
    port     : "3306",
    user     : "api",
    password : "nXPwPs4e22*W2j42c9sdWa8FuII4y",
    database : "ferrum"
});
db.connect(function(err) {
    if (err) console.log("MySQL error connecting: "+err.stack);
});

module.exports = db;
