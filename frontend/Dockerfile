FROM node:23-alpine

WORKDIR /app
COPY . /app

ENV NODE_ENV production
RUN npm ci --only=production
RUN npm install

CMD "cd" "frontend"
CMD "npm" "start"
