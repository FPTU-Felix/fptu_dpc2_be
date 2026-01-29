# FPTU DPC2 - Backend Service

Hệ thống Backend quản lý Đảng viên và Chi bộ (Party Management System).

## 🛠 Tech Stack

- **Core Framework:** NestJS (Node.js)
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** Passport, JWT (Access/Refresh Token Strategy)
- **Architecture:** Modular, Repository Pattern

---

🗄 Database & Migrations
Hệ thống sử dụng TypeORM Migrations để quản lý Schema (Disable synchronize: true).
Run Migrations              => npm run migration:run
Revert Migration            => npm run migration:revert
Generate Migration          => npm run migration:generate src/migrations/<MigrationName>

🔐 Authentication Flow
Sử dụng cơ chế Dual Token để bảo mật:
Access Token (JWT):
TTL: 15 phút.
Bearer Auth Header cho các API bảo mật.
Refresh Token (JWT):
TTL: 7 ngày.
Được Hash và lưu trong Database (users.hashed_refresh_token).
Dùng để cấp lại Access Token mới khi hết hạn.

```

📡 API Response Standard:
Toàn bộ Response được chuẩn hóa qua GlobalInterceptor:
{
"statusCode": 200,
"message": "Thành công",
"data": {
// Payload data goes here
}
}

🚀 Running the App:

# Development

npm run start:dev

# Production Build

npm run build
npm run start:prod
```
