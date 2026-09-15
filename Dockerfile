# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM mcr.microsoft.com/azure-functions/node:4-node22

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true \
    NODE_ENV=production

WORKDIR /home/site/wwwroot

COPY host.json package.json ./
COPY --from=build /workspace/dist ./dist
COPY --from=build /workspace/node_modules ./node_modules
