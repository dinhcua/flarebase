# Đóng Góp cho flarebase

Cảm ơn bạn đã quan tâm đến việc đóng góp cho flarebase! Dưới đây là hướng dẫn để giúp bạn bắt đầu.

## Quy trình đóng góp

1. Fork repository
2. Tạo branch từ `main` cho tính năng của bạn (`git checkout -b feature/amazing-feature`)
3. Commit các thay đổi (`git commit -m 'Add some amazing feature'`)
4. Push lên branch của bạn (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## Môi trường phát triển

1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/flarebase.git
   cd flarebase
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Cấu hình wrangler cho local development:
   ```bash
   cp wrangler.toml.example wrangler.toml
   # Chỉnh sửa wrangler.toml với các ID cần thiết
   ```

4. Chạy trong local development:
   ```bash
   npm run dev
   ```

## Cấu trúc dự án

- `/src` - Source code của backend
  - `/routes` - API routes
  - `/middleware` - Middleware
  - `/services` - Business logic
  - `/durable_objects` - Durable Objects implementations
  - `/types` - TypeScript types
- `/admin-ui` - Dashboard admin UI
- `/client-sdk` - Client SDK
- `/migrations` - Database migrations

## Coding standards

- Sử dụng TypeScript
- Tuân thủ ESLint và Prettier
- Viết unit tests cho các tính năng mới
- Đảm bảo code có type an toàn

## Pull Request

- Đảm bảo PR chỉ tập trung vào một tính năng hoặc sửa lỗi
- Cập nhật documentation nếu cần
- Thêm tests nếu có thể
- Liên kết đến issues liên quan

## Các loại đóng góp khác

- Báo cáo bugs
- Đề xuất tính năng mới
- Cải thiện documentation
- Viết tutorials hoặc blog posts

## License

Bằng cách đóng góp, bạn đồng ý rằng các đóng góp của bạn sẽ được cấp phép theo giấy phép MIT của dự án.