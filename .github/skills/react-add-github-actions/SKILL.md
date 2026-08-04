---
name: react-add-github-actions
description: (cog-toolkit, React) Use this skill whenever the user wants to set up a CI/CD pipeline using GitHub Actions, a GitHub Actions workflow, automated testing/builds/deploys, security auditing, dependency scanning, or a ".github/workflows" file for a React, Vite, Create React App, Next.js, or Remix frontend — even if they only say "automate my builds," "add CI," "deploy my React app on push," "scan for vulnerabilities," or "set up a pipeline."
---

# React CI/CD with GitHub Actions

Generate a production-ready GitHub Actions pipeline for a React project. The pipeline runs on pushes and pull requests, and follows a five-stage flow: **lint → test → security → build → deploy**. Security and deploy are each optional and independently gated.

## Workflow

1. **Inspect the project** if files are available. Read `package.json` to learn:
   - Which scripts exist (`lint`, `test`, `build`, `typecheck`, `format:check`). Only wire up stages whose scripts actually exist — don't invent a `lint` job if there's no lint script.
   - The toolchain: Vite (`vite` dependency / `dist` output), Create React App (`react-scripts` / `build` output), Next.js (`next` / `.next` + `out` output), or Remix (`@remix-run/dev` / `build` output). This determines the build output directory.
   - The Node version, if pinned via `engines` or `.nvmrc`. Default to Node 20 LTS otherwise.
2. **Detect the package manager** from the lockfile (see "Package manager detection" below). If no project files are available, generate npm by default but leave a clear comment showing how to switch.
3. **Decide which security checks to include** (see "Security scanning" below). Default: dependency audit + dependency review on PRs. Add CodeQL only if the user asks or the project is non-trivial.
4. **Pick the deploy target.** If the user named one, use it. If not, ask — or default to a build-artifact upload with the deploy job stubbed and commented, so nothing breaks.
5. **Emit the workflow** to `.github/workflows/ci.yml` (CI) and, if deploying, either a `deploy` job in the same file or a separate `.github/workflows/deploy.yml`. Prefer a single file with dependent jobs unless the user wants separate triggers.
6. **List required secrets** the user must add under repo Settings → Secrets and variables → Actions, and any branch/environment setup.

## Package manager detection

Detect from the lockfile present in the repo, in this priority order:

| Lockfile | Manager | Install command | Cache key (`actions/setup-node`) |
|---|---|---|---|
| `pnpm-lock.yaml` | pnpm | `pnpm install --frozen-lockfile` | `pnpm` |
| `yarn.lock` | yarn | `yarn install --frozen-lockfile` | `yarn` |
| `package-lock.json` | npm | `npm ci` | `npm` |

For pnpm, add `pnpm/action-setup@v4` **before** `setup-node`, and run scripts with `pnpm run <script>`. For yarn use `yarn <script>`; for npm use `npm run <script>`. `actions/setup-node@v4`'s built-in `cache` input handles dependency caching — set it to the manager name; no separate cache step is needed.

If you genuinely can't tell, default to npm and add a comment block at the top of the file listing the yarn/pnpm substitutions so the user can swap in one place.

## Security scanning

Include as a separate job that runs in parallel with lint/test — it should not block CI if it's expected to be slow (CodeQL), but the dependency audit must pass before build.

### Layers — choose what fits the project

| Layer | Tool | When to include |
|---|---|---|
| Dependency audit | `npm audit` / `yarn audit` / `pnpm audit` | Always |
| Dependency review | `actions/dependency-review-action` | PRs only; free for public repos |
| SAST | `github/codeql-action` | Non-trivial apps or when user asks |
| Secret scanning | GitHub native (repo setting) | Enable in repo settings, no YAML needed |

### Security job template

```yaml
  security:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write  # required for dependency-review and CodeQL uploads
    steps:
      - uses: actions/checkout@v4

      # --- pnpm only ---
      # - uses: pnpm/action-setup@v4
      #   with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm   # npm | yarn | pnpm

      - name: Install dependencies
        run: npm ci   # yarn install --frozen-lockfile | pnpm install --frozen-lockfile

      - name: Dependency audit
        run: npm audit --audit-level=high
        # yarn: yarn audit --level high
        # pnpm: pnpm audit --audit-level high

      # Runs on PRs only — catches newly introduced vulnerable deps
      - name: Dependency review
        if: github.event_name == 'pull_request'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high

      # --- Optional: CodeQL SAST (adds ~3-5 min) ---
      # - name: Initialize CodeQL
      #   uses: github/codeql-action/init@v3
      #   with:
      #     languages: javascript-typescript
      # - name: Perform CodeQL analysis
      #   uses: github/codeql-action/analyze@v3
```

### Failure handling

- `npm audit` exits non-zero for any vulnerability at or above `--audit-level`. Use `high` as the default threshold; `critical` is acceptable if the project has many transitive deps with known low-severity issues.
- If audit noise is a recurring problem, add `--omit=dev` to skip dev-only packages.
- Dependency review only runs on PRs; it compares the base and head manifests, so it will not catch pre-existing vulnerabilities — that's the audit's job.


## Approval Checkpoint *(mandatory)*

**STOP AND WAIT.** Confirm the configuration above with the user before generating workflows. Ask:
> "Does this configuration match your project requirements? Shall I proceed?"

## CI workflow template

Use this as the skeleton. The `security` job runs in parallel with `lint` and `test`; `build` waits for all three. Substitute install/run commands per the detected manager, drop stages whose scripts don't exist, and set `cache:` accordingly. Always quote the `on:` keys and pin actions to a major version.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Cancel superseded runs on the same ref to save minutes.
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint        # omit job if no lint script
      - run: npm run typecheck   # omit if not using TypeScript

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test -- --watch=false --passWithNoTests

  security:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - name: Dependency audit
        run: npm audit --audit-level=high
      - name: Dependency review
        if: github.event_name == 'pull_request'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high

  build:
    needs: [lint, test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist   # dist (Vite) | build (CRA / Remix) | out (Next export)
          if-no-files-found: error
          retention-days: 7
```

### Notes on the template
- **Jobs are split** so lint, test, and security run in parallel. Build only starts when all three pass. This surfaces failures fast and keeps CI time close to the slowest parallel job.
- **Test command varies by runner.** Vitest: `npm test -- --run`. Jest / CRA: `CI=true npm test`. Adjust to the project's runner; the goal is a single non-watch run that fails the job on test failure.
- **Build output directory** must match the toolchain: `dist` (Vite), `build` (CRA / Remix), `.next`/`out` (Next.js). Set both the `path:` here and the deploy job's source directory consistently.
- **pnpm users:** add `pnpm/action-setup@v4` before `setup-node` in every job that installs packages, and set `cache: pnpm`.
- **Matrix builds** (optional): to test multiple Node versions, add `strategy: { matrix: { node: [18, 20, 22] } }` and reference `${{ matrix.node }}`. Only add if the user asks — it multiplies minutes used.

## Deploy

Deploy is a separate job that `needs: build` (which already requires lint, test, and security to pass) and is gated so it only runs on the release branch, never on PRs:

```yaml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
```


If the target is something else (Firebase, Cloudflare Pages, custom SSH/rsync) suggest the user which secrets to add. Never hardcode credentials — every secret goes through `${{ secrets.NAME }}` and is listed for the user.

## Source map upload (optional)

This skill's build job does not upload source maps anywhere by default — `upload-artifact` just packages the build output. If the user wants readable stack traces from production errors (Sentry, Datadog, or similar), add a dedicated step after `build` and before `deploy`:

- **Why it's needed**: production bundles are minified, so raw error stack traces are useless without source maps. Uploading maps to an error-tracking service lets it symbolicate stack traces server-side, while the maps themselves stay off the publicly deployed build — never ship `.map` files to the CDN/host alongside the app.
- **Sentry pattern**: generate maps in the build (`productionBrowserSourceMaps: true` for Next.js, default-on for Vite/Remix), then upload with the `@sentry/vite-plugin` / `@sentry/webpack-plugin` at build time, or as a separate CI step via `sentry-cli sourcemaps inject` + `sentry-cli sourcemaps upload`, authenticated with a `SENTRY_AUTH_TOKEN` secret and scoped to `SENTRY_ORG`/`SENTRY_PROJECT`.
- **Datadog pattern**: run `datadog-ci sourcemaps upload <dist-dir>` after build, passing `--release-version` and `--service` flags that match the app's RUM/APM configuration, authenticated with a `DATADOG_API_KEY` secret.
- **Framework-specific output paths**: point the upload step at the same directory used in the build job's `upload-artifact` step — `dist` (Vite), `.next` (Next.js, plus its `.next/static` chunk maps), or `build` (Remix/CRA) — and keep the release/version identifier (git SHA or package version) consistent between the upload step and the app's error-tracking init so events map to the right maps.
- **CI placement and hygiene**: run source map upload as its own step (or job `needs: build`) gated the same way as `deploy` (main branch, push event only) so maps aren't uploaded for every PR; delete or exclude `.map` files from the deployed artifact after upload so they're never served publicly, and keep the auth token/API key secrets separate from deploy credentials.

## Output checklist

After writing the workflow, always give the user:
1. The file path(s) created.
2. The exact list of repository secrets/variables they must add (name + where to get the value), if any.
3. Any one-time repo setup (e.g., enabling Pages, setting the Pages source to "GitHub Actions", protecting `main`, enabling Dependabot for ongoing alerts).
4. A one-line note on what triggers CI vs. deploy, so the behavior isn't surprising.
5. The security audit level chosen and how to adjust it if too noisy.

Keep secret names UPPER_SNAKE_CASE and reference them only via `${{ secrets.X }}`.
