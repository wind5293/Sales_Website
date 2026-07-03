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
- [x] `src/lib/auth.server.js` — `getCurrentUser()`, `getIsAdmin()`
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

### Nhóm A — Auth (làm tiếp theo Login)
- [ ] `Signup.jsx` → giống cấu trúc Login: Route Handler `src/app/api/auth/signup/route.js` + `src/app/signup/page.jsx` (Server, chỉ đặt title) + `src/app/signup/SignupForm.jsx` (Client, giữ nguyên UI)

### Nhóm B — Trang public, cần SSR để SEO
- [ ] `SearchPage.jsx` → `src/app/search/page.jsx`. Đọc query `?q=` và `?category=` qua `searchParams` (Next.js truyền sẵn vào Server Component, không cần `useSearchParams` như React Router)
- [ ] `ProductDetail.jsx` → `src/app/product/[id]/page.jsx`. Lấy `id` qua `params`. Đây là trang quan trọng nhất cho SEO (Google cần thấy tên/giá sản phẩm ngay trong HTML)
- [ ] `CategoryPage.jsx` → hiện tại chỉ redirect sang `/search?category=...`, xử lý bằng cách redirect ngay trong Server Component (`redirect()` từ `next/navigation`), không cần tạo component riêng

### Nhóm C — Trang cần đăng nhập (bảo vệ bằng middleware)
- [ ] Tạo `src/middleware.js` chặn `/profile/*`, `/orders/*`, `/checkout`, `/admin/*` nếu thiếu cookie
- [ ] `Profile.jsx` → `src/app/profile/page.jsx`
- [ ] `AddressBook.jsx` → `src/app/profile/addresses/page.jsx`
- [ ] `ChangePassword.jsx` → `src/app/profile/change-password/page.jsx`
- [ ] `Orders.jsx` → `src/app/orders/page.jsx`

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