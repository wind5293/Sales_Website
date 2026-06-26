import { useState, useEffect } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt, fmtVND } from "../../../utils/admin/helpers";
import { Spinner } from "../../../components/admin/AdminUI";

export default function Overview({ toast }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.get("/api/admin/stats")
            .then((r) => setStats(r.data))
            .catch(() => toast("Không tải được thống kê", "error"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spinner />;
    if (!stats) return null;

    const cards = [
        { label: "Tổng người dùng", value: fmt(stats.total_users), icon: "fas fa-users", color: "bg-blue-500" },
        { label: "Tổng đơn hàng", value: fmt(stats.total_orders), icon: "fas fa-shopping-bag", color: "bg-purple-500" },
        { label: "Doanh thu", value: fmtVND(stats.total_revenue), icon: "fas fa-coins", color: "bg-amber-500" },
        { label: "Đơn hôm nay", value: fmt(stats.orders_today), icon: "fas fa-calendar-day", color: "bg-green-500" },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Tổng quan hệ thống</h2>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map((c) => (
                    <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`w-12 h-12 ${c.color} rounded-xl flex items-center justify-center shrink-0`}>
                            <i className={`${c.icon} text-white text-lg`}></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                            <p className="text-xl font-bold text-gray-800 mt-0.5">{c.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Doanh thu hôm nay */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-600 mb-1">Doanh thu hôm nay</p>
                <p className="text-3xl font-bold text-amber-500">{fmtVND(stats.revenue_today)}</p>
            </div>

            {/* Top products */}
            {stats.top_products?.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4">Sản phẩm bán chạy</h3>
                    <div className="space-y-3">
                        {stats.top_products.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-gray-700 font-medium">{p.name}</span>
                                </div>
                                <span className="text-gray-500">{fmt(p.sold)} đã bán</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}