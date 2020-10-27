FROM node:8.9

COPY src/package.json .

RUN npm install -g  nodemon@1.12.1

RUN npm install

WORKDIR /usr/src/app

COPY src .

CMD npm run $FERRUM_ENV
