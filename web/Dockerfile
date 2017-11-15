FROM node:8.9

COPY src/package.json .

RUN npm install -g  nodemon@1.11.0

RUN npm install     mysql@2.14.1
RUN npm install     elasticsearch@13.3.1
RUN npm install     multer@1.3.0
RUN npm install     base32@0.0.6

RUN npm install     pug@2.0.0-rc.3
RUN npm install     node-sass@4.5.3
RUN npm install     fs-path@0.0.23

RUN npm install     express@4.15.4
RUN npm install     body-parser@1.17.2
RUN npm install     validator@8.0.0
RUN npm install     express-session@1.15.5
RUN npm install     express-mysql-session@1.2.2

RUN npm install     passport@0.4.0
RUN npm install     passport-local@1.0.0
RUN npm install     bcryptjs@2.4.3

RUN npm install     music-metadata@0.8.4

WORKDIR /usr/src/app

COPY src .

CMD ["npm", "run", "start"]
