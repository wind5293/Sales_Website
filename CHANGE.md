# Kế hoạch chuyển Next.js API routes từ "proxy FastAPI" sang "tự xử lý + gọi thẳng Firestore/Firebase Auth"

> Mục tiêu cuối: bỏ hẳn thư mục `backend/` (FastAPI) và đưa toàn bộ logic nghiệp vụ vào `frontend/src/app/api`.
>
> **Cập nhật (07/07/2026):** dự án hiện đang dùng thư mục thật là `frontend/` ở root workspace. Các route handler Next.js đã được tạo khá nhiều nhóm, nhóm Admin Auth vừa hoàn thành. Vẫn còn một lớp fallback qua `next.config.mjs` cho các nhóm admin CRUD còn lại cho tới khi tất cả endpoint được chuyển hoàn toàn.

---

## 0. Hiện trạng thực tế (đã kiểm tra mã nguồn)

- Workspace hiện có 2 thư mục chính: `frontend/` và `backend/`.
- Trong `frontend/src/app/api` hiện đã có nhiều route handler thực tế, có thể liệt kê là:
  - `auth/login`, `auth/logout`, `auth/signup`
  - `admin/login`, `admin/me`, `admin/logout` ✅ **mới hoàn thành**
  - `cart`, `cart/item/[id]`
  - `coupons/available`, `coupons/validate`
  - `orders`, `orders/[id]`, `orders/[id]/cancel`
  - `products`, `products/[id]`, `products/[id]/reviews`, `products/[id]/rating`, `products/new`, `products/search`, `products/filter`, `products/category/all`, `products/[id]/related`
  - `reviews/[id]/rating`
  - `users/me`, `users/addresses`, `users/addresses/[id]`, `users/change-password`, `users/points`, `users/points/redeem-points`, `users/points/point-history`
  - `wishlists/items`, `wishlists/items/[id]`
- Tổng số route handler hiện có: khoảng 32 file `route.js` (29 cũ + 3 admin auth mới).
- Vẫn còn một lớp fallback trong `frontend/next.config.mjs` để chuyển `/api/*` sang `BACKEND_URL`. Điều này có nghĩa là các endpoint admin CRUD/audit-log vẫn còn phụ thuộc vào FastAPI cho tới khi được port đầy đủ.
- Hạ tầng core đã dựng xong để hỗ trợ chuyển tiếp:
  - `frontend/src/lib/firebaseAdmin.js`
  - `frontend/src/lib/session.js` (đã export thêm `ADMIN_TOKEN_EXPIRE_HOURS`)
  - `frontend/src/lib/apiError.js`
  - `frontend/src/lib/reviewHelpers.js`
  - `frontend/src/lib/auth.server.js`
- Hai hệ auth vẫn tồn tại riêng biệt:
  - User auth: Firebase Auth REST + cookie `auth_token`
  - Admin auth: Firestore + bcrypt + JWT tự ký + cookie `admin_token` ✅ **đã port xong, native trên Next.js**

---

## 1. Tình trạng endpoint theo nhóm

| Nhóm | Endpoint | Trạng thái |
|---|---|---|
| Auth user | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout` | ✅ Có route handler Next.js |
| Admin auth | `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout` | ✅ **Có route handler Next.js — hoàn thành 07/07/2026** |
| Cart | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/item/{id}` | ✅ Có route handler Next.js (⚠️ xem mục 6 — cần fix N+1 query) |
| Orders | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/cancel` | ✅ Có route handler Next.js |
| Products | list, category, search, filter, new, related, detail | ✅ Có route handler Next.js |
| Reviews | `POST/GET /api/products/{id}/reviews`, `GET /api/products/{id]/rating`, `PATCH/DELETE /api/reviews/{id}` | ✅ Có route handler Next.js |
| Users | `GET/PATCH /api/users/me`, `POST /api/users/change-password`, `/api/users/addresses` CRUD | ✅ Có route handler Next.js |
| Points | `GET /api/users/points`, `POST /api/users/points/redeem-points`, `GET /api/users/points/point-history` | ✅ Có route handler Next.js |
| Wishlist | `GET/POST/DELETE /api/wishlists/items` | ✅ Có route handler Next.js |
| Coupons | `POST /api/coupons/validate`, `GET /api/coupons/available` | ✅ Có route handler Next.js |
| Admin CRUD + audit log | products/orders/users/audit-logs | ⏳ Còn pending — **đang làm tiếp (Nhóm 2: Admin CRUD Products)** |

> Kết luận ngắn: Admin auth đã port xong hoàn toàn, native trên Next.js (không còn gọi qua FastAPI). Công việc còn lại là Admin CRUD (products/orders/users) + audit log, và cleanup cuối cùng.

---

## 2. Hạ tầng nền tảng — đã dựng xong phần lõi

Trạng thái các file hạ tầng tính tới thời điểm hiện tại:

1. `frontend/src/lib/firebaseAdmin.js` ✅ đã có — dùng singleton và export `dbAdmin` / `authAdmin`.
2. `frontend/src/lib/session.js` ✅ đã có — xử lý auth user/admin, cookie, gọi Firebase Auth REST và JWT admin. Đã export `ADMIN_TOKEN_EXPIRE_HOURS` (= 2 giờ, xác nhận 07/07/2026 — khác với FastAPI gốc là 12 giờ, đây là thay đổi có chủ đích).
3. `frontend/src/lib/apiError.js` ✅ đã có — định dạng lỗi thống nhất `{ detail }`.
4. `frontend/src/lib/reviewHelpers.js` ✅ đã có — dùng chung cho tính điểm đánh giá.
5. `frontend/src/lib/auth.server.js` ✅ đã có — helper cho Server Component (`getCurrentUser`, `getIsAdmin`, `getAuthHeader`), đã cập nhật đọc field `name` mới trong `admin_info` cookie (fallback email).
6. `package.json` đã có các dependency cần thiết: `firebase-admin`, `bcryptjs`, `jsonwebtoken`.

Còn thiếu/đang chờ khi làm tới nhóm admin CRUD:
- copy logic nghiệp vụ từ `backend/app/core/` cho `config.py`, `constants.py`, `inventory.py`, `audit.py`
- hoàn thiện toàn bộ CRUD admin (products/orders/users) + audit log
- loại bỏ fallback rewrite sau khi mọi endpoint đã chạy trên Next.js

**Việc lặt vặt còn nợ (không chặn tiến độ, tự làm khi tiện):**
- Thêm field `name` (tên hiển thị) vào các document trong collection `admins` trên Firestore — hiện navbar admin sẽ fallback hiển thị email nếu field này chưa có.
- `AdminSidebar.jsx` đang đọc `localStorage.getItem("admin_info")` nhưng không thấy chỗ nào `setItem` giá trị này — có thể là bug có sẵn từ trước, cần rà lại khi động tới UI admin.

---

## 3. Trình tự triển khai hiện tại

1. ✅ Products + reviews/rating
2. ✅ Auth user + cart + orders + coupons + users + points + wishlist
3. ✅ Admin auth (login/me/logout) — **hoàn thành 07/07/2026**
4. ⏳ Admin CRUD (products → orders → users) + audit log — **đang làm (Nhóm 2 trở đi)**
5. ⏳ Gỡ `rewrites()` fallback khỏi `frontend/next.config.mjs`
6. ⏳ Xoá hoàn toàn `backend/` sau khi kiểm tra không còn phụ thuộc

---

## 4. Những điểm cần lưu ý

- Đăng nhập bằng mật khẩu không dùng `firebase-admin` để xác thực trực tiếp; vẫn cần gọi Identity Toolkit REST API từ route handler.
- Firestore composite index có thể cần thiết cho các query orders/phân trang phức tạp.
- Cookie `auth_token` / `admin_token` là `httpOnly`, nên chỉ đọc ở server-side.
- Cookie phụ `admin_info` (không httpOnly) **đang được dùng thật** ở `frontend/src/lib/auth.server.js` — không được xoá bỏ khi refactor sau này.
- Các route cần giữ đúng format response/lỗi cũ để frontend cũ không bị break.
- Sau khi chuyển xong, nên test cả trường hợp thành công và lỗi (401, 404, 400/422).

---

## 5. Ghi chú vận hành / môi trường dev (mới phát hiện 07/07/2026)

- Dự án đang dùng Next.js 16.2.10. **Turbopack (mặc định) gây chậm bất thường** khi kết hợp với `firebase-admin` trong dev mode trên máy này (request có lúc mất 30–90s, tăng dần theo phiên làm việc) — đây là vấn đề đã biết của Turbopack (memory/CPU tăng dần trong dev), không phải lỗi code migration.
- **Giải pháp:** đã đổi script dev sang dùng Webpack:
  ```json
  "dev": "next dev --webpack"
  ```
  Sau khi đổi, thời gian phản hồi ổn định (~1s cho các route thường). Giữ nguyên cấu hình này cho tới khi Turbopack ổn định hơn ở các bản Next.js sau. Không ảnh hưởng tới `next build`/production.

---

## 6. Việc cần làm — cải thiện hiệu năng (phát hiện khi debug, chưa sửa)

- [ ] `frontend/src/app/api/cart/route.js` (hàm `GET`) đang bị **N+1 query**: vòng lặp `for...of` gọi `await dbAdmin.collection('products').doc(...).get()` tuần tự cho từng item trong giỏ hàng. Cần sửa bằng `Promise.all()` hoặc `dbAdmin.getAll(...refs)` để gộp thành 1 round-trip. (Xem giải pháp đề xuất trong lịch sử trao đổi ngày 07/07/2026.)
- [ ] Rà lại các route khác có khả năng bị N+1 tương tự: `orders`, `wishlist`, `reviews` — chưa kiểm tra.

---

## 7. Công việc cuối cùng sau khi migration xong

- [ ] Xoá `rewrites()` fallback trong `frontend/next.config.mjs`
- [ ] Xoá toàn bộ thư mục `backend/`
- [ ] Gỡ biến môi trường `BACKEND_URL` không còn dùng
- [ ] Dọn dependency cũ không cần thiết
- [ ] Cập nhật lại `README.md` để phản ánh đúng kiến trúc Next.js hiện tại