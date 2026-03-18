FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=build /usr/src/app/dist /usr/src/app/dist
COPY --from=build /usr/src/app/package.json /usr/src/app/package.json
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/public /usr/src/app/public
COPY --from=build /usr/src/app/server/templates /usr/src/app/server/templates
COPY --from=build /usr/src/app/scripts /usr/src/app/scripts

WORKDIR /usr/src/app
EXPOSE 3000
CMD [ "pnpm", "start" ]
