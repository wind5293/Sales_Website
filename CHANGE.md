# Hướng dẫn chuyển đổi Frontend (Sales Website) từ CSR sang SSR với Next.js

## 1. Bức tranh tổng thể

- **Trước:** `frontend/` — Vite + React + react-router-dom + axios, gọi backend FastAPI qua proxy `/api`.
- **Sau:** `frontend-next/` — Next.js (App Router), thay thế hoàn toàn `frontend/`.
- **Backend FastAPI:** không đổi gì trong giai đoạn này.
- **Admin:** vẫn nằm chung trong `frontend-next`, nhưng không cần SSR — chỉ "chuyển nhà" (copy code, sửa import), không cần viết lại cách fetch dữ liệu.

Nguyên tắc cốt lõi xuyên suốt cả dự án:

| Việc | Trước (localStorage / CSR) | Sau (cookie / SSR) |
|---|---|---|
| Lưu đăng nhập | `localStorage.setItem('auth_token', ...)` | cookie `httpOnly` set qua Route Handler |
| Đọc trạng thái đăng nhập | `useEffect` đọc `localStorage` | Server Component gọi `getCurrentUser()` |
| Lấy dữ liệu trang | `axios` trong `useEffect` sau khi trang hiện ra | `fetch` trong Server Component, trước khi trang hiện ra |
| Điều hướng | `useNavigate`, `<Link to>` (react-router-dom) | `useRouter`, `<Link href>` (next/navigation, next/link) |
| Bảo vệ route cần đăng nhập | check trong component, hiện spinner rồi redirect | `middleware.js` chặn từ server |

---

## 2. Đã hoàn thành ✅

- [x] Tạo project `frontend-next` (JS, Tailwind, App Router, có `src/`)
- [x] Cài `axios`, `firebase`
- [x] `next.config.mjs` — rewrites `/api/*` → backend (thay proxy Vite cũ)
- [x] `.env.local` — chứa `BACKEND_URL`
- [x] `src/lib/auth.server.js` — `getCurrentUser()`, `getIsAdmin()`, `getAuthHeader()` (thêm sau, dùng để gắn `Authorization: Bearer ...` khi Server Component / Route Handler cần gọi `apiServer()` hoặc `fetch()` tới endpoint yêu cầu đăng nhập)
- [x] `src/app/api/auth/login/route.js` — set cookie khi đăng nhập
- [x] `src/app/api/auth/logout/route.js` — xoá cookie khi đăng xuất
- [x] `src/components/CartContext.jsx` → thêm `'use client'`
- [x] `src/components/Footer.jsx` → đổi `Link` sang `next/link`
- [x] `src/components/Navbar.jsx` → `'use client'`, `useRouter`, nhận `isAdmin` qua props
- [x] `src/components/CartDrawner.jsx` → `'use client'`, `useRouter`
- [x] `src/app/layout.jsx` → gọi `getCurrentUser()`/`getIsAdmin()`, truyền xuống Navbar
- [x] `src/components/ProductCard.jsx` → `'use client'`
- [x] `src/app/page.jsx` (Homepage) → Server Component fetch dữ liệu
- [x] `src/components/ProductTabs.jsx` → Client Component chứa phần tab lọc

## 3. Việc còn lại — theo thứ tự nên làm

> **Trạng thái hiện tại:** Nhóm A, B, C đã xong. Tiếp theo là **Nhóm D (Checkout)** rồi tới **Nhóm E (Admin)**.

### Nhóm A — Auth (đã xong)
- [x] `Signup.jsx` → gộp 1 file `src/app/signup/page.jsx` (không cần Route Handler riêng vì không set cookie)

### Nhóm B — Trang public, cần SSR để SEO
- [x] `ProductDetail.jsx` → `src/app/product/[id]/page.jsx` + `ProductGallery.jsx` + `AddToCartButton.jsx` (Client) + `not-found.jsx`
- [x] Reviews (`ProductReviews`, `ReviewCard`, `WriteReviewModal`) → `'use client'` + Route Handler `src/app/api/products/[id]/reviews/route.js`
- [x] Cart (`CartContext`) → bỏ localStorage, dùng Route Handler `src/app/api/cart/route.js` + `src/app/api/cart/item/[id]/route.js`
- [x] Sửa `next.config.mjs` — rewrites dùng cấu trúc `{ beforeFiles, afterFiles, fallback }`, đặt trong `fallback` để không "cướp" route động
- [x] `SearchPage.jsx` → `src/app/search/page.jsx`. Đọc query `?q=` và `?category=` qua `searchParams` (Next.js truyền sẵn vào Server Component, không cần `useSearchParams` như React Router)
- [x] `CategoryPage.jsx` → hiện tại chỉ redirect sang `/search?category=...`, xử lý bằng cách redirect ngay trong Server Component (`redirect()` từ `next/navigation`), không cần tạo component riêng

### Nhóm C — Trang cần đăng nhập (bảo vệ bằng middleware) — ĐÃ XONG ✅
- [x] Tạo `src/middleware.js` chặn `/profile/*`, `/orders/*`, `/checkout`, `/admin/*` nếu thiếu cookie
- [x] `Profile.jsx` → `src/app/profile/page.jsx`
- [x] `AddressBook.jsx` → `src/app/profile/addresses/page.jsx` + `src/app/api/users/addresses/route.js` + `src/app/api/users/addresses/[id]/route.js`
- [x] `ChangePassword.jsx` → `src/app/profile/change-password/page.jsx` + `src/app/api/users/change-password/route.js`
- [x] `Orders.jsx` → `src/app/orders/page.jsx` (Server, fetch trang đầu) + `src/features/orders/OrdersClient.jsx` (Client, tab/phân trang) + `src/app/api/orders/route.js` + `src/app/api/orders/[id]/route.js`
  - Các file phụ trong `src/features/orders/`: `OrderCard.jsx`, `OrderComponents.jsx`, `OrderDetail.jsx`, `orderConstants.js`, `useOrders.js`
  - ⚠️ Đã sửa 1 bug có sẵn từ bản CSR: `TABS` dùng key `"shipped"` nhưng `STATUS_CONFIG` dùng key `"shipping"` → đã đồng bộ về `"shipping"`. Kiểm tra lại giá trị status thật mà backend trả về nếu tab "Đang giao" hiển thị sai.
  - Link "Chi tiết đầy đủ" trong `OrderDetail.jsx` trỏ tới `/orders/[id]` — **trang này chưa tồn tại**, cần làm nếu muốn xem chi tiết 1 đơn hàng riêng lẻ (chưa nằm trong checklist gốc, cân nhắc thêm vào Nhóm D hoặc làm riêng).

### Nhóm D — Phức tạp nhất, làm sau cùng
- [ ] `CheckoutPage.jsx` → `src/app/checkout/page.jsx` (nhiều state, form, có thể giữ phần lớn là Client Component, chỉ SSR phần lấy thông tin giỏ hàng ban đầu)

### Nhóm E — Admin (copy gần như nguyên, không cần SSR)
- [ ] `components/AdminRoute.jsx` → xoá, thay bằng middleware (đã gộp vào Nhóm C)
- [ ] `pages/admin/AdminDashboard.jsx` + `components/admin/AdminSidebar.jsx` → `src/app/admin/layout.jsx`
- [ ] `pages/admin/admin_pages/Overview.jsx` → `src/app/admin/page.jsx`
- [ ] `pages/admin/admin_pages/Products.jsx` → `src/app/admin/products/page.jsx`
- [ ] `pages/admin/admin_pages/Users.jsx` → `src/app/admin/users/page.jsx`
- [ ] `pages/admin/admin_pages/Orders.jsx` → `src/app/admin/orders/page.jsx`
- [ ] `pages/admin/admin_pages/Coupons.jsx` → `src/app/admin/coupons/page.jsx`
- [ ] `pages/admin/admin_pages/Analytics.jsx` → `src/app/admin/analytics/page.jsx`
- [ ] `pages/admin/admin_pages/AuditLogs.jsx` → `src/app/admin/audit-logs/page.jsx`
- Mỗi file trong nhóm này: chỉ thêm `'use client'` ở đầu, giữ nguyên phần còn lại

### Cuối cùng
- [ ] Xoá `frontend/` (Vite cũ)
- [ ] Đổi tên `frontend-next/` → `frontend/`
- [ ] Cập nhật script deploy/CI trỏ vào thư mục mới

---

## 3.5. Ghi chú / bài học từ Nhóm C (auth, orders, addresses)

- **Cấu trúc thư mục thật dùng `src/features/<domain>/`** (ví dụ `src/features/orders/`), không phải `src/components/<domain>/` — khi nhờ AI hoặc tự viết code mới, luôn chỉ rõ đường dẫn thật để tránh sai import `@/...`.
- **`apiServer()` (trong `src/lib/api.server.js`) chỉ là `fetch` trần, không tự đọc cookie/gắn token.** Với endpoint public (Homepage, ProductDetail) không sao vì backend không cần auth. Với endpoint cần đăng nhập (orders, addresses, change-password...) bắt buộc phải tự lấy header trước bằng `getAuthHeader()` rồi truyền vào qua `options.headers` — không được quên bước này.
- **Không có file `src/lib/apiProxy.js`** — dù có lúc nhắc tới, thực tế dự án chỉ dùng `getAuthHeader()` từ `auth.server.js`. Các Route Handler (`api/orders/route.js`, `api/users/addresses/route.js`...) tự đọc `res.text()` rồi `JSON.parse` (parse an toàn khi body rỗng, ví dụ response `204 No Content` của DELETE) thay vì gọi hàm dùng chung `safeJson`. Nếu sau này muốn dọn code sạch hơn, có thể cân nhắc tạo `apiProxy.js` thật để không lặp lại đoạn parse này ở từng route — nhưng hiện tại code đang chạy đúng theo cách viết trực tiếp từng file.
- **Lỗi 500 không phải lúc nào cũng do Next.js.** Khi Route Handler trả JSON.parse lỗi kiểu `"Internal S..."`, nhiều khả năng backend FastAPI đang tự crash — cần xem log `uvicorn`, không chỉ debug phía Next.js.
- **Firestore composite index:** endpoint `GET /api/orders` (backend, `orders.py`) filter theo nhiều field (`status`, `userId`) + sort (`createdAt`) cùng lúc, nên mỗi tổ hợp filter khác nhau (theo từng `status`, và cả trường hợp không filter status) cần 1 composite index riêng trong Firestore. Nếu sau này thêm tab/filter mới cho Orders (hoặc áp dụng pattern tương tự cho trang khác dùng Firestore), nhớ test từng tổ hợp filter một lần để trigger sớm các lỗi `FailedPrecondition: The query requires an index` và tạo index qua link Firebase Console mà log Python cung cấp.

## 4. "Cheat sheet" — quy tắc áp dụng cho MỌI file khi chuyển

Khi mở 1 file `.jsx` cũ bất kỳ để chuyển, kiểm tra lần lượt theo checklist này:

1. **File có dùng `useState`, `useEffect`, `useRef`, hoặc bất kỳ hook nào không?**
   → Có: thêm `'use client'` ở dòng đầu tiên.
   → Không (chỉ nhận props, render JSX thuần): để nguyên, có thể làm Server Component.

2. **File có `import { Link } from 'react-router-dom'`?**
   → Đổi thành `import Link from 'next/link'` (không có `{ }`)
   → Trong JSX: `<Link to="...">` → `<Link href="...">`

3. **File có `useNavigate()`?**
   → Đổi thành `import { useRouter } from 'next/navigation'` rồi `const router = useRouter();`
   → Mọi chỗ `navigate('/path')` → `router.push('/path')`

4. **File có `useParams()`?**
   → Trong Next.js, Server Component nhận `params` trực tiếp qua props của hàm trang: `export default function Page({ params }) { const { id } = params; }`
   → Nếu là Client Component thì dùng `import { useParams } from 'next/navigation'`

5. **File có đọc `localStorage.getItem('auth_token' / 'user_data' / ...)`?**
   → Đây là dấu hiệu cần dùng `getCurrentUser()` (nếu ở Server Component) hoặc nhận dữ liệu qua props (nếu ở Client Component) — không còn đọc `localStorage` trực tiếp nữa.

6. **File có `axios.get('/api/...')` trong `useEffect` để lấy dữ liệu hiển thị ban đầu của trang?**
   → Nếu là trang public (không cần đăng nhập): chuyển logic đó lên Server Component cha (`page.jsx`), dùng `apiServer()`, truyền dữ liệu xuống qua props.
   → Nếu là hành động do người dùng bấm (thêm giỏ hàng, submit form): giữ nguyên `fetch`/`axios` ở Client Component, không cần chuyển.

7. **File dùng `axiosAuth` (có gắn Bearer token)?**
   → Ở Server Component: dùng `apiServer()` (đã tự đọc cookie, xem file `src/lib/auth.server.js`)
   → Ở Client Component: gọi qua Route Handler nội bộ của Next.js (ví dụ `/api/cart`) — Route Handler đó tự đọc cookie rồi gắn `Authorization` khi gọi FastAPI, client không cần biết token.

---

## 5. Lỗi thường gặp — tra cứu nhanh

| Thông báo lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `You're importing a module that depends on useState/useRef... into a Server Component` | Quên thêm `'use client'` | Thêm `'use client'` ở dòng đầu file |
| `Module not found: Can't resolve 'react-router-dom'` | File còn `import ... from 'react-router-dom'` | Đổi theo mục 2, 3, 4 ở Cheat sheet |
| `ReferenceError: Link is not defined` | Xoá dòng import cũ nhưng quên thêm `import Link from 'next/link'` | Thêm đúng dòng import mới |
| `Unexpected token '<', "<!DOCTYPE"` khi gọi `/api/...` | Thiếu `rewrites` trong `next.config.mjs`, hoặc quên restart sau khi thêm | Kiểm tra `next.config.mjs`, restart `npm run dev` |
| `Unexpected token 'I', "Internal S"` khi gọi `/api/...` | Backend FastAPI chưa chạy, hoặc `.env.local` sai `BACKEND_URL` | Chạy `uvicorn main:app --reload` ở `backend/`, kiểm tra `http://127.0.0.1:8000/health` |
| Trang cần đăng nhập không tự chuyển hướng khi thiếu cookie | Chưa tạo/chưa cập nhật `matcher` trong `src/middleware.js` | Thêm path vào `config.matcher` |
| `Headers.append: "..." is an invalid header value` | Chuỗi trong dấu backtick bị xuống dòng thật giữa chừng (do copy/dán bị wrap) | Đảm bảo mỗi `headers.append(...)` nằm gọn 1 dòng, không Enter giữa chừng |
| 401 với response `{"detail":"Not authenticated"}` (không phải câu chữ tự viết) | Request bị `rewrites` "cướp" trước khi tới được `route.js` — do (a) rewrites dạng mảng đơn giản nằm trước route động `[id]` trong thứ tự xử lý, hoặc (b) tên thư mục trong `api/` viết sai/thiếu chữ so với path thật của backend | (a) Đổi `rewrites()` sang dạng `{ beforeFiles: [], afterFiles: [], fallback: [...] }`, đặt rewrites `/api/:path*` vào `fallback`. (b) Kiểm tra lại chính xác từng chữ trong tên thư mục `api/...` khớp với path backend (số ít/số nhiều, viết hoa/thường) |
| 401 với response đúng câu chữ tự viết (`"Token hết hạn..."`, `"Vui lòng đăng nhập"`) | `route.js` chạy đúng, nhưng cookie thiếu hoặc token Firebase đã hết hạn (idToken chỉ sống 1 giờ, không phụ thuộc Max-Age của cookie) | Đăng xuất/đăng nhập lại để lấy token mới; test lại ngay sau khi đăng nhập |
| Thêm giỏ hàng/viết đánh giá luôn báo "cần đăng nhập" dù đã đăng nhập | Component (CartContext...) vẫn tự đọc `localStorage.getItem('auth_token')` — giá trị luôn `null` vì token giờ là cookie `httpOnly` | Bỏ hẳn logic đọc `localStorage`, gọi thẳng `fetch('/api/...')` không kèm token — để trình duyệt tự gửi cookie, Route Handler phía server tự đọc và gắn `Authorization` |

---

## 6. Lệnh hay dùng trong quá trình migrate

```bash
# Chạy backend (terminal 1)
cd Sales_Website/backend
uvicorn main:app --reload

# Chạy frontend Next.js (terminal 2)
cd Sales_Website/frontend-next
npm run dev

# Sau khi sửa next.config.mjs hoặc .env.local — luôn restart:
# Ctrl+C rồi chạy lại npm run dev
```

---

## 7. Nguyên tắc chốt cần nhớ khi tự làm các trang còn lại

> Với mỗi trang: **tách phần "lấy dữ liệu ban đầu"** (đưa lên Server Component, file `page.jsx`) **ra khỏi phần "có tương tác"** (đưa xuống 1 Client Component riêng, nhận dữ liệu qua props). Đây là khuôn mẫu áp dụng được cho gần như mọi trang còn lại (`SearchPage`, `ProductDetail`, `Profile`, `Orders`...), giống hệt cách đã làm với `Homepage` → `ProductTabs`.