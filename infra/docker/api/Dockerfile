# Build context is the repo root (npm workspaces span services/api + packages/shared-types)
FROM node:20-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

FROM base AS prod-deps
RUN npm ci --omit=dev --ignore-scripts

FROM base AS build
RUN npm ci --ignore-scripts
COPY services/api services/api
COPY packages/shared-types packages/shared-types
RUN npm run build --workspace=@medilink/api

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/services/api/dist ./services/api/dist
COPY --from=build /repo/services/api/package.json ./services/api/package.json
EXPOSE 3000
CMD ["node", "services/api/dist/main.js"]
