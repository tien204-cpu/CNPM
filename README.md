# Đồ án CNPM - Microservices E-commerce

Dự án demo kiến trúc microservices với các services: User, Product, Order, Payment và Frontend React.

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Chạy dự án](#chạy-dự-án)
- [Kiểm tra và test](#kiểm-tra-và-test)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Endpoints](#api-endpoints)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

## 🔧 Yêu cầu hệ thống

Trước khi bắt đầu, đảm bảo máy tính của bạn đã cài đặt:

- **Node.js** (phiên bản 16 trở lên) - [Tải tại đây](https://nodejs.org/)
- **Docker Desktop** - [Tải tại đây](https://www.docker.com/products/docker-desktop/)
- **Git** - [Tải tại đây](https://git-scm.com/)
- **npm** (đi kèm với Node.js)

### Kiểm tra cài đặt

Mở terminal/command prompt và chạy các lệnh sau để kiểm tra:

```bash
node --version   # Phải >= 16.x
npm --version    # Phải >= 7.x
docker --version # Phải có Docker Engine
docker compose version # Phải có Docker Compose
```

## 📦 Cài đặt

### Bước 1: Clone repository

```bash
git clone https://github.com/tien204-cpu/CNPM.git
cd CNPM
```

### Bước 2: Cài đặt dependencies (Tùy chọn)

Nếu muốn kiểm tra TypeScript trước khi chạy Docker:

```bash
npm install
```

**Lưu ý cho Windows PowerShell**: Nếu gặp lỗi `running scripts is disabled`, sử dụng:

```powershell
npm.cmd install
```

## 🚀 Chạy dự án

### Khởi động toàn bộ stack (Khuyến nghị)

```bash
npm run docker:up
```

Lệnh này sẽ:
- Build các Docker images cho tất cả services
- Khởi động PostgreSQL database
- Khởi động các microservices (user, product, order, payment)
- Khởi động frontend React
- Chạy ở chế độ detached (background)

### Kiểm tra services đang chạy

```bash
docker compose ps
```

Bạn sẽ thấy danh sách các container đang chạy:
- `user-service` - Port 3001
- `product-service` - Port 3002
- `order-service` - Port 3003
- `payment-service` - Port 3004
- `frontend` - Port 3000
- `postgres` - Port 5432

### Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **User API**: http://localhost:3001
- **Product API**: http://localhost:3002
- **Order API**: http://localhost:3003
- **Payment API**: http://localhost:3004

### Khởi tạo dữ liệu mẫu (Seed data)

Sau khi các services đã chạy, seed dữ liệu sản phẩm:

```bash
# Linux/Mac
curl -X POST http://localhost:3002/seed

# Windows PowerShell
Invoke-RestMethod -Method Post http://localhost:3002/seed
```

### Dừng dự án

```bash
npm run docker:down
```

### Reset toàn bộ database (Xóa dữ liệu)

```bash
docker compose down -v
npm run docker:up
```

**⚠️ Cảnh báo**: Lệnh này sẽ xóa toàn bộ dữ liệu trong database!

## ✅ Kiểm tra và test

### Chạy TypeScript type checking

Kiểm tra lỗi TypeScript trong tất cả services:

```bash
npm run check
```

### Chạy smoke test

Smoke test sẽ kiểm tra các luồng cơ bản:
- Đăng ký user
- Đăng nhập
- Lấy danh sách sản phẩm
- Tạo đơn hàng
- Thanh toán

```bash
npm run test:smoke
```

**Lưu ý**: Smoke test sử dụng email ngẫu nhiên để tránh lỗi `email exists` khi chạy nhiều lần.

## 📁 Cấu trúc dự án

```
CNPM/
├── services/
│   ├── user/           # Service quản lý người dùng
│   ├── product/        # Service quản lý sản phẩm
│   ├── order/          # Service quản lý đơn hàng
│   └── payment/        # Service xử lý thanh toán
├── frontend/           # Ứng dụng React
├── docker-compose.yml  # Cấu hình Docker Compose
├── package.json        # Scripts và dependencies
└── README.md          # File hướng dẫn này
```

### Công nghệ sử dụng

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Frontend**: React
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 🔌 API Endpoints

### User Service (Port 3001)

- `POST /api/users/register` - Đăng ký tài khoản
- `POST /api/users/login` - Đăng nhập
- `GET /api/users/profile` - Lấy thông tin user (cần auth)

### Product Service (Port 3002)

- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /seed` - Seed dữ liệu mẫu

### Order Service (Port 3003)

- `POST /api/orders` - Tạo đơn hàng mới
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `GET /api/orders/user/:userId` - Lấy đơn hàng của user

### Payment Service (Port 3004)

- `POST /api/payments` - Xử lý thanh toán
- `GET /api/payments/:orderId` - Lấy thông tin thanh toán

## 🐛 Xử lý lỗi thường gặp

### 1. Lỗi "Port already in use"

**Nguyên nhân**: Ports 3000-3004 hoặc 5432 đã được sử dụng.

**Giải pháp**:
```bash
# Dừng các containers cũ
docker compose down

# Kiểm tra processes đang dùng port
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### 2. Lỗi Prisma "Table does not exist"

**Nguyên nhân**: Database chưa được sync với schema.

**Giải pháp**:
```bash
# Áp dụng schema cho tất cả services
docker compose exec -T user npx prisma db push --accept-data-loss
docker compose exec -T product npx prisma db push --accept-data-loss
docker compose exec -T order npx prisma db push --accept-data-loss

# Restart services
docker compose restart
```

### 3. Frontend không hiển thị sản phẩm

**Nguyên nhân**: Chưa seed dữ liệu sản phẩm.

**Giải pháp**:
```bash
# Windows PowerShell
Invoke-RestMethod -Method Post http://localhost:3002/seed

# Linux/Mac
curl -X POST http://localhost:3002/seed
```

### 4. Lỗi "bcrypt" khi npm install

**Nguyên nhân**: Thiếu build tools cho native modules.

**Giải pháp**:
```bash
# Skip build scripts (chỉ cho typechecking)
npm install --ignore-scripts

# Hoặc cài đặt build tools
# Windows: npm install --global windows-build-tools
# Linux: sudo apt-get install build-essential
```

### 5. PowerShell execution policy error

**Nguyên nhân**: PowerShell không cho phép chạy scripts.

**Giải pháp**:
```powershell
# Sử dụng npm.cmd thay vì npm
npm.cmd run docker:up

# Hoặc chạy trực tiếp
node .\services\user\node_modules\typescript\lib\tsc.js -p services/user/tsconfig.json --noEmit
```

### 6. Docker không khởi động được

**Giải pháp**:
```bash
# Kiểm tra Docker đang chạy
docker info

# Khởi động lại Docker Desktop

# Xóa containers và volumes cũ
docker compose down -v
docker system prune -a
```

## 📝 Development

### Thay đổi Prisma Schema

Nếu bạn sửa file schema.prisma trong bất kỳ service nào:

```bash
# Vào thư mục service
cd services/user

# Generate Prisma client
npx prisma generate

# Push schema lên database
npx prisma db push

# Hoặc từ root với Docker
docker compose exec user npx prisma db push
```

### Xem logs

```bash
# Xem logs tất cả services
docker compose logs -f

# Xem logs của service cụ thể
docker compose logs -f user
docker compose logs -f product
```

### Rebuild services

```bash
# Rebuild tất cả
docker compose up --build

# Rebuild service cụ thể
docker compose up --build user
```

## 🎯 CI/CD

Dự án có sẵn GitHub Actions workflow (`.github/workflows/ci.yml`) để:
- Chạy TypeScript checks
- Chạy smoke tests
- Tự động build và test khi push code