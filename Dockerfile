FROM oven/bun:latest AS builder

WORKDIR /usr/src/app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

RUN bun run build

FROM oven/bun:latest

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/out ./out
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package.json .

EXPOSE 3000

CMD ["bun", "run", "prod"]
