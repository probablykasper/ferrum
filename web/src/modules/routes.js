module.exports = (app) => {
    app.get("*", (req, res) => {
        if (req.session && req.session.passport && req.session.passport.user) {
            res.locals.loggedIn = true;
            res.locals.userID = req.session.passport.user;
        } else {
            res.locals.loggedIn = false;
            res.locals.userID = null;
        }
        res.render("template", {
            path: req.path
        });
    });
}
