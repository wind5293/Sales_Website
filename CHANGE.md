# Kế hoạch chuyển Next.js API routes từ "proxy FastAPI" sang "tự xử lý + gọi thẳng Firestore/Firebase Auth"

> Mục tiêu cuối: bỏ hẳn thư mục `backend/` (FastAPI) và đưa toàn bộ logic nghiệp vụ vào `frontend/src/app/api`.
>
> **Cập nhật (07/07/2026):** dự án hiện đang dùng thư mục thật là `frontend/` ở root workspace. Các route handler Next.js đã được tạo khá nhiều nhóm, nhưng vẫn còn một lớp fallback qua `next.config.mjs` cho tới khi tất cả endpoint được chuyển hoàn toàn.

---

## 0. Hiện trạng thực tế (đã kiểm tra mã nguồn)

- Workspace hiện có 2 thư mục chính: `frontend/` và `backend/`.
- Trong `frontend/src/app/api` hiện đã có nhiều route handler thực tế, có thể liệt kê là:
  - `auth/login`, `auth/logout`, `auth/signup`
  - `cart`, `cart/item/[id]`
  - `coupons/available`, `coupons/validate`
  - `orders`, `orders/[id]`, `orders/[id]/cancel`
  - `products`, `products/[id]`, `products/[id]/reviews`, `products/[id]/rating`, `products/new`, `products/search`, `products/filter`, `products/category/all`, `products/[id]/related`
  - `reviews/[id]/rating`
  - `users/me`, `users/addresses`, `users/addresses/[id]`, `users/change-password`, `users/points`, `users/points/redeem-points`, `users/points/point-history`
  - `wishlists/items`, `wishlists/items/[id]`
- Tổng số route handler hiện có: khoảng 29 file `route.js`.
- Vẫn còn một lớp fallback trong `frontend/next.config.mjs` để chuyển `/api/*` sang `BACKEND_URL`. Điều này có nghĩa là một số endpoint vẫn còn phụ thuộc vào FastAPI cho tới khi được port đầy đủ.
- Hạ tầng core đã dựng xong để hỗ trợ chuyển tiếp:
  - `frontend/src/lib/firebaseAdmin.js`
  - `frontend/src/lib/session.js`
  - `frontend/src/lib/apiError.js`
  - `frontend/src/lib/reviewHelpers.js`
- Hai hệ auth vẫn tồn tại riêng biệt:
  - User auth: Firebase Auth REST + cookie `auth_token`
  - Admin auth: Firestore + bcrypt + JWT tự ký + cookie `admin_token`

---

## 1. Tình trạng endpoint theo nhóm

| Nhóm | Endpoint | Trạng thái |
|---|---|---|
| Auth user | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout` | ✅ Có route handler Next.js |
| Cart | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/item/{id}` | ✅ Có route handler Next.js |
| Orders | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/cancel` | ✅ Có route handler Next.js |
| Products | list, category, search, filter, new, related, detail | ✅ Có route handler Next.js |
| Reviews | `POST/GET /api/products/{id}/reviews`, `GET /api/products/{id]/rating`, `PATCH/DELETE /api/reviews/{id}` | ✅ Có route handler Next.js |
| Users | `GET/PATCH /api/users/me`, `POST /api/users/change-password`, `/api/users/addresses` CRUD | ✅ Có route handler Next.js |
| Points | `GET /api/users/points`, `POST /api/users/points/redeem-points`, `GET /api/users/points/point-history` | ✅ Có route handler Next.js |
| Wishlist | `GET/POST/DELETE /api/wishlists/items` | ✅ Có route handler Next.js |
| Coupons | `POST /api/coupons/validate`, `GET /api/coupons/available` | ✅ Có route handler Next.js |
| Admin CRUD + audit log | products/orders/users/audit-logs | ⏳ Còn pending |
| Admin auth | `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout` | ⏳ Còn pending |

> Kết luận ngắn: phần lớn các endpoint nghiệp vụ phía user đã được chuyển sang route handler Next.js. Công việc còn lại chủ yếu là admin và các việc cleanup cuối cùng.

---

## 2. Hạ tầng nền tảng — đã dựng xong phần lõi

Trạng thái các file hạ tầng tính tới thời điểm hiện tại:

1. `frontend/src/lib/firebaseAdmin.js` ✅ đã có — dùng singleton và export `dbAdmin` / `authAdmin`.
2. `frontend/src/lib/session.js` ✅ đã có — xử lý auth user/admin, cookie, gọi Firebase Auth REST và JWT admin.
3. `frontend/src/lib/apiError.js` ✅ đã có — định dạng lỗi thống nhất `{ detail }`.
4. `frontend/src/lib/reviewHelpers.js` ✅ đã có — dùng chung cho tính điểm đánh giá.
5. `package.json` đã có các dependency cần thiết: `firebase-admin`, `bcryptjs`, `jsonwebtoken`.

Còn thiếu/đang chờ khi làm tới nhóm admin:
- copy logic nghiệp vụ từ `backend/app/core/` cho `config.py`, `constants.py`, `inventory.py`, `audit.py`
- hoàn thiện admin auth và toàn bộ CRUD admin
- loại bỏ fallback rewrite sau khi mọi endpoint đã chạy trên Next.js

---

## 3. Trình tự triển khai hiện tại

1. ✅ Products + reviews/rating
2. ✅ Auth user + cart + orders + coupons + users + points + wishlist
3. ⏳ Admin auth + admin CRUD + audit log
4. ⏳ Gỡ `rewrites()` fallback khỏi `frontend/next.config.mjs`
5. ⏳ Xoá hoàn toàn `backend/` sau khi kiểm tra không còn phụ thuộc

---

## 4. Những điểm cần lưu ý

- Đăng nhập bằng mật khẩu không dùng `firebase-admin` để xác thực trực tiếp; vẫn cần gọi Identity Toolkit REST API từ route handler.
- Firestore composite index có thể cần thiết cho các query orders/phân trang phức tạp.
- Cookie `auth_token` / `admin_token` là `httpOnly`, nên chỉ đọc ở server-side.
- Các route cần giữ đúng format response/lỗi cũ để frontend cũ không bị break.
- Sau khi chuyển xong, nên test cả trường hợp thành công và lỗi (401, 404, 400/422).

---

## 5. Công việc cuối cùng sau khi migration xong

- [ ] Xoá `rewrites()` fallback trong `frontend/next.config.mjs`
- [ ] Xoá toàn bộ thư mục `backend/`
- [ ] Gỡ biến môi trường `BACKEND_URL` không còn dùng
- [ ] Dọn dependency cũ không cần thiết
- [ ] Cập nhật lại `README.md` để phản ánh đúng kiến trúc Next.js hiện tại