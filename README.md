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

Tiếp theo tôi có thể:
- A: Fix các edge-case còn lại của smoke/e2e, hoàn thiện UI nếu cần.
- B: Viết CI (GitHub Actions) để tự động chạy build + tests.

Hướng dẫn này ngắn gọn — nếu muốn tôi cập nhật README chi tiết hơn (runbook, troubleshooting), nói tôi biết.

