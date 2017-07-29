'use strict';
var mysql = require("mysql");
var restify = require("restify");
const PORT = 80;

var connection = mysql.createConnection({
  host     : 'http://db',
  user     : 'root',
  password : '123',
  database : 'ferrum'
});
connection.connect(function(err) {
    if (err) {
        console.error("error connecting: "+err.stack);
        return;
    }
    console.log("connected as id "+connection.threadId);
});

function respond(req, res, next) {
    res.send("hello " + req.params.name);
    next();
}

var server = restify.createServer({
    name: "Ferrum API"
});
server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.listen(PORT, () => {
    console.log("Server is running on port "+PORT);
});
