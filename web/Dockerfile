FROM node:6.11.1
RUN npm install -g  nodemon@1.11.0
RUN npm install     express@4.15.4

WORKDIR /usr/src/app

COPY package.json .
COPY src .

CMD ["nodemon", "server.js"]
