# Hướng dẫn Setup và Deploy flarebase

## Yêu cầu trước khi bắt đầu

- Tài khoản Cloudflare (miễn phí)
- Node.js v16 hoặc cao hơn
- Git

## 1. Cài đặt Wrangler CLI

```bash
npm install -g wrangler@latest
```

## 2. Đăng nhập Cloudflare

```bash
wrangler login
```

## 3. Tạo các dịch vụ Cloudflare

### Tạo D1 Database

```bash
wrangler d1 create flarebase
```

Lưu lại `database_id` từ kết quả.

### Tạo KV Namespace

```bash
wrangler kv:namespace create flarebase_KV
wrangler kv:namespace create flarebase_KV --preview
```

Lưu lại cả 2 ID (production và preview).

### Tạo R2 Bucket

```bash
wrangler r2 bucket create flarebase-files
```

## 4. Cập nhật wrangler.toml

Mở file `wrangler.toml` và cập nhật các ID đã tạo:

```toml
name = "flarebase"
compatibility_date = "2025-01-28"
main = "src/index.ts"
workers_dev = true

[vars]
JWT_SECRET = "your-super-secret-jwt-key-here"

[[d1_databases]]
binding = "DB"
database_name = "flarebase"
database_id = "YOUR_D1_DATABASE_ID_HERE"

[[kv_namespaces]]
binding = "flarebase_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID_HERE"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "flarebase-files"
preview_bucket_name = "flarebase-files-dev"

[[durable_objects.bindings]]
name = "flarebase_REALTIME"
class_name = "RealtimeSubscription"

[[durable_objects.bindings]]
name = "flarebase_PRESENCE"
class_name = "UserPresence"

[[migrations]]
tag = "v1"
new_classes = ["RealtimeSubscription", "UserPresence"]
```

## 5. Chạy Database Migrations

```bash
wrangler d1 migrations apply flarebase --local
wrangler d1 migrations apply flarebase --remote
```

## 6. Deploy

```bash
npm run deploy
```

## 7. Test API

Sau khi deploy thành công, test API:

```bash
# Lấy thông tin backend
curl https://your-worker-name.your-account.workers.dev/

# Đăng ký user mới
curl -X POST https://your-worker-name.your-account.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Đăng nhập
curl -X POST https://your-worker-name.your-account.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 8. Tạo Collection đầu tiên

```bash
# Tạo collection (cần JWT token từ bước login)
curl -X POST https://your-worker-name.your-account.workers.dev/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "posts",
    "schema": "{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"},\"content\":{\"type\":\"string\"},\"published\":{\"type\":\"boolean\"}}}"
  }'

# Tạo record
curl -X POST https://your-worker-name.your-account.workers.dev/api/collections/posts/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Hello World","content":"My first post","published":true}'

# Lấy danh sách records
curl https://your-worker-name.your-account.workers.dev/api/collections/posts/records \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 9. Test File Upload

```bash
# Upload file
curl -X POST https://your-worker-name.your-account.workers.dev/api/storage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg" \
  -F "isPublic=true"
```

## Cấu trúc API

### Authentication

- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất

### Collections

- `GET /api/collections` - Danh sách collections
- `POST /api/collections` - Tạo collection
- `GET /api/collections/:id` - Chi tiết collection
- `PUT /api/collections/:id` - Cập nhật collection
- `DELETE /api/collections/:id` - Xóa collection

### Records

- `GET /api/collections/:collection/records` - Danh sách records
- `POST /api/collections/:collection/records` - Tạo record
- `GET /api/collections/:collection/records/:id` - Chi tiết record
- `PUT /api/collections/:collection/records/:id` - Cập nhật record
- `DELETE /api/collections/:collection/records/:id` - Xóa record

### Storage

- `GET /api/storage` - Danh sách files
- `POST /api/storage` - Upload file
- `GET /api/storage/:id` - Thông tin file
- `GET /api/storage/:id/public` - Truy cập file public
- `DELETE /api/storage/:id` - Xóa file

### Realtime

- `GET /api/realtime` - WebSocket URL cho realtime

### Presence

- `GET /api/presence/connect` - WebSocket URL cho presence
- `GET /api/presence/users` - Danh sách users online
- `POST /api/presence/status` - Cập nhật trạng thái

### Backup

- `GET /api/backup/export` - Export dữ liệu
- `POST /api/backup/import` - Import dữ liệu

### Settings

- `GET /api/settings` - Cấu hình hệ thống
- `PUT /api/settings` - Cập nhật cấu hình
- `POST /api/settings/reset` - Reset cấu hình

## Troubleshooting

### Lỗi Database

```bash
# Kiểm tra database
wrangler d1 list

# Xem tables
wrangler d1 execute flarebase --command "SELECT name FROM sqlite_master WHERE type='table';"

# Reset database (cẩn thận!)
wrangler d1 execute flarebase --command "DROP TABLE IF EXISTS collections;"
wrangler d1 migrations apply flarebase --remote
```

### Lỗi KV

```bash
# Kiểm tra KV namespace
wrangler kv:namespace list

# Xem keys
wrangler kv:key list --namespace-id YOUR_KV_NAMESPACE_ID
```

### Lỗi R2

```bash
# Kiểm tra bucket
wrangler r2 bucket list

# Xem files
wrangler r2 object list flarebase-files
```

## Development

```bash
# Chạy local development
npm run dev

# Type checking
npm run type-check

# Test
npm test
```

## Performance Tips

1. **Caching**: API tự động cache GET requests trong 5 phút
2. **Rate Limiting**: Auth endpoints có giới hạn 10 requests/phút
3. **File Size**: Giới hạn upload 10MB mặc định
4. **Database**: Mỗi collection tối đa 10,000 records

## Security

1. Đổi `JWT_SECRET` trong production
2. Sử dụng HTTPS cho tất cả requests
3. Validate input từ client
4. Implement proper CORS policy

Chúc mừng! Bạn đã setup thành công flarebase trên Cloudflare! 🎉
