import { useState, useEffect, useCallback } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt } from "../../../utils/admin/helpers";
import { Spinner, Pagination } from "../../../components/admin/AdminUI";

const ACTION_LABELS = {
    update_user: "Cập nhật người dùng",
    delete_user: "Xóa người dùng",
    create_product: "Tạo sản phẩm",
    update_product: "Cập nhật sản phẩm",
    delete_product: "Xóa sản phẩm",
    update_order: "Cập nhật đơn hàng",
    update_order_status: "Đổi trạng thái đơn hàng",
};

const TARGET_LABELS = {
    user: "Người dùng",
    product: "Sản phẩm",
    order: "Đơn hàng",
};

export default function AuditLogs({ toast }) {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [skip, setSkip] = useState(0);
    const [expanded, setExpanded] = useState(null);

    const [targetType, setTargetType] = useState("");
    const [action, setAction] = useState("");
    const [adminEmail, setAdminEmail] = useState("");

    const limit = 30;

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ skip, limit });
        if (targetType) params.set("targetType", targetType);
        if (action) params.set("action", action);
        if (adminEmail) params.set("adminEmail", adminEmail);

        adminApi.get(`/api/admin/audit-logs?${params.toString()}`)
            .then((r) => { setLogs(r.data.logs || []); setTotal(r.data.total || 0); })
            .catch(() => toast("Không tải được audit log", "error"))
            .finally(() => setLoading(false));
    }, [skip, targetType, action, adminEmail]);

    useEffect(() => { load(); }, [load]);

    const handleFilterChange = (setter) => (e) => {
        setSkip(0);
        setter(e.target.value);
    };

    const pages = Math.ceil(total / limit);
    const page = Math.floor(skip / limit);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">
                Nhật ký hoạt động admin <span className="text-sm text-gray-400 font-normal">({fmt(total)})</span>
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={targetType}
                    onChange={handleFilterChange(setTargetType)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                    <option value="">Tất cả đối tượng</option>
                    <option value="user">Người dùng</option>
                    <option value="product">Sản phẩm</option>
                    <option value="order">Đơn hàng</option>
                </select>

                <select
                    value={action}
                    onChange={handleFilterChange(setAction)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                    <option value="">Tất cả hành động</option>
                    {Object.entries(ACTION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Lọc theo email admin..."
                    value={adminEmail}
                    onChange={handleFilterChange(setAdminEmail)}
                    className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1 min-w-[200px]"
                />
            </div>

            {loading ? <Spinner /> : (
                <div className="bg-white border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Thời gian</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Admin</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Hành động</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Đối tượng</th>
                                    <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <>
                                        <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">{log.adminEmail || "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded">
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {TARGET_LABELS[log.targetType] || log.targetType}
                                                <span className="text-gray-400 text-xs ml-1">#{log.targetId?.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {log.details && Object.keys(log.details).length > 0 && (
                                                    <button
                                                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                        className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 hover:bg-amber-50 transition-colors"
                                                    >
                                                        {expanded === log.id ? "Ẩn" : "Xem"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expanded === log.id && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 bg-gray-50">
                                                    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                        {logs.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <i className="fas fa-clipboard-list text-3xl mb-2 block"></i>
                                Không có nhật ký nào
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Pagination
                page={page}
                pages={pages}
                onPrev={() => setSkip((s) => Math.max(0, s - limit))}
                onNext={() => setSkip((s) => s + limit)}
            />
        </div>
    );
}