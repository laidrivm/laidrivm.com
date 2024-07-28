FROM oven/bun:latest AS base

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /usr/src/app

COPY package.json bun.lockb ./
COPY articles ./articles
COPY public ./public
COPY out ./out

RUN mkdir -p certs && chown -R appuser:appgroup certs
RUN chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 3000

ENTRYPOINT [ "bun", "run", "prod" ]