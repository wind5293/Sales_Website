# Sales Website

Một dự án thương mại điện tử mini dành cho đồ điện tử, được xây dựng bằng React + Vite ở frontend, FastAPI + Firebase ở backend. Dự án tập trung vào trải nghiệm mua sắm cơ bản như danh mục sản phẩm, tìm kiếm, giỏ hàng, checkout, hồ sơ người dùng, đánh giá sản phẩm, mã giảm giá và quản trị viên.

## Tổng quan

Dự án này mô phỏng một cửa hàng bán thiết bị điện tử hiện đại với các tính năng cốt lõi của một storefront: hiển thị sản phẩm, bộ lọc tìm kiếm, chi tiết sản phẩm, giỏ hàng, đặt hàng, quản lý tài khoản và quản trị nội dung cơ bản.

> Lưu ý: chức năng thanh toán trực tuyến chưa được tích hợp vì đây là dự án cá nhân, nên các luồng thanh toán hiện tại chủ yếu dừng ở quy trình đặt hàng và lựa chọn phương thức vận chuyển/thu tiền.

## Tính năng hiện có

### Người dùng
- Đăng nhập / đăng ký bằng Firebase Authentication
- Hồ sơ cá nhân, địa chỉ giao hàng, đổi mật khẩu
- Xem danh sách sản phẩm và chi tiết sản phẩm
- Tìm kiếm sản phẩm và lọc nâng cao theo giá, đánh giá, tình trạng tồn kho
- Giỏ hàng và đặt hàng
- Theo dõi đơn hàng của chính mình
- Đánh giá sản phẩm sau khi đã mua
- Mã giảm giá và hệ thống tích điểm / rank

### Quản trị
- Dashboard admin cơ bản
- Quản lý sản phẩm, đơn hàng, người dùng, audit log
- Quản lý voucher / coupon

## Công nghệ sử dụng

### Frontend
- React 19
- Vite 8
- React Router DOM
- Axios
- Tailwind CSS

### Backend
- FastAPI
- Firebase Authentication
- Firestore
- Pydantic

## Cấu trúc thư mục

```text
backend/              # API FastAPI
  app/                 # Modules, routes, security, firebase helpers
frontend/             # UI React + Vite
  src/                 # Pages, components, context, features, utils
```

## Chạy dự án locally

### Backend


### Frontend
```bash
cd frontend
npm install
npm run dev
```

Sau khi chạy, truy cập:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

## Trạng thái hiện tại

- MVP commerce cơ bản đã hoàn thiện khá đầy đủ
- Các luồng chính của người dùng đã hoạt động
- Một số trải nghiệm cao cấp còn thiếu so với cửa hàng điện tử hiện đại như Apple

## Những điểm còn thiếu so với một storefront điện tử kiểu Apple

### Đã có
- Catalog sản phẩm
- Trang chi tiết sản phẩm
- Tìm kiếm và lọc
- Giỏ hàng và checkout cơ bản
- Hồ sơ người dùng
- Đánh giá sản phẩm
- Admin cơ bản

### Còn thiếu / đang phát triển
- Wishlist / favorites
- So sánh sản phẩm
- Gợi ý sản phẩm “có thể bạn thích”
- Theo dõi đơn hàng theo timeline chi tiết
- Hỗ trợ khách hàng / chat trực tuyến
- Tối ưu trải nghiệm mobile và accessibility
- SEO cho sản phẩm và danh mục
- Tăng cường cá nhân hóa homepage
- Tích hợp email thông báo và push notification

## Lộ trình đề xuất

1. Hoàn thiện trải nghiệm người dùng cao cấp
2. Cải thiện admin và analytics
3. Tăng cường personalization và recommendation
4. Chuẩn hóa UI/UX cho gần với phong cách Apple
5. Mở rộng cho deployment và production readiness

## Tài liệu liên quan

- [PROJECT.md](PROJECT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API.md](API.md)
- [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md)
