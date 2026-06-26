import { Navigate, useLocation } from "react-router-dom";

/**
 * AdminRoute — Protected route cho admin dashboard
 *
 * Cách dùng trong App.jsx / router:
 *
 *   import AdminRoute from "./components/AdminRoute";
 *
 *   <Route path="/admin/*" element={
 *     <AdminRoute>
 *       <AdminDashboard />
 *     </AdminRoute>
 *   } />
 *
 * Logic:
 *   - Kiểm tra localStorage có "admin_token" và "admin_info" không
 *   - Nếu không có → redirect về /admin/login
 *   - Nếu có → render children bình thường
 */
export default function AdminRoute({ children }) {
    const location = useLocation();

    const adminToken = localStorage.getItem("admin_token");
    const adminInfoRaw = localStorage.getItem("admin_info");

    // Parse an toàn
    let adminInfo = null;
    try {
        adminInfo = adminInfoRaw ? JSON.parse(adminInfoRaw) : null;
    } catch {
        adminInfo = null;
    }

    const isAuthenticated = Boolean(adminToken && adminInfo);

    if (!isAuthenticated) {
        // Lưu lại trang đang muốn vào, sau khi login sẽ redirect đúng chỗ
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}