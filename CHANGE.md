# Kế hoạch chuyển Next.js API routes từ "proxy FastAPI" sang "tự xử lý + gọi thẳng Firestore/Firebase Auth"

> Mục tiêu cuối: bỏ hẳn `backend/` (FastAPI), toàn bộ logic nghiệp vụ nằm trong `frontend/src/app/api`.

---

## 0. Hiện trạng thực tế (đã soát mã nguồn)

- Thư mục frontend thật là `frontend/`, nhưng `package.json` vẫn ghi `"name": "frontend-next"` — dấu vết chưa dọn sạch từ lần đổi tên trước (xem `CHANGE.md`).
- **Không phải mọi `/api/*` đều có `route.js`.** Chỉ ~9 route có file proxy thật trong `src/app/api`:
  - `auth/login`, `auth/logout`
  - `cart`, `cart/item/[id]`
  - `coupons/available`, `coupons/validate`
  - `orders`, `orders/[id]`
  - `products/[id]/reviews`
  - `users/me`, `users/addresses`, `users/addresses/[id]`, `users/change-password`
- Toàn bộ phần còn lại (**admin** — auth/products/orders/users/audit-logs, `products` list/search/filter/new/related, `wishlist`, `points`, `rating`, `coupons/admin`, `reviews` PATCH/DELETE, `orders/{id}/cancel`) **không có route.js**, đang chạy nhờ `next.config.mjs` → `rewrites().fallback` bắn thẳng sang FastAPI.
- ⚠️ Hệ quả: khi bỏ FastAPI, rewrite fallback này sẽ chết theo → **toàn bộ endpoint đang "núp" phía sau nó sẽ 404** nếu không được port trước. Đây là phần dễ bị đánh giá thấp khối lượng công việc nhất.
- 2 hệ auth độc lập, đúng như mô tả ban đầu:
  - **User**: Firebase Auth REST API (`signInWithPassword`) → `idToken` → cookie `auth_token` (httpOnly)
  - **Admin**: Firestore collection `admins` + `bcrypt` + JWT tự ký (`create_access_token`, HS256, secret `ADMIN_JWT_SECRET`) → cookie `admin_token` (httpOnly)
- Frontend hiện có gói `firebase` (client SDK) trong `package.json` nhưng **không được import ở đâu cả** — dependency chết, không dùng được cho việc này. Cần **`firebase-admin`** (Node) — tương đương `firebase_admin` bên Python.

---

## 1. Kiểm kê đầy đủ endpoint cần port (từ backend FastAPI)

| Nhóm | Endpoint | Trạng thái route.js |
|---|---|---|
| Auth user | `POST /api/auth/login`, `POST /api/auth/signup` | login: có (đang gộp cả fallback admin) · signup: **chưa** |
| Auth admin | `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout` | **chưa** |
| Cart | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/item/{id}` | có |
| Orders | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/cancel` | có (thiếu `cancel`) |
| Products | list, `/category/all`, `/search`, `/filter`, `/new`, `/{id}/related`, `/{id}` | **chưa** |
| Reviews | `POST/GET /api/products/{id}/reviews`, `GET /api/products/{id}/rating`, `PATCH/DELETE /api/reviews/{id}` | 1 phần |
| Users | `GET/PATCH /api/users/me`, `POST /api/users/change-password`, `/api/users/addresses` (CRUD) | có |
| Coupons | `POST /validate`, `GET /available`, `POST/GET/PATCH/DELETE /admin` | 1 phần (thiếu CRUD admin) |
| Points | `GET /api/points`, `POST /api/redeem-points`, `GET /api/points-history` | **chưa** |
| Wishlist | `GET/POST/DELETE /api/wishlist/items` | **chưa** |
| Admin | products/orders/users CRUD + `/admin/audit-logs` | **chưa — toàn bộ** |

→ Tổng cộng khoảng **~40 endpoint**, không phải 9 như số route.js hiện có.

---

## 2. Hạ tầng nền tảng — PHẢI làm trước khi port từng route

Nếu bỏ qua bước này, sẽ phải viết lại logic auth/lỗi ở từng file → tốn công gấp đôi.

1. **`src/lib/firebaseAdmin.js`**
   - Khởi tạo `firebase-admin` **một lần duy nhất** (singleton — kiểm tra `getApps().length` trước khi `initializeApp` để tránh lỗi "already initialized" khi Next.js hot-reload).
   - Export `dbAdmin` (Firestore) và `authAdmin` (Firebase Auth).
   - Copy `firebase-key.json` sang phía Next, **chỉ import trong code chạy server** (route.js), tuyệt đối không để lọt vào client bundle.

2. **`src/lib/session.js`** (thay thế `getAuthHeader()` cũ)
   - `getVerifiedUser()`: đọc cookie `auth_token`, gọi `authAdmin.verifyIdToken()` trực tiếp — thay vì gắn Bearer rồi gọi sang FastAPI.
   - `getVerifiedAdmin()`: đọc cookie `admin_token`, `jwt.verify()` bằng cùng secret + thuật toán HS256 — port y hệt logic `verify_admin_token` trong `app/core/security.py`.
   - `requirePermission(permission)`: bản Node của `require_permission()` — kiểm tra `role === "superadmin"` hoặc `permissions.includes(permission)`.

3. **Helper chuẩn hoá lỗi** — luôn trả `{ detail: "..." }` với message tiếng Việt giống hệt bản cũ. Frontend hiện đang parse cứng theo field `detail`, đổi format sẽ vỡ UI hàng loạt.

4. **Cài npm packages tương đương:**
   - `firebase-admin` (thay `firebase_admin`)
   - `bcryptjs` hoặc `bcrypt` (thay `bcrypt` Python — dùng để hash/verify password admin)
   - `jsonwebtoken` (thay `python-jose` — sign/verify JWT admin)

5. **Copy các hằng số & logic nghiệp vụ nằm ở `core/`, không nằm trong route** — nhóm này dễ bị sót nhất:
   - `app/core/config.py`: `SHIPPING_PRICES`, `VOUCHERS` (tạm thời còn hard-code, sau này mới chuyển sang collection `vouchers`)
   - `app/core/constants.py`
   - `app/core/inventory.py`: logic trừ/hoàn kho khi đặt/hủy đơn
   - `app/core/audit.py`: logic ghi audit log cho hành động admin

6. **Xoá dần rewrite fallback trong `next.config.mjs` theo từng nhóm route đã port xong** — để endpoint còn thiếu lộ ra bằng lỗi 404 ngay, thay vì âm thầm rơi về FastAPI (che giấu sai sót).

---

## 3. Thứ tự port đề xuất (rủi ro thấp → cao)

1. **Products (đọc, không auth)** — an toàn nhất, dùng để làm quen pattern Firestore Admin SDK trong route.js.
2. **Reviews + rating** — đọc + ghi nhưng logic tương đối đơn giản.
3. **Cart, Wishlist, Points** — cần `getVerifiedUser()`, CRUD Firestore mức vừa.
4. **Coupons + Orders** — phức tạp nhất phía user: tính giá, áp voucher, trừ/hoàn kho (`inventory.py`), composite index Firestore.
5. **Auth (login / signup / logout)** — port sau vì `login/route.js` hiện đang gánh cả 2 luồng user + admin, cần tách rõ ràng.
6. **Admin (auth + toàn bộ CRUD + audit log)** — làm cuối cùng vì rủi ro bảo mật cao nhất, không còn FastAPI làm lớp chắn.
7. Gỡ `rewrites()` fallback trong `next.config.mjs`, xoá hẳn `backend/`.

---

## 4. Những điểm dễ vỡ trận — LƯU Ý riêng

- **Đăng nhập bằng mật khẩu KHÔNG dùng được `firebase-admin`.** Admin SDK không xác thực password. Vẫn phải `fetch` thẳng tới Identity Toolkit REST API (`identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=...`) từ route.js, y như FastAPI đang làm — chỉ là gọi trực tiếp, bỏ bước trung gian qua FastAPI.
- **Firestore composite index**: `orders.py` filter nhiều field (`status`, `userId`) + sort (`createdAt`) cùng lúc. Mỗi tổ hợp filter mới khi port sang Node SDK vẫn cần tạo index thủ công trên Firebase Console — lỗi sẽ là `FAILED_PRECONDITION` kèm link tạo index, cứ theo link mà tạo.
- **Cookie `admin_token` / `auth_token` là httpOnly** — middleware (`src/middleware.js`) đọc được vì chạy server-side, nhưng không được đọc từ client JS. Đừng nhầm lẫn khi debug.
- **Giữ nguyên format response/lỗi** (`{ detail }`, message tiếng Việt, status code) — vì các trang admin (`adminApi.js` axios interceptor bắt 401 → redirect `/login`) và các trang user đều đang parse cứng theo cấu trúc cũ.
- **`getAuthHeader()` cũ chỉ là fetch trần, không tự đọc cookie** — khi port, thay hoàn toàn bằng `getVerifiedUser()`/`getVerifiedAdmin()` mới, đừng giữ song song 2 kiểu gây nhầm lẫn.
- **Bug đã biết từ lần migrate trước** (ghi trong `CHANGE.md`): `OrdersClient` từng lệch key `"shipped"` vs `"shipping"` giữa `TABS` và `STATUS_CONFIG` — đã fix, nhưng cần double-check lại khi đụng vào `orders` để không tái diễn.
- Với mỗi route port xong: **test cả 2 trường hợp thành công và lỗi** (401 chưa đăng nhập, 404 không tồn tại, 400 validate sai) — vì hiện tại các trang FE đang phụ thuộc khá nhiều vào message lỗi cụ thể để hiển thị toast.

---

## 5. Việc cuối cùng sau khi port hết

- [ ] Xoá `rewrites()` fallback trong `next.config.mjs`
- [ ] Xoá thư mục `backend/` (FastAPI, `firebase-key.json` cũ, `requirements.txt`)
- [ ] Gỡ biến môi trường `BACKEND_URL` không còn dùng
- [ ] Dọn dependency chết: gói `firebase` (client SDK) nếu vẫn không được dùng ở đâu
- [ ] Cập nhật lại `README.md` (đang mô tả sai — vẫn ghi Vite/React Router thay vì Next.js đã dùng thực tế)