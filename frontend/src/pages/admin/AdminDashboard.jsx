import { useState, useCallback } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { Toast } from "../../components/admin/AdminUI";
import Overview from "./admin_pages/Overview";
import Products from "./admin_pages/Products";
import Orders from "./admin_pages/Orders";
import Users from "./admin_pages/Users";
import Analytics from "./admin_pages/Analytics";
import Coupons from "./admin_pages/Coupons";
import AuditLogs from "./admin_pages/AuditLogs";

const SECTIONS = {
    overview: Overview,
    products: Products,
    orders: Orders,
    users: Users,
    coupons: Coupons,
    analytics: Analytics,
    audit_logs: AuditLogs,
};

export default function AdminDashboard() {
    const [active, setActive] = useState("overview");
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
    }, []);

    const ActivePage = SECTIONS[active];

    return (
        <div className="min-h-screen bg-gray-50 flex">

            <AdminSidebar active={active} onNavigate={setActive} />

            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <ActivePage toast={showToast} />
                </div>
            </main>

            {toast && (
                <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}