FROM ubuntu:16.04

WORKDIR /code

RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "LANG=en_US.UTF-8" >> /etc/environment
RUN echo "NODE_ENV=development" >> /etc/environment
RUN more "/etc/environment"

RUN apt-get update
RUN apt-get install curl git zip ncdu build-essential -y

COPY package.json package.json
COPY package-lock.json package-lock.json

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_13.x | bash
RUN apt-get install --yes nodejs
RUN node -v
RUN npm -v
RUN npm install
RUN npm i -g nodemon
RUN nodemon -v
RUN npm i -g ember-cli@3.15
RUN ember -v

# Cleanup
RUN apt-get update && apt-get upgrade -y && apt-get autoremove -y



COPY . .
