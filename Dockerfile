# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /usr/src/app

FROM base AS deps
ENV NODE_ENV=development
COPY package.json ./
RUN npm install

FROM deps AS build
ENV NODE_OPTIONS="--max-old-space-size=8192"
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY test ./test
COPY mail_templates ./mail_templates
RUN npm run build

FROM base AS prod-deps
COPY package.json ./
RUN npm install --omit=dev

FROM base AS dev
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=4096"
COPY package.json ./
RUN npm install
COPY nest-cli.json tsconfig*.json ./
CMD ["npm", "run", "start:dev"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/mail_templates ./mail_templates
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
