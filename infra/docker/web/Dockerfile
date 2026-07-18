# Build context is the repo root (npm workspaces span apps/web-portal + packages/shared-types)
FROM node:20-alpine AS base
WORKDIR /repo
# package-lock.json is intentionally NOT copied here: it was generated on
# Windows, and npm's lockfile only carries fully-resolved metadata for the
# platform that generated it. lightningcss/@next/swc ship OS-specific
# optional binaries (win32-x64-msvc vs linux-x64-musl); reusing the
# Windows lockfile leaves the linux-musl variant unresolved and the build
# fails with "Cannot find module '.../lightningcss.linux-x64-musl.node'".
# A lockfile-less install lets npm resolve the correct binaries for this
# container's actual platform.
COPY package.json ./
COPY apps/web-portal/package.json apps/web-portal/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

FROM base AS build
RUN npm install
COPY apps/web-portal apps/web-portal
COPY packages/shared-types packages/shared-types
RUN npm run build --workspace=@medilink/web-portal

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/apps/web-portal/.next/standalone ./
COPY --from=build /repo/apps/web-portal/.next/static ./apps/web-portal/.next/static
COPY --from=build /repo/apps/web-portal/public ./apps/web-portal/public
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/web-portal/server.js"]
