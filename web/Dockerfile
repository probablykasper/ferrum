FROM node:6.11.2
RUN npm install -g  nodemon@1.11.0
RUN npm install     pug@2.0.0-rc.3
RUN npm install     mysql@2.14.1
RUN npm install     fs-path@0.0.23
RUN npm install     string@3.3.3
RUN npm install     node-sass@4.5.3
RUN npm install     body-parser@1.17.2
RUN npm install     validator@8.0.0

RUN npm install     bcryptjs@2.4.3
RUN npm install     connect-flash@0.1.1
RUN npm install     cookie-parser@1.4.3
RUN npm install     express@4.15.4
RUN npm install     express-handlebars@3.0.0
RUN npm install     express-messages@1.0.1
RUN npm install     express-session@1.15.5
RUN npm install     express-validator@3.2.1
RUN npm install     express-mysql-session@1.2.2
RUN npm install     passport@0.4.0
RUN npm install     passport-http@0.3.0
RUN npm install     passport-local@1.0.0

WORKDIR /usr/src/app

COPY src .

CMD ["nodemon", "server.js"]
