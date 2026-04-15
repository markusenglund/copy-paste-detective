FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM deps AS frontend-build
COPY . .
RUN npm run web:build

FROM deps AS production
COPY . .
COPY --from=frontend-build /app/dist/web ./dist/web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "tsx", "src/server/index.ts"]
