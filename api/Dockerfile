FROM node:6.11.1
RUN npm install -g  nodemon@1.11.0
RUN npm install     mysql@2.14.0

RUN npm install     express@4.15.4
RUN npm install     body-parser@1.17.2
RUN npm install     apollo-server-express@1.1.0
RUN npm install     graphql-tools@1.1.0
RUN npm install     graphql@0.10.5

WORKDIR /usr/src/app

COPY package.json .
COPY src .

CMD ["nodemon", "server.js"]
