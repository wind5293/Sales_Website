# Kế hoạch chuyển Next.js API routes từ "proxy FastAPI" sang "tự xử lý + gọi thẳng Firestore/Firebase Auth"

> Mục tiêu cuối: bỏ hẳn thư mục `backend/` (FastAPI) và đưa toàn bộ logic nghiệp vụ vào `frontend/src/app/api`.
>
> **Cập nhật (08/07/2026):** Toàn bộ Admin CRUD (Products/Orders/Users) + Audit log đã port xong. Nhóm Users (user-facing: me/change-password/addresses) — phát hiện vẫn đang ở dạng fallback proxy dù CHANGE.md bản trước ghi nhầm là ✅ — đã port xong hoàn toàn trong đợt này. **`rewrites()` đã gỡ khỏi `next.config.mjs`, `api.server.js` đã xoá, `BACKEND_URL` không còn được gọi ở bất kỳ đâu trong `frontend/`** (đã xác nhận bằng `findstr` quét toàn bộ `src/`). Còn lại: upload ảnh sản phẩm (Cloudinary, không chặn việc xoá `backend/`) và bước xoá `backend/` cuối cùng.

---

## 0. Hiện trạng thực tế (đã kiểm tra mã nguồn)

- Workspace hiện có 2 thư mục chính: `frontend/` và `backend/`.
- Route handler Next.js hiện có trong `frontend/src/app/api`:
  - `auth/login`, `auth/logout`, `auth/signup`
  - `admin/login`, `admin/me`, `admin/logout` ✅
  - `admin/products`, `admin/products/[id]` ✅ **mới**
  - `admin/orders`, `admin/orders/[id]` ✅ **mới**
  - `admin/users`, `admin/users/[id]` ✅ **mới**
  - `admin/audit-logs` ✅ **mới**
  - `cart`, `cart/item/[id]`
  - `coupons/available`, `coupons/validate`
  - `orders`, `orders/[id]`, `orders/[id]/cancel`
  - `products`, `products/[id]`, `products/[id]/reviews`, `products/[id]/rating`, `products/new`, `products/search`, `products/filter`, `products/category/all`, `products/[id]/related`
  - `reviews/[id]/rating`
  - `users/me`, `users/change-password`, `users/addresses`, `users/addresses/[id]` ✅ **port lại từ fallback proxy — mới**
  - `users/addresses/from-order` ⚠️ **mới tạo, nhưng chưa xác nhận có UI nào thực sự gọi tới — xem mục 6**
  - `users/points`, `users/points/redeem-points`, `users/points/point-history`
  - `wishlists/items`, `wishlists/items/[id]`
- Vẫn còn fallback trong `frontend/next.config.mjs` cho `/api/*` → `BACKEND_URL`, nhưng **về lý thuyết không còn route nào thực sự cần dùng tới nó nữa** — cần rà lại kỹ trước khi gỡ (xem mục 8).
- Hạ tầng core:
  - `frontend/src/lib/firebaseAdmin.js`
  - `frontend/src/lib/session.js` (có `ADMIN_TOKEN_EXPIRE_HOURS`, `requireAdmin`, `requirePermission`, `signInWithPassword`, `hashPassword`/`verifyPassword`, `createAccessToken`)
  - `frontend/src/lib/apiError.js`
  - `frontend/src/lib/reviewHelpers.js`
  - `frontend/src/lib/auth.server.js`
  - `frontend/src/lib/audit.js` ✅ **mới** — `logAdminAction()`, dùng chung cho mọi route admin CRUD
  - `frontend/src/lib/slugify.js` ✅ **mới** — port từ `slugify()` trong `schemas/__init__.py`, hỗ trợ tiếng Việt có dấu
  - `frontend/src/lib/orderHelpers.js` (đã có sẵn từ trước — `serializeOrder`, `restockOrderItems`, `applyVoucherWithFirestore`, `releaseVoucher`, `decrementStock`, `SHIPPING_PRICES`)
  - `frontend/src/lib/pointsHelpers.js` (đã có sẵn từ trước — `computeRank`, `logPointsTransaction`)
  - `frontend/src/lib/services/products.js` (đã có sẵn từ trước)
  - `frontend/src/lib/services/orders.js` ✅ **mới** — `listOrders()`, tách từ `orders/route.js` GET, dùng chung cho route + Server Component `orders/page.jsx`
  - `frontend/src/lib/services/users.js` ✅ **mới** — `listAddresses()`, tách từ `users/addresses/route.js` GET, dùng chung cho route + Server Component `checkout/page.jsx`
  - ~~`frontend/src/lib/api.server.js`~~ ❌ **đã xoá** — không còn nơi nào self-fetch qua HTTP nữa
- Hai hệ auth:
  - User auth: Firebase Auth REST + cookie `auth_token` ✅
  - Admin auth: Firestore + bcrypt + JWT tự ký + cookie `admin_token` ✅ — native trên Next.js, không còn phụ thuộc FastAPI

---

## 1. Tình trạng endpoint theo nhóm

| Nhóm | Endpoint | Trạng thái |
|---|---|---|
| Auth user | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout` | ✅ |
| Admin auth | `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout` | ✅ |
| Cart | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/item/{id}` | ✅ (⚠️ N+1 query ở GET — xem mục 7) |
| Orders (user) | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/cancel` | ✅ |
| Products | list, category, search, filter, new, related, detail | ✅ |
| Reviews | `POST/GET /api/products/{id}/reviews`, `GET /api/products/{id}/rating`, `PATCH/DELETE /api/reviews/{id}` | ✅ |
| Users (profile) | `GET/PATCH /api/users/me`, `POST /api/users/change-password`, `/api/users/addresses` CRUD | ✅ **port lại 08/07/2026** (trước đó vẫn là fallback proxy dù ghi nhầm ✅) |
| Users addresses phụ | `POST /api/users/addresses/from-order` | ⚠️ đã tạo file nhưng chưa xác nhận có dùng — xem mục 6 |
| Points | `GET /api/users/points`, `POST /api/users/points/redeem-points`, `GET /api/users/points/point-history` | ✅ |
| Wishlist | `GET/POST/DELETE /api/wishlists/items` | ✅ |
| Coupons | `POST /api/coupons/validate`, `GET /api/coupons/available` | ✅ |
| Admin — Products | `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/{id}` | ✅ **mới 08/07/2026** |
| Admin — Products upload ảnh | `POST /api/admin/products/upload-image`, `POST /api/admin/products/{id}/images` | ⏳ **pending** — cần xử lý multipart/form-data + Cloudinary SDK |
| Admin — Orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}` | ✅ **mới 08/07/2026** |
| Admin — Users | `GET /api/admin/users`, `PATCH/DELETE /api/admin/users/{id}` | ✅ **mới 08/07/2026** |
| Admin — Audit log | `GET /api/admin/audit-logs` | ✅ **mới 08/07/2026** |

> Kết luận ngắn: toàn bộ nghiệp vụ chính (user + admin CRUD) đã port xong. Việc còn lại: upload ảnh sản phẩm, xác minh route `from-order`, dọn fallback + xoá `backend/`.

---

## 2. Hạ tầng nền tảng

Đã dựng xong đầy đủ, xem danh sách file ở mục 0. Ghi chú thêm:

- `ADMIN_TOKEN_EXPIRE_HOURS = 2` (giờ) — **xác nhận là thay đổi có chủ đích**, khác bản FastAPI gốc (12 giờ).
- `VALID_RANKS = {"Silver", "Gold", "Diamond"}` (từ `app/core/constants.py`) — dùng để validate field `rank` ở cả `computeRank()` (tự động, khi tích điểm) và route admin `PATCH /api/admin/users/{id}` (admin set thủ công).
- Cookie phụ `admin_info` (không httpOnly) **đang được dùng thật** ở `frontend/src/lib/auth.server.js` — không được xoá khi refactor sau này. Đã bổ sung field `name` (tên hiển thị, fallback email) vào cookie này — cần bạn tự thêm field `name` vào document Firestore collection `admins` để hiển thị đúng, nếu chưa làm.
- `AdminSidebar.jsx` đọc `localStorage.getItem("admin_info")` nhưng không có chỗ nào `setItem` — nghi là bug có sẵn từ trước, cần rà lại khi động tới UI admin (chưa xử lý).

---

## 3. Trình tự triển khai hiện tại

1. ✅ Products + reviews/rating
2. ✅ Auth user + cart + orders + coupons + users (profile/addresses) + points + wishlist
3. ✅ Admin auth (login/me/logout)
4. ✅ Admin CRUD Products + Orders + Users + Audit log
5. ⏳ Upload ảnh sản phẩm (Cloudinary) — pending, không chặn bước 8
6. ⏳ Xác minh & xử lý route `users/addresses/from-order` — pending, không chặn bước 8
7. ✅ Gỡ `rewrites()` khỏi `frontend/next.config.mjs` + xoá `api.server.js` + tách `services/orders.js`, `services/users.js` để bỏ self-fetch — **hoàn thành 08/07/2026**
8. ⏳ Xoá hoàn toàn `backend/` — **sẵn sàng thực hiện**, đã xác nhận không còn phụ thuộc `BACKEND_URL` ở đâu trong `frontend/`

---

## 4. Những điểm cần lưu ý

- Đăng nhập bằng mật khẩu (cả user và đổi mật khẩu) không dùng `firebase-admin` để xác thực trực tiếp; phải gọi Identity Toolkit REST API. Áp dụng cho cả `auth/login` và `users/change-password`.
- Firestore composite index: `firestore.indexes.json` hiện có index cho `points_history`, `wishlists`, `coupons`, nhưng **chưa có index cho `orders`** — các query admin orders kết hợp `where` + `orderBy(createdAt)` nhiều khả năng sẽ yêu cầu tạo composite index khi chạy thật (Firestore tự trả link tạo index trong lỗi `FAILED_PRECONDITION`).
- Cookie `auth_token` / `admin_token` là `httpOnly`, chỉ đọc server-side.
- Các route giữ đúng format response/lỗi cũ để frontend cũ không bị break.
- **Timezone bug đã biết (kế thừa từ bản Python gốc, chưa sửa):** filter `date_to` ở `admin/orders` dùng `setHours(23,59,59,999)` theo giờ local server rồi `.toISOString()` (luôn ra UTC) — nếu server không chạy múi giờ UTC (vd. giờ VN, UTC+7), có thể lọc thiếu mất các đơn tạo trong ~7 tiếng cuối ngày. Giữ nguyên theo bản gốc, chưa sửa — cân nhắc fix nếu cần độ chính xác cao cho báo cáo doanh thu.
- **Thay đổi tối ưu hoá (không đổi hành vi, chỉ đổi cách tính):** route `GET /api/admin/users` dùng Firestore Count Aggregation Query (`collection.count().get()`) để đếm tổng số user, thay vì tải toàn bộ metadata document như bản Python (`query.select([]).stream()`). Kết quả `total` trả về giống hệt, chỉ nhanh/rẻ hơn.

---

## 5. Ghi chú vận hành / môi trường dev

- Next.js 16.2.10. **Turbopack (mặc định) gây chậm bất thường** với `firebase-admin` trong dev mode (request 30–90s, tăng dần theo phiên). Đã đổi sang Webpack:
  ```json
  "dev": "next dev --webpack"
  ```
  Giữ nguyên cấu hình này cho tới khi Turbopack ổn định hơn. Không ảnh hưởng `next build`/production.

---

## 6. Việc cần xác minh — route `users/addresses/from-order`

- File `POST /api/users/addresses/from-order` đã được tạo (port từ `save_address_from_order()` trong `users.py`), nhưng **chưa xác nhận có UI/component nào thực sự gọi tới endpoint này**.
- Trước đó route này (và cả fallback proxy của nó) **không tồn tại** trong `frontend/src/app/api` — nếu tính năng "tự động lưu địa chỉ khi đặt hàng" có dự định hoạt động, nó đã âm thầm lỗi (404) từ trước tới giờ mà không ai để ý.
- **Việc cần làm:** chạy `findstr /s /i "addresses/from-order" src\*.*` (hoặc `grep -r` nếu dùng Git Bash) trong `frontend/` để xác nhận có nơi nào gọi API này không.
  - Nếu có → giữ nguyên file, coi như đã fix được 1 bug ẩn.
  - Nếu không có → đây là dead code kế thừa từ backend, có thể xoá file `users/addresses/from-order/route.js` khỏi dự án cho gọn (không bắt buộc phải giữ mọi endpoint backend nếu không có gì dùng tới).

---

## 7. Việc cần làm — cải thiện hiệu năng (phát hiện khi debug, chưa sửa)

- [ ] `frontend/src/app/api/cart/route.js` (hàm `GET`) đang bị **N+1 query**: vòng lặp `for...of` gọi `await dbAdmin.collection('products').doc(...).get()` tuần tự cho từng item trong giỏ hàng. Cần sửa bằng `Promise.all()` hoặc `dbAdmin.getAll(...refs)`.
- [ ] Rà lại `wishlist`, `reviews` xem có N+1 tương tự không — chưa kiểm tra.
- [ ] Admin list (products/orders/users) khi không có filter phía "code" vẫn phải đọc toàn bộ collection 1 lần để đếm `total` (giữ nguyên hành vi bản Python gốc) — cân nhắc tối ưu bằng Count Aggregation Query giống cách đã áp dụng cho `admin/users` nếu dataset lớn dần.

---

## 8. Công việc cuối cùng sau khi migration xong

- [ ] Hoàn thiện `POST /api/admin/products/upload-image` và `POST /api/admin/products/{id}/images` (Cloudinary, multipart/form-data)
- [ ] Xác minh & xử lý `users/addresses/from-order` (mục 6)
- [x] Xoá `rewrites()` fallback trong `frontend/next.config.mjs` — **xong 08/07/2026**
- [x] Xoá `frontend/src/lib/api.server.js` — **xong 08/07/2026**
- [ ] Xoá toàn bộ thư mục `backend/` — **kế tiếp**
- [ ] Gỡ biến môi trường `BACKEND_URL` không còn dùng (file `.env.local`, `.env`, hosting config nếu deploy)
- [ ] Dọn dependency cũ không cần thiết (`frontend/src/lib/apiProxy.js` — kiểm tra còn route nào import không trước khi xoá)
- [ ] Cập nhật lại `README.md` để phản ánh đúng kiến trúc Next.js hiện tại

---

## 9. Yêu cầu tiếp theo (đã ghi nhận, làm sau)

- Người dùng muốn có 1 buổi tổng hợp để **hiểu toàn bộ luồng nghiệp vụ + kiến trúc code của dự án** (không chỉ riêng phần migration này). Việc này để sau, chưa làm ngay.