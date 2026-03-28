# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Run the Express backend
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
