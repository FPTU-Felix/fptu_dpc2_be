# FPTU DPC2 - Backend Service

Hệ thống Backend quản lý Đảng viên và Chi bộ (Party Management System).

## 🛠 Tech Stack

- **Core Framework:** NestJS (Node.js)
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** Passport, JWT (Access/Refresh Token Strategy)
- **Containerization:** Docker & Docker Compose
- **Architecture:** Modular, Repository Pattern

---

## ⚙️ Environment Variables

Tạo file `.env` tại thư mục gốc.
**Lưu ý:** Nếu chạy bằng Docker Compose, `DB_HOST` có thể cần đổi thành tên service (ví dụ: `postgres_db`) thay vì `localhost`.

```env
# App Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=fptu_dpc2_db

# JWT Configuration
# Access Token: 15 minutes
JWT_ACCESS_SECRET=your_access_token_secret
# Refresh Token: 7 days
JWT_REFRESH_SECRET=your_refresh_token_secret

🐳 Docker Setup
Dự án hỗ trợ chạy Database (hoặc cả ứng dụng) thông qua Docker để môi trường đồng nhất.

Cách 1: Chạy Database bằng Docker (Khuyên dùng cho Dev)
Chỉ chạy PostgreSQL trên Docker, còn NestJS chạy trực tiếp trên máy để debug.

Bash

# 1. Khởi động Database
docker-compose up -d postgres

# 2. Chạy ứng dụng (trên terminal khác)
npm run start:dev
Cách 2: Chạy Full Stack (App + DB)
Chạy cả Backend và Database trong container.

Bash

# Khởi động toàn bộ hệ thống
docker-compose up -d

# Xem logs
docker-compose logs -f

# Tắt hệ thống
docker-compose down

🗄 Database & MigrationsHệ thống sử dụng TypeORM Migrations để quản lý Schema (Disable synchronize: true).Commands
Action
Command
Run Migrations (Apply changes) =>     npm run migration:run
Revert Migration (Undo last change)=> npm run migration:revert
Generate Migration =>                 npm run migration:generate src/migrations/<Name>
Create Empty Migration=>              npm run migration:create src/migrations/<Name>

🔐 Authentication Flow
Sử dụng cơ chế Dual Token (Access + Refresh Token) để bảo mật.

1. Access Token (JWT)
TTL: 15 phút.

Format: Authorization: Bearer <token>

Dùng để gọi các API bảo mật.

2. Refresh Token (JWT)
TTL: 7 ngày.

Cơ chế: Được mã hóa (Hash) và lưu trong Database (users.hashed_refresh_token).

Tác dụng: Dùng để lấy Access Token mới khi cái cũ hết hạn mà không cần đăng nhập lại.

Auth Endpoints
POST /auth/signup: Đăng ký tài khoản.

POST /auth/signin: Đăng nhập (Trả về AT & RT).

POST /auth/refresh: Cấp lại Token (Gửi RT lên header).

POST /auth/logout: Đăng xuất (Xóa RT trong DB).

🚀 Installation & Running (Local)
Nếu không dùng Docker, bạn có thể chạy thủ công:

Bash

# 1. Install dependencies
npm install

# 2. Setup Database
# Đảm bảo PostgreSQL đang chạy và đã tạo DB 'fptu_dpc2_db'
npm run migration:run

# 3. Seed Data (Admin & Roles)
# Chạy script SQL trong file /db/seeds.sql (nếu có) hoặc qua DBeaver.

# 4. Start Server
npm run start:dev
```

//For Dev:
username: admin
pass: 123456