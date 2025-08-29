# FlareBase

<p align="center">
  <img src="https://your-site.com/path-to-logo.png" height="128" alt="flarebase Logo">
</p>

<p align="center">
  <a href="https://github.com/dinhcua/flarebase/releases"><img src="https://img.shields.io/github/v/release/dinhcua/flarebase" alt="Latest Release"></a>
  <a href="https://github.com/dinhcua/flarebase/blob/main/LICENSE"><img src="https://img.shields.io/github/license/dinhcua/flarebase" alt="License"></a>
  <a href="https://discord.gg/flarebase"><img src="https://img.shields.io/discord/1234567890?color=7289da&label=Discord&logo=discord" alt="Discord"></a>
</p>

**flarebase** là một backend-as-a-service (BaaS) mã nguồn mở được xây dựng trên nền tảng Cloudflare, mang đến trải nghiệm phát triển đơn giản và mạnh mẽ như Firebase hoặc Supabase, nhưng với chi phí tối ưu và khả năng scale toàn cầu nhờ Edge Network của Cloudflare.

## 📚 Tổng quan

flarebase cung cấp một giải pháp backend toàn diện cho các ứng dụng web và mobile, cho phép các nhà phát triển tập trung vào trải nghiệm người dùng thay vì xây dựng và duy trì backend phức tạp. Bằng cách tận dụng các dịch vụ của Cloudflare như Workers, D1, KV, Durable Objects và R2, flarebase mang đến một nền tảng mạnh mẽ, có khả năng mở rộng toàn cầu với hiệu suất cao.

## ✨ Tính năng chính

- **Quản lý collections & CRUD API**: Tạo, cấu hình và quản lý collections dữ liệu thông qua REST API tự động
- **Xác thực & Phân quyền**: Hệ thống xác thực dựa trên JWT với quản lý users và roles
- **Realtime Subscriptions**: Theo dõi thay đổi dữ liệu theo thời gian thực qua WebSockets
- **File Storage**: Quản lý và lưu trữ file với CloudFlare R2
- **User Presence**: Theo dõi trạng thái online/offline của người dùng
- **Analytics & Tracking**: Theo dõi và phân tích hành vi người dùng
- **Backup & Restore**: Sao lưu và khôi phục dữ liệu dễ dàng
- **Dashboard Admin**: Giao diện quản trị trực quan
- **Client SDK**: SDK cho JavaScript/TypeScript với TypeScript generics đầy đủ

## 🔌 Kiến trúc

flarebase được xây dựng hoàn toàn trên các dịch vụ serverless của Cloudflare:

- **Cloudflare Workers**: Xử lý API requests với độ trễ thấp
- **Cloudflare D1**: Cơ sở dữ liệu SQL phân tán trên edge
- **Cloudflare KV**: Cache, cấu hình và quản lý phiên
- **Cloudflare Durable Objects**: Quản lý state cho realtime và presence
- **Cloudflare R2**: Lưu trữ và phân phối files
- **Cloudflare Pages**: Triển khai dashboard admin

![Kiến trúc flarebase](https://your-site.com/path-to-architecture-diagram.png)

## 🚀 Bắt đầu

### Yêu cầu

- Tài khoản Cloudflare
- Node.js (v16 hoặc cao hơn)
- Wrangler CLI (`npm install -g wrangler`)

### Cài đặt

1. Clone repository:

   ```bash
   git clone https://github.com/dinhcua/flarebase.git
   cd flarebase
   ```

2. Cài đặt dependencies:

   ```bash
   npm install
   ```

3. Đăng nhập vào Cloudflare:

   ```bash
   wrangler login
   ```

4. Tạo các dịch vụ cần thiết:

   ```bash
   # Tạo D1 database
   wrangler d1 create flarebase

   # Tạo KV namespace
   wrangler kv namespace create flarebase_KV
   ```

Enbale cloudflare R2 bang UI Dashboard

# Tạo R2 bucket

wrangler r2 bucket create flarebase-files

````

5. Cập nhật wrangler.toml với các ID đã tạo ở bước 4

6. Cấu hình admin user trong wrangler.toml:
```toml
[vars]
JWT_SECRET = "your-secret-key-here"
ADMIN_EMAIL = "admin@yourdomain.com"
ADMIN_PASSWORD = "your-secure-password"
```

7. Deploy:
```bash
npm run deploy
```

8. Khởi tạo admin user (tùy chọn - tự động chạy khi deploy):
```bash
# Sử dụng script setup
FLAREBASE_URL=https://flarebase.kuquaysut.workers.dev node scripts/setup-admin.js

# Hoặc gọi API trực tiếp
curl -X POST https://flarebase.kuquaysut.workers.dev/api/auth/init-admin
````

## ⚙️ Cấu hình

### wrangler.toml

```toml
name = "flarebase"
compatibility_date = "2025-08-01"
main = "src/index.ts"
workers_dev = true

[vars]
JWT_SECRET = "change_this_in_production"

[[d1_databases]]
binding = "DB"
database_name = "flarebase"
database_id = "YOUR_D1_DATABASE_ID"

[[kv_namespaces]]
binding = "flarebase_KV"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"

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

## 📖 Sử dụng

### Cài đặt Client SDK

```bash
npm install flarebase
```

### Kết nối đến backend

```typescript
import flarebase from "flarebase";

// Khởi tạo client
const client = new flarebase(
  "https://your-flarebase-worker.your-account.workers.dev"
);

// Đăng nhập
const { user, token } = await client.auth.login("user@example.com", "password");

// Tạo instance mới với token
const authenticatedClient = new flarebase(
  "https://your-flarebase-worker.your-account.workers.dev",
  token
);
```

### Làm việc với Collections

```typescript
// Định nghĩa kiểu dữ liệu với TypeScript
interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// Lấy danh sách
const { items } = await client.collection<Post>("posts").getList({
  filter: "published=true",
  sort: "-created_at",
  page: 1,
  perPage: 10,
});

// Lấy một record
const post = await client.collection<Post>("posts").getOne("post_id");

// Tạo record mới
const newPost = await client.collection<Post>("posts").create({
  title: "Hello World",
  content: "This is my first post",
  published: false,
  author_id: user.id,
});

// Cập nhật record
await client.collection<Post>("posts").update("post_id", {
  published: true,
});

// Xóa record
await client.collection<Post>("posts").delete("post_id");
```

### Realtime Subscriptions

```typescript
// Subscribe để nhận updates theo thời gian thực
const subscription = client.realtime.subscribe<Post>("posts", (event) => {
  if (event.action === "create") {
    console.log("New post created:", event.record);
  } else if (event.action === "update") {
    console.log("Post updated:", event.record);
  } else if (event.action === "delete") {
    console.log("Post deleted, ID:", event.id);
  }
});

// Hủy subscription khi không cần thiết
subscription.unsubscribe();
```

### File Storage

```typescript
// Upload file
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const result = await client.storage.upload(file, {
    isPublic: true,
    folder: "images",
  });

  console.log("Uploaded file:", result);
  console.log("File URL:", result.url);
}

// Lấy danh sách files
const { items } = await client.storage.getList({
  prefix: "images/",
  perPage: 20,
});
```

### User Presence

```typescript
// Subscribe đến thay đổi trạng thái người dùng
const presenceSubscription = client.presence.subscribeToPresence((event) => {
  if (event.type === "statusChange") {
    console.log(`User ${event.user.id} is now ${event.user.status}`);
  }
});

// Cập nhật trạng thái
await client.presence.updateStatus("busy", {
  currentPage: "/dashboard",
});

// Lấy danh sách users online
const { users } = await client.presence.getOnlineUsers();
```

## 🛠️ API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Collections

- `GET /api/collections` - Lấy danh sách collections
- `POST /api/collections` - Tạo collection mới
- `GET /api/collections/:id` - Lấy thông tin collection
- `PUT /api/collections/:id` - Cập nhật collection
- `DELETE /api/collections/:id` - Xóa collection
- `GET /api/collections/:collection/records` - Lấy records
- `POST /api/collections/:collection/records` - Tạo record mới
- `GET /api/collections/:collection/records/:id` - Lấy record
- `PUT /api/collections/:collection/records/:id` - Cập nhật record
- `DELETE /api/collections/:collection/records/:id` - Xóa record

### Storage

- `GET /api/storage` - Lấy danh sách files
- `POST /api/storage` - Upload file
- `GET /api/storage/:id` - Lấy thông tin file
- `GET /api/storage/:id/public` - Truy cập file public
- `DELETE /api/storage/:id` - Xóa file

### Realtime

- `GET /api/realtime` - Lấy WebSocket URL cho realtime

### Presence

- `GET /api/presence/connect` - Lấy WebSocket URL cho presence
- `GET /api/presence/users` - Lấy danh sách users online
- `POST /api/presence/status` - Cập nhật trạng thái

### Backup

- `GET /api/backup/export` - Export dữ liệu
- `POST /api/backup/import` - Import dữ liệu

### Settings

- `GET /api/settings` - Lấy cấu hình hệ thống
- `PUT /api/settings` - Cập nhật cấu hình
- `POST /api/settings/reset` - Reset cấu hình về mặc định

## 🔭 Dashboard Admin

flarebase đi kèm với một dashboard admin trực quan để quản lý tất cả khía cạnh của backend:

1. **Collections**: Tạo và quản lý schemas
2. **Data Browser**: Xem và chỉnh sửa dữ liệu
3. **Users**: Quản lý người dùng và phân quyền
4. **File Manager**: Upload và quản lý files
5. **Analytics**: Phân tích traffic và hành vi người dùng
6. **Backup**: Sao lưu và khôi phục dữ liệu
7. **Settings**: Cấu hình hệ thống

Để triển khai dashboard:

```bash
cd admin-ui
npm install
npm run build
# Triển khai lên Cloudflare Pages hoặc hosting khác
```

## 📊 Chi phí và Scale

flarebase được thiết kế để tối ưu chi phí trên Cloudflare:

- **Workers**: 100,000 requests/ngày miễn phí, sau đó $0.50/triệu requests
- **D1**: 100,000 rows reads + 1,000 rows writes/ngày miễn phí
- **KV**: 100,000 reads + 1,000 writes/ngày miễn phí
- **Durable Objects**: 1 triệu requests/ngày miễn phí
- **R2**: 10GB storage + 10 triệu class A operations miễn phí

Với free tier của Cloudflare, bạn có thể chạy ứng dụng nhỏ hoàn toàn miễn phí và chỉ trả tiền khi scale lên.

## 🤝 Đóng góp

Chúng tôi luôn chào đón sự đóng góp! Hãy xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết thêm chi tiết.

## 📄 Giấy phép

flarebase được phát hành dưới giấy phép MIT. Xem tệp [LICENSE](LICENSE) để biết thêm chi tiết.

## 💼 Sử dụng trong sản phẩm

flarebase được thiết kế cho cả dự án cá nhân và doanh nghiệp. Nếu bạn đang sử dụng flarebase trong sản phẩm thương mại, hãy cân nhắc tài trợ để duy trì dự án.

## 🙏 Cảm ơn

- [Cloudflare](https://cloudflare.com) vì đã cung cấp nền tảng tuyệt vời
- [Hono](https://github.com/honojs/hono) cho framework HTTP hiệu quả
- [Tremor](https://www.tremor.so/) cho các components UI
- Tất cả các [contributors](https://github.com/dinhcua/flarebase/graphs/contributors) đã giúp xây dựng flarebase

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/dinhcua">dinhcua</a>
</p>
