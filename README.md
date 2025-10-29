# FoodFast Delivery - Monorepo

Repo này chứa demo microservices (user, product, order, payment) + frontend React và Docker Compose để chạy toàn bộ stack.

Quick commands

Run per-service TypeScript checks and the smoke-test from the repo root:

Các lệnh thường dùng (từ thư mục gốc)

- Build & chạy stack (detached):

```powershell
npm run docker:up
```

PowerShell notes

- On Windows PowerShell the `npm` shim (`npm.ps1`) can trip execution policy. If you see `running scripts is disabled` errors, run commands via `npm.cmd` or call the tsc binary with `node`:

```powershell
npm.cmd run check
# or
node .\services\user\node_modules\typescript\lib\tsc.js -p services/user/tsconfig.json --noEmit
```

Ghi chú nhanh

- Smoke test hiện đã dùng email ngẫu nhiên để tránh lỗi `email exists` khi chạy lặp.
- Nếu cần reset database hoàn toàn: dừng compose và xoá volume `db-data` (chú ý mất dữ liệu):

```powershell
docker compose down -v
npm run docker:up
```

- A GitHub Actions workflow is provided at `.github/workflows/ci.yml` which runs the TypeScript checks and the smoke-test using Docker Compose on runners that support Docker.

Notes

- Prisma clients are generated for services that use Prisma; if you modify Prisma schemas, run `npx prisma generate` in the corresponding service.
- If you see native module build errors (e.g. bcrypt) when running `npm install`, you can install with `--ignore-scripts` locally for typechecking, or ensure your environment has the required build tools.

- Nếu bạn thay đổi Prisma schema, chạy `npm run db:push-all` để áp schema lên DB (containers đang chạy), hoặc chạy `npx prisma generate` trong service tương ứng.
If your Prisma schemas change, keep DB and clients in sync. Quick commands are below (PowerShell):

```powershell
# apply combined schema to running services (best-effort)
docker compose exec -T user npx prisma db push --accept-data-loss
docker compose exec -T product npx prisma db push --accept-data-loss
docker compose exec -T order npx prisma db push --accept-data-loss

# seed product data (product service provides /seed endpoint)
Invoke-RestMethod -Method Post http://localhost:3002/seed
```

Notes and troubleshooting
- If Playwright or the frontend can't find products, run the seed command above.
- If you see Prisma errors complaining about missing columns/tables, run the `db push` commands above for each service and then restart that service (docker compose restart <service>). This repo's CI will also attempt to run the same steps before tests.

Want me to do more?
- I can add a helper script (`npm run db:push-all`) and wire CI to ensure schema + seed run before tests. Tell me and I'll add it.

