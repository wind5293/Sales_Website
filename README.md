# Sales Website

Một dự án thương mại điện tử mini dành cho đồ điện tử, xây dựng bằng **Next.js 16 (App Router)**. Toàn bộ backend (xác thực, giỏ hàng, đơn hàng, sản phẩm, đánh giá, coupon, quản trị...) được xử lý ngay trong **Next.js API Routes**, gọi thẳng tới **Firebase Authentication** và **Firestore**

> ⚠️ Dự án từng được thiết kế với backend FastAPI riêng (xem `CHANGE.md` để biết lịch sử migration), nhưng tại thời điểm này **thư mục `backend/` đã không còn tồn tại** — toàn bộ logic đã được chuyển hết sang `frontend/src/app/api`. README này mô tả đúng kiến trúc hiện tại.

## Tổng quan

Dự án mô phỏng một cửa hàng bán thiết bị điện tử với các tính năng cốt lõi của một storefront: hiển thị sản phẩm, tìm kiếm/lọc, giỏ hàng, đặt hàng, quản lý tài khoản, đánh giá sản phẩm và một khu quản trị (admin) cơ bản.

> **Lưu ý:** chức năng thanh toán trực tuyến (MoMo, VNPay...) **chưa được tích hợp thật sự** — đây là dự án cá nhân nên checkout hiện chỉ ghi nhận phương thức thanh toán đã chọn (COD / MoMo...) như một lựa chọn, chưa gọi cổng thanh toán hay xử lý webhook xác nhận.

## Tính năng hiện có

### Người dùng
- Đăng ký / đăng nhập / đăng xuất qua Firebase Authentication (cookie `auth_token`, `httpOnly`)
- Hồ sơ cá nhân, quản lý địa chỉ giao hàng, đổi mật khẩu
- Danh sách sản phẩm, chi tiết sản phẩm, sản phẩm liên quan
- Tìm kiếm và lọc nâng cao theo giá, đánh giá, tình trạng tồn kho, danh mục
- Giỏ hàng (thêm/sửa/xoá item)
- Đặt hàng: kiểm tra tồn kho, áp mã giảm giá, tính phí ship, trừ kho có rollback khi lỗi
- Theo dõi và huỷ đơn hàng của chính mình
- Đánh giá sản phẩm sau khi đã mua và nhận hàng (có gắn nhãn "verified purchase")
- Wishlist (danh sách yêu thích)
- Hệ thống tích điểm / rank, đổi điểm, xem lịch sử điểm
- Mã giảm giá (coupon): xem mã khả dụng, áp dụng khi checkout

### Quản trị (`/admin`)
- Dashboard tổng quan, trang phân tích (analytics)
- Quản lý sản phẩm, đơn hàng, người dùng (CRUD)
- Audit log (nhật ký thao tác admin)
- Đăng nhập admin dùng chung endpoint với user (`/api/auth/login` tự nhận diện tài khoản admin trong collection `admins`, ký JWT riêng, cookie `admin_token` + `admin_info`)

## Công nghệ sử dụng

### Frontend & ứng dụng
- Next.js 16 (App Router, React Server Components + Client Components)
- React 19
- Tailwind CSS 4
- Axios

### Dữ liệu & xác thực
- Firebase Authentication (đăng nhập user qua Identity Toolkit REST API)
- Firestore (toàn bộ dữ liệu: products, orders, carts, users, admins, coupons, reviews...)
- `firebase-admin` (server-side, dùng service account)
- JWT tự ký (`jsonwebtoken`) + `bcryptjs` cho tài khoản admin (không dùng Firebase Auth cho admin)

## Cấu trúc thư mục

```text
frontend/
  src/
    app/                # Route của Next.js (pages + API routes)
      admin/             # Các trang giao diện quản trị
      api/                # API routes — thay thế hoàn toàn cho backend cũ
        admin/             # CRUD sản phẩm/đơn hàng/người dùng, audit log
        auth/              # login / logout / signup (user lẫn admin)
        cart, orders,      # giỏ hàng, đơn hàng
        products, reviews, # sản phẩm, đánh giá
        coupons, wishlists,
        users/             # profile, địa chỉ, đổi mật khẩu, điểm thưởng
      product/[id]/, search/, checkout/, orders/, profile/, login/, signup/
    components/          # UI dùng chung (Navbar, ProductCard, admin UI...)
    context/             # React context (CartContext, AdminToastContext)
    features/            # Logic theo tính năng (checkout, orders, reviews, search)
    lib/                 # firebaseAdmin, session (JWT/cookie), helpers nghiệp vụ
    utils/                # axios instance, format, admin helpers
    middleware.js        # Bảo vệ route /profile, /orders, /checkout, /admin
```

## Chạy dự án locally

### 1. Cài đặt

```bash
cd frontend
npm install
```

### 2. Khai báo biến môi trường

Tạo file `frontend/.env.local` với các biến sau (project chưa có sẵn file `.env.example` trong repo — đây là danh sách biến bắt buộc, tổng hợp từ mã nguồn):

```bash
# Firebase Admin SDK (server-side, lấy từ Service Account JSON trên Firebase Console)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=        # giữ nguyên \n trong private key, code sẽ tự thay thành xuống dòng thật

# Firebase Web API Key (dùng để gọi Identity Toolkit REST API khi đăng nhập user)
FIREBASE_WEB_API_KEY=

# Secret dùng để ký JWT cho tài khoản admin — BẮT BUỘC đổi khi lên production
ADMIN_JWT_SECRET=
```

### 3. Chạy dev server

```bash
npm run dev
```

Mặc định script `dev` dùng `next dev --webpack` (đã chủ động tắt Turbopack — xem `CHANGE.md` mục 5 để biết lý do). Sau khi chạy, truy cập:

- Ứng dụng: http://localhost:3000
- Trang quản trị: http://localhost:3000/admin (yêu cầu tài khoản có trong collection `admins` trên Firestore, xác thực qua `/api/auth/login`)

Không còn Swagger UI / backend riêng — toàn bộ API nằm dưới `http://localhost:3000/api/*`.

## Danh sách API chính (`frontend/src/app/api`)

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/auth/login` (user + admin), `POST /api/auth/signup`, `POST /api/auth/logout` |
| Sản phẩm | `GET /api/products`, `GET /api/products/[id]`, `/search`, `/filter`, `/new`, `/category/all`, `/[id]/related`, `/[id]/rating` |
| Giỏ hàng | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/item/[id]` |
| Đơn hàng | `GET/POST /api/orders`, `GET /api/orders/[id]`, `PATCH /api/orders/[id]/cancel` |
| Đánh giá | `GET/POST /api/products/[id]/reviews`, `PATCH/DELETE /api/reviews/[id]/rating` |
| Người dùng | `GET/PATCH /api/users/me`, `POST /api/users/change-password`, CRUD `/api/users/addresses` |
| Điểm thưởng | `GET /api/users/points`, `POST /api/users/points/redeem-points`, `GET /api/users/points/point-history` |
| Wishlist | `GET/POST/DELETE /api/wishlists/items` |
| Coupon | `POST /api/coupons/validate`, `GET /api/coupons/available` |
| Admin | CRUD `/api/admin/products`, `/api/admin/orders`, `/api/admin/users`, `GET /api/admin/audit-logs` |

## Trạng thái hiện tại

- MVP commerce cơ bản đã hoàn thiện khá đầy đủ, các luồng chính của người dùng đã hoạt động.
- Migration từ FastAPI sang Next.js API Routes đã **hoàn tất** (không còn `backend/`, không còn phụ thuộc `BACKEND_URL`).
- Một số trải nghiệm cao cấp còn thiếu so với storefront hiện đại (xem phần dưới).
- Dự án hiện **chưa có test tự động, chưa có CI/CD, chưa có Dockerfile** — cần lưu ý nếu định đưa lên production.

## Những điểm còn thiếu

### Đã có
- Catalog sản phẩm, trang chi tiết, tìm kiếm & lọc
- Giỏ hàng và checkout cơ bản (chưa có cổng thanh toán thật)
- Hồ sơ người dùng, địa chỉ, đổi mật khẩu
- Đánh giá sản phẩm (yêu cầu đã mua)
- Wishlist, mã giảm giá, tích điểm/rank
- Admin: dashboard, CRUD sản phẩm/đơn hàng/người dùng, audit log

### Còn thiếu / đang phát triển
- Tích hợp cổng thanh toán trực tuyến thật (MoMo/VNPay/Stripe...)
- So sánh sản phẩm
- Gợi ý sản phẩm "có thể bạn thích" (personalization)
- Theo dõi đơn hàng theo timeline chi tiết
- Hỗ trợ khách hàng / chat trực tuyến
- SEO: chưa có `sitemap.xml`/`robots.txt`, chưa dùng `next/image` cho ảnh sản phẩm
- Tích hợp email thông báo / push notification
- File `.env.example`, test tự động, CI/CD, Docker

## Lộ trình đề xuất

1. Bổ sung `.env.example`, test cơ bản cho luồng checkout/orders (rủi ro cao nhất nếu lỗi)
2. Tích hợp cổng thanh toán thật
3. Tối ưu SEO (`next/image`, sitemap, robots.txt) và trải nghiệm mobile
4. Tăng cường personalization và recommendation
5. Thiết lập CI/CD và chuẩn hoá quy trình deploy

## Tài liệu liên quan

Các tài liệu sau được liệt kê trong lịch sử phát triển dự án (`PROJECT.md`, `ARCHITECTURE.md`, `API.md`, `ISSUES_AND_GAPS.md`) nhưng đang bị `.gitignore` chặn nên **không có trong repo** — nếu bạn có bản local, cân nhắc đưa vào repo hoặc xoá dòng ignore tương ứng trong `.gitignore` nếu muốn chia sẻ cùng team. Ngoài ra `CHANGE.md` ở gốc repo ghi lại lịch sử migration sang Next.js — một số mục trong đó đã lỗi thời so với code hiện tại nên chỉ nên dùng để tham khảo bối cảnh, không phải nguồn trạng thái chính xác.