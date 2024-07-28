# laidrivm.com

## Run locally

Install dependencies:

```bash
bun install
```

Server requires https, even locally, so create certs. Here's an example for MacOS:

```bash
brew install mkcert
brew install nss # if you use Firefox
mkcert -install
mkcert localhost
```

Copy them to the project's directory:

```bash
cp {PATH/TO/CERTIFICATE-KEY-FILENAME}.pem /certs/key.pem
cp {PATH/TO/CERTIFICATE-FILENAME}.pem /certs/cert.pem
```

Add .md files with your content. For example write "Hello, World!" in:

```bash
nano articles/index.md
```

Generate static pages and run server:

```bash
bun run dev
```

## Run in Docker

Build prod version locally as Bun 1.1.21 image builds JSX with errors:

```bash
bun run build
```

Than build the Docker container itself:
```bash
docker build --pull -t blog .
```

Finally, run the container:
```bash
docker run -d \                                     
  --name blog \
  -p 3000:3000 \
  -v ./certs/cert.pem:/usr/src/app/certs/cert.pem:ro \
  -v ./certs/key.pem:/usr/src/app/certs/key.pem:ro \
  -e PORT=3000 \
  blog
```
