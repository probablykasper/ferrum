FROM node:6.11.1
RUN npm install -g  nodemon@1.11.0
RUN npm install     mysql@2.14.0
RUN npm install     express@4.15.4
RUN npm install     graphql@0.10.5
RUN npm install     express-graphql@0.6.7

RUN npm install     passport@0.4.0
RUN npm install     passport-http@0.3.0
RUN npm install     passport-local@1.0.0

RUN npm install     express-session@1.15.5
RUN npm install     bcryptjs@2.4.3
RUN npm install     cookie-parser@1.4.3

WORKDIR /usr/src/app

COPY package.json .
COPY src .

CMD ["nodemon", "server.js"]
