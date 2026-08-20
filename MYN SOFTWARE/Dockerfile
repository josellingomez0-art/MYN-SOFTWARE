FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

RUN cd backend && npm install

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database

WORKDIR /app/backend

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
