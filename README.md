# FoodFast Delivery - Monorepo

This repository contains a small microservices demo (User, Product, Order, Payment) plus a React frontend and a Docker Compose orchestration. It is intended as a learning/demo project and includes a smoke-test harness.

Quick commands

Run per-service TypeScript checks and the smoke-test from the repo root:

```powershell
# run all TypeScript checks (invokes tsc in each service)
npm run check

# run the smoke test (must have docker-compose up running services in dev) or the script will wait for services
npm run smoke
```

PowerShell notes

- On Windows PowerShell the `npm` shim (`npm.ps1`) can trip execution policy. If you see `running scripts is disabled` errors, run commands via `npm.cmd` or call the tsc binary with `node`:

```powershell
npm.cmd run check
# or
node .\services\user\node_modules\typescript\lib\tsc.js -p services/user/tsconfig.json --noEmit
```

CI

- A GitHub Actions workflow is provided at `.github/workflows/ci.yml` which runs the TypeScript checks and the smoke-test using Docker Compose on runners that support Docker.

Notes

- Prisma clients are generated for services that use Prisma; if you modify Prisma schemas, run `npx prisma generate` in the corresponding service.
- If you see native module build errors (e.g. bcrypt) when running `npm install`, you can install with `--ignore-scripts` locally for typechecking, or ensure your environment has the required build tools.

