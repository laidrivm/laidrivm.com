FROM oven/bun:latest

WORKDIR /usr/src/app

COPY package.json bun.lockb ./

RUN bun install

COPY . .

RUN bun run build

CMD ["bun", "run", "prod"]
