FROM node:6.11.1
RUN npm install -g  nodemon@1.11.0
RUN npm install     node-sass@4.5.3
RUN npm install     string@3.3.3
RUN npm install     fs-path@0.0.23
RUN npm install     pug@2.0.0-rc.3
RUN npm install     google-closure-compiler-js@20170626.0.0

WORKDIR /usr/src/app

COPY package.json .
COPY src .

EXPOSE 3000
CMD ["nodemon", "server.js"]
