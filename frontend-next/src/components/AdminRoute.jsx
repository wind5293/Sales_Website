import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
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
    const [status, setStatus] = useState("checking"); // checking | ok | fail

    useEffect(() => {
        let cancelled = false;

        axios.get("/api/admin/me", { withCredentials: true })
            .then(() => {
                if (!cancelled) setStatus("ok");
            })
            .catch(() => {
                if (!cancelled) {
                    localStorage.removeItem("admin_info");
                    setStatus("fail");
                }
            });

        return () => { cancelled = true; };
    }, []);

    if (status === "checking") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <i className="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
            </div>
        );
    }

    if (status === "fail") {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}