import { useNavigate } from "react-router-dom";
import { NAV } from "../../utils/admin/helpers";
import adminApi from "../../utils/admin/adminApi";

export default function AdminSidebar({ active, onNavigate }) {
    const navigate = useNavigate();

    const adminInfo = (() => {
        try { return JSON.parse(localStorage.getItem("admin_info") || "{}"); }
        catch { return {}; }
    })();

    const handleLogout = async () => {
        try {
            await adminApi.post("/api/admin/logout");
        } catch {
            
        } finally {
            localStorage.removeItem("admin_info");
            navigate("/login");
        }
    };

    return (
        <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">

            {/* Logo */}
            <div className="px-6 py-5 border-b border-gray-100">
                <span className="text-xl font-bold text-gray-900">
                    electro<span className="text-amber-500">.</span>
                </span>
                <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2.5 py-0 rounded-full">
                    <i className="fas fa-shield-alt text-[8px]"></i>
                    Admin Panel
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all
                            ${active === item.id
                                ? "bg-amber-400 text-gray-900 shadow-xs"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                    >
                        <i className={`${item.icon} w-4 text-center ${active === item.id ? "text-gray-900" : "text-gray-400"}`}></i>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Admin info + logout */}
            <div className="px-3 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <i className="fas fa-user-shield text-amber-600 text-xs"></i>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-gray-800 truncate">{adminInfo.email || "Admin"}</p>
                        <p className="text-[10px] text-amber-600 capitalize">{adminInfo.role || "admin"}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
                >
                    <i className="fas fa-sign-out-alt w-4 text-center"></i>
                    Đăng xuất
                </button>
                <button
                    onClick={() => navigate("/")}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors font-medium"
                >
                    <i className="fas fa-store w-4 text-center"></i>
                    Về trang khách hàng
                </button>
            </div>
        </aside>
    );
}