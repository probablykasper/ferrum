const fs = require("fs");
function exists(path) {
	return fs.existsSync(path) ? true : false;
}
function r() {
    return "?r="+Math.trunc(Math.random()*1000);
}

module.exports.head = (text, options) => {
    let html = `<!DOCTYPE html><html><head>`;
    html += `<title>${text}</title>`;
    html += `<link href="https://fonts.googleapis.com/css?family=Nunito:400,500" rel="stylesheet">`;

    // favicons
    html += `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;
    html += `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">`;
    html += `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`;
    html += `<link rel="manifest" href="/manifest.json">`;
    html += `<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5">`;
    html += `<link rel="shortcut icon" href="/favicon.ico">`;
    html += `<meta name="msapplication-config" content="/browserconfig.xml">`;
    html += `<meta name="theme-color" content="#ffffff">`;

    // page css
    if (exists(`static${global.reqPath}/index.css`)) {
        html += `<link rel="stylesheet" type="text/css" href="${global.reqPath}/index.css${r()}">`
    }

    return `${html}</head><body><div class="bg"></div><div class="fg"></div>`;
}

module.exports.js = (text, options) => {
    let html = "";
    if (options.jquery) html += `<script src="/jquery-3.2.1.min.js"></script>`;
    if (options.jscookie) html += `<script src="/js.cookie-2.1.4.min.js"></script>`;
    if (options.rangeslider) html += `<script src="/rangeSlider-0.3.11.min.js"></script>`;

    // page js
    if (exists(`static${global.reqPath}/index.js`)) {
        html += `<script src="${global.reqPath}/index.js${r()}"></script>`;
    }

    return `${html}</body></html>`;
}
