FROM node:6.11.1
RUN npm install -g  nodemon@1.11.0
RUN npm install     mysql@2.14.0
RUN npm install     restify@5.0.1

WORKDIR /usr/src/app

COPY package.json .
COPY src .

EXPOSE 3000
CMD ["nodemon", "server.js"]
