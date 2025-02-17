FROM node:23-alpine

WORKDIR /app
COPY . /app

ENV NODE_ENV=production
RUN npm ci --only=production && npm install

EXPOSE 3000

CMD ["npm", "start"]