---
name: react-add-dockerfile
description: (cog-toolkit, React) Add optimized multi-stage Dockerfile and supporting Docker config files (.dockerignore, nginx.conf, optional docker-compose.yml) for React web applications. Use this skill whenever the user wants to containerize, Dockerize, or ship a React, Next.js, Remix, or Vite app in a Docker image — including any phrasing like "add Docker", "write a Dockerfile", "containerize my frontend", "make a small/secure Docker image", or "set up docker-compose for my web app". Trigger even when the framework isn't named, as long as the context is a JS/TS web app.
---

# Add Dockerfile for React web apps

## Task

Create a production-ready, multi-stage Dockerfile and supporting Docker configuration files for React web applications, following best practices for size, security, performance, and portability.

Before generating files, inspect the repository and derive the implementation from the existing project instead of applying template defaults blindly.

Required discovery steps:

Three things matter in production Docker images: **size** (multi-stage builds strip source and dev deps from the runtime layer), **security** (non-root user, no secrets baked in, minimal base image), and **build speed** (layer ordering so a source edit doesn't re-install all dependencies). The templates below encode all three.

The real decision is which _runtime_ the app needs. A static SPA should end up in an nginx image with no Node at all; an SSR app needs Node but only its production deps.

---

## Step 1 — Detect the project shape

Inspect the project root and fill in this table before writing any files:

| What to check | Where to look | What to record |
|---|---|---|
| Framework | `package.json` deps: `next` → Next.js; `@remix-run/*` → Remix; `vite` → Vite SPA; `react-scripts` → CRA | `framework` |
| Static vs SSR | Next.js only: does `next.config.*` contain `output: 'export'`? → static | `runtime`: **nginx** or **node** |
| Standalone? | Next.js SSR only: does `next.config.*` contain `output: 'standalone'`? | `standalone`: true/false |
| Package manager | Lockfile wins: `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lockb`→bun, `package-lock.json`→npm | `pm` |
| Node version | `.nvmrc` (strip `v`) or `package.json` `engines.node` (extract major); default **22** | `node_ver` |
| Build output dir | Vite→`dist`, CRA→`build`, Next export→`out`, Next SSR→`.next`, Remix→`build` | `build_dir` |
| Port | SPA (nginx): **8080**; Next.js/Remix: **3000** | `port` |

**Advisory — Next.js without standalone:** if `next` is detected but `output:'standalone'`
is missing, tell the user to add it to `next.config.*` before building the image. Without
it, the runtime stage needs the full `node_modules` (~700 MB–1 GB). With it, Next traces
only what the server needs and the final image is ~150 MB. Offer to add it automatically.

**STOP AND WAIT** - If any of these can't be determined from project files, **Ask the user before proceeding**.

---

## Step 2 — Pick the right template

| Framework | Template to use |
|---|---|
| `vite`, `cra`, Next export, unknown | **SPA (nginx)** |
| Next.js SSR | **Next.js standalone** |
| Remix, custom Node SSR | **Node SSR** |

---

## Step 3 — Package manager commands

Substitute the correct commands for `{{PM_INSTALL}}`, `{{PM_INSTALL_PROD}}`, and `{{PM_RUN_BUILD}}`:

| Manager | `{{LOCKFILE}}` | `{{PM_INSTALL}}` | `{{PM_INSTALL_PROD}}` | `{{PM_RUN_BUILD}}` | Extra setup needed |
|---|---|---|---|---|---|
| npm | `package-lock.json` | `npm ci` | `npm ci --omit=dev` | `npm run build` | — |
| yarn | `yarn.lock` | `yarn install --frozen-lockfile` | `yarn install --frozen-lockfile --production` | `yarn build` | — |
| pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile --prod` | `pnpm run build` | Add `RUN corepack enable` before install |
| bun | `bun.lockb` | `bun install --frozen-lockfile` | `bun install --frozen-lockfile --production` | `bun run build` | — |

Using frozen/locked installs is important: the build fails loudly if the lockfile drifts
rather than silently resolving different versions. Reproducible images depend on this.

---

## Template A — Static SPA (Vite / CRA / Next export → nginx)

```dockerfile
# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM node:{{NODE_VER}}-alpine AS build
WORKDIR /app

# [pnpm only] RUN corepack enable

# Copy manifests first so this layer caches between source edits.
COPY package.json {{LOCKFILE}} ./
RUN {{PM_INSTALL}}

COPY . .
RUN {{PM_RUN_BUILD}}

# ---- Stage 2: runtime ----
# No Node runtime in the final image — just nginx serving static files.
FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=build /app/{{BUILD_DIR}} /usr/share/nginx/html

# Run as the non-root nginx user. Port 8080 avoids the need for root
# to bind a privileged port.
RUN touch /var/run/nginx.pid \
 && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

---

## Template B — Next.js SSR (standalone output)

```dockerfile
# syntax=docker/dockerfile:1

# ---- Stage 1: install deps ----
FROM node:{{NODE_VER}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{PM_INSTALL}}

# ---- Stage 2: build ----
FROM node:{{NODE_VER}}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN {{PM_RUN_BUILD}}

# ---- Stage 3: runtime ----
FROM node:{{NODE_VER}}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# standalone bundles the server + minimal deps, but NOT static chunks or
# public/ — copy those explicitly or the app renders without CSS/JS.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static   ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public         ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

---

## Template C — Generic Node SSR (Remix, Express+React, custom server)

```dockerfile
# syntax=docker/dockerfile:1

# ---- Stage 1: build (full deps including dev) ----
FROM node:{{NODE_VER}}-alpine AS build
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{PM_INSTALL}}
COPY . .
RUN {{PM_RUN_BUILD}}

# ---- Stage 2: production deps only ----
# Separate install keeps dev deps out of the runtime image.
FROM node:{{NODE_VER}}-alpine AS prod-deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{PM_INSTALL_PROD}}

# ---- Stage 3: runtime ----
FROM node:{{NODE_VER}}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT={{PORT}}

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S appuser -G nodejs

COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build     --chown=appuser:nodejs /app/{{BUILD_DIR}} ./{{BUILD_DIR}}
COPY --from=build     --chown=appuser:nodejs /app/package.json  ./package.json
# Copy public/ if the app serves static files from it.
# COPY --from=build --chown=appuser:nodejs /app/public ./public

USER appuser
EXPOSE {{PORT}}

CMD ["node", "{{BUILD_DIR}}/server/index.js"]
# Remix alt:  CMD ["npx", "remix-serve", "./build/server/index.js"]
# Custom alt: CMD ["node", "dist/server.js"]
```

---

## nginx.conf (always write alongside Template A)

```nginx
server {
    listen      8080;
    server_name _;
    root        /usr/share/nginx/html;
    index       index.html;

    # SPA history fallback: unknown routes return index.html so
    # client-side routing works on hard refresh and deep links.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Fingerprinted assets are immutable — cache aggressively.
    location ~* \.(?:js|css|woff2?|png|jpe?g|gif|svg|webp|avif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # Never cache the HTML shell; stale HTML breaks asset references
    # after a deploy.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    server_tokens off;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
}
```

---

## .dockerignore (always write)

```
node_modules
**/node_modules
dist
build
out
.next
.cache
coverage
.git
.gitignore
.github
.env
.env.*
!.env.example
.vscode
.idea
.DS_Store
*.log
Dockerfile*
.dockerignore
docker-compose*.yml
**/*.test.*
**/*.spec.*
__tests__
README.md
```

---

## docker-compose.yml (optional — offer when user wants a quick local run)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    image: {{APP_NAME}}:latest
    ports:
      - "{{HOST_PORT}}:{{CONTAINER_PORT}}"
    restart: unless-stopped
    # environment:
    #   - NODE_ENV=production
    # env_file:
    #   - .env.production
```

For SPA images: `HOST_PORT:CONTAINER_PORT` = `80:8080`. For SSR: `80:3000` (or whatever port the app listens on).

---

## Common adjustments

**Build-time env vars** (`VITE_*`, `NEXT_PUBLIC_*`, etc.) are inlined at compile time, so
they belong in the _build_ stage, not the runtime stage:

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN {{PM_RUN_BUILD}}
```

Pass at build time: `docker build --build-arg VITE_API_URL=https://api.example.com .`

**Monorepos:** set the build context to the workspace root and adjust COPY paths to
include the root lockfile. The `--from=build` paths also need to reflect where the app
package's output actually lands.

**Port mismatches:** `EXPOSE`, the `HEALTHCHECK` URL, the server's own `listen`/`PORT`
env var, and any `docker-compose` or `-p` port mapping must all agree. Changing one means
changing all four.

**Verification:** if a Docker daemon is accessible, build and check size with
`docker build -t app . && docker images app`. If not (CI sandbox, no daemon), tell the
user the exact commands and note the image wasn't locally verified.

---

## Best practices

### Image size
- **Always use multi-stage builds.** The build stage needs compilers, dev dependencies,
  and source files; the runtime stage needs none of them. Multi-stage is the single
  biggest size lever — a typical React app goes from 1 GB+ to under 50 MB (SPA) or
  ~150 MB (Next.js standalone).
- **Use Alpine base images.** `node:22-alpine` and `nginx:1.27-alpine` are 5–10× smaller
  than their Debian counterparts. Only switch to a full image if a native dependency
  specifically requires it (rare for React apps).
- **Strip dev dependencies from the runtime stage.** For Node SSR apps, install production
  deps in a dedicated stage (`npm ci --omit=dev`) and copy only that `node_modules` into
  the final image. Never copy the full install from the build stage.
- **Copy only what the runtime needs.** For SPAs, that's the compiled `dist/` or `build/`
  directory. For Next.js standalone, it's `.next/standalone`, `.next/static`, and
  `public/`. For Remix, it's `build/` and `node_modules`. Don't `COPY . .` in the
  runtime stage.

### Build speed (layer caching)
- **Copy manifests before source.** Always `COPY package.json lockfile ./` and install
  before `COPY . .`. This way Docker reuses the cached install layer on every source
  edit and only re-runs the install when the lockfile actually changes — the most
  impactful caching pattern for JS apps.
- **Use frozen/locked installs.** `npm ci`, `--frozen-lockfile`, `--immutable`. The build
  fails loudly if the lockfile drifts rather than silently pulling different versions.
  Reproducible images and easier debugging depend on this.
- **Enable BuildKit.** The `# syntax=docker/dockerfile:1` directive unlocks cache mounts
  (`--mount=type=cache`) that persist the package manager's download cache across builds,
  further speeding up installs on repeated builds in CI.

### Security
- **Never run as root.** SPA images use the stock `nginx` user; SSR images create a
  dedicated low-privilege user (`addgroup` / `adduser`). This limits blast radius if the
  app or its dependencies are compromised.
- **Never bake in secrets.** `.dockerignore` must exclude `.env` and `.env.*`. Runtime
  secrets belong in environment variables or secret mounts at run time — never in an
  image layer, because layers are permanent and images are often shared.
- **Pin base image versions.** `nginx:1.27-alpine` rather than `nginx:latest` prevents
  a base image update from silently changing behaviour between builds. Update versions
  deliberately.
- **Keep `server_tokens off` in nginx.** Suppresses the nginx version from error pages
  and headers, reducing information available to attackers.
- **Send security headers.** The nginx config includes `X-Content-Type-Options` and
  `X-Frame-Options`. Add `Content-Security-Policy` for stricter apps.

### Correctness
- **SPA apps must have a history fallback in nginx.** `try_files $uri $uri/ /index.html`
  is what makes client-side routing work on hard refresh or direct URL access. Without
  it, any route other than `/` returns a 404.
- **Never cache the HTML shell.** `Cache-Control: no-cache` on `index.html` ensures users
  get fresh asset references after a deploy. Fingerprinted JS/CSS can be cached
  indefinitely (`immutable`); the HTML cannot.
- **Next.js standalone requires three COPY lines.** The standalone bundle contains the
  server and its traced deps, but deliberately excludes `.next/static` (compiled
  chunks) and `public/` (static assets). Missing either means a running server with
  no CSS, JS, or images.
- **Keep port declarations consistent.** `EXPOSE`, `HEALTHCHECK`, the server's own
  listen address, and the `docker-compose` port mapping must all agree. A mismatch
  produces a container that starts but never receives traffic.