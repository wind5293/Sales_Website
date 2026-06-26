import { useState, useEffect, useCallback } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt, fmtVND, fmtDate } from "../../../utils/admin/helpers";
import { Spinner } from "../../../components/admin/AdminUI"; 

export default function Analytics({ toast }) {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

    const [dateFrom, setDateFrom] = useState(monthAgo);
    const [dateTo, setDateTo] = useState(today);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        adminApi.get(`/api/admin/stats/sales?date_from=${dateFrom}&date_to=${dateTo}`)
            .then((r) => setData(r.data))
            .catch(() => toast("Không tải được báo cáo", "error"))
            .finally(() => setLoading(false));
    }, [dateFrom, dateTo]);

    useEffect(() => { load(); }, []);

    const maxRevenue = data?.daily_sales
        ? Math.max(...data.daily_sales.map((d) => d.revenue), 1)
        : 1;

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Báo cáo doanh thu</h2>

            {/* Filter */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1">Từ ngày</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1">Đến ngày</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
                <button
                    onClick={load}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
                >
                    <i className="fas fa-search mr-1.5"></i>Xem báo cáo
                </button>
            </div>

            {loading ? <Spinner /> : data && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium">Tổng doanh thu</p>
                            <p className="text-2xl font-bold text-amber-500 mt-1">{fmtVND(data.total_revenue)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium">Giá trị đơn trung bình</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{fmtVND(data.avg_order_value)}</p>
                        </div>
                    </div>

                    {/* Bar chart */}
                    {data.daily_sales?.length > 0 && (
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-700 mb-4">Doanh thu theo ngày</h3>
                            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                                {data.daily_sales.map((d, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: "28px" }}>
                                        <div
                                            className="w-5 bg-amber-400 hover:bg-amber-500 rounded-t transition-colors cursor-default"
                                            style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 128)}px` }}
                                            title={`${fmtVND(d.revenue)}`}
                                        ></div>
                                        <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                                            {new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {data.daily_sales?.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Ngày</th>
                                            <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Đơn hàng</th>
                                            <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.daily_sales.map((d, i) => (
                                            <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-600">{fmtDate(d.date)}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">{fmt(d.orders_count)}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmtVND(d.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}