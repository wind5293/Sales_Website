import { useState, useEffect, useCallback } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt, fmtVND, fmtDate, STATUS_MAP } from "../../../utils/admin/helpers";
import { Spinner, Badge, Pagination } from "../../../components/admin/AdminUI";

export default function Orders({ toast }) {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [skip, setSkip] = useState(0);
    const [editModal, setEditModal] = useState(null);
    const [editData, setEditData] = useState({});
    const limit = 20;

    const load = useCallback(() => {
        setLoading(true);
        adminApi.get(`/api/admin/orders?status=${statusFilter}&skip=${skip}&limit=${limit}`)
            .then((r) => { setOrders(r.data.orders || []); setTotal(r.data.total || 0); })
            .catch(() => toast("Không tải được đơn hàng", "error"))
            .finally(() => setLoading(false));
    }, [statusFilter, skip]);

    useEffect(() => { setSkip(0); }, [statusFilter]);
    useEffect(() => { load(); }, [load]);

    const handleUpdate = async () => {
        try {
            await adminApi.patch(`/api/admin/orders/${editModal}`, editData);
            toast("Cập nhật đơn hàng thành công", "success");
            setEditModal(null);
            load();
        } catch {
            toast("Cập nhật thất bại", "error");
        }
    };

    const pages = Math.ceil(total / limit);
    const page = Math.floor(skip / limit);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-800">
                    Đơn hàng <span className="text-sm text-gray-400 font-normal">({fmt(total)})</span>
                </h2>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-gray-600"
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {loading ? <Spinner /> : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Mã đơn</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Khách hàng</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Ngày</th>
                                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Tổng tiền</th>
                                    <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold">Trạng thái</th>
                                    <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map((o) => (
                                    <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id?.slice(-8)}</td>
                                        <td className="px-4 py-3 text-gray-700">{o.user_email || o.user_id || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{fmtDate(o.created_at)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtVND(o.total_amount)}</td>
                                        <td className="px-4 py-3 text-center"><Badge status={o.status} /></td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    setEditModal(o.id);
                                                    setEditData({ status: o.status, tracking_number: o.tracking_number || "", admin_notes: o.admin_notes || "" });
                                                }}
                                                className="text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-50 transition-colors"
                                            >
                                                <i className="fas fa-edit mr-1"></i>Sửa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orders.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <i className="fas fa-inbox text-3xl mb-2 block"></i>
                                Không có đơn hàng
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

            {/* Edit Order Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-gray-800">Cập nhật đơn #{editModal.slice(-8)}</h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mã vận đơn</label>
                                <input
                                    value={editData.tracking_number}
                                    onChange={(e) => setEditData((d) => ({ ...d, tracking_number: e.target.value }))}
                                    placeholder="VD123456789VN"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú admin</label>
                                <textarea
                                    value={editData.admin_notes}
                                    onChange={(e) => setEditData((d) => ({ ...d, admin_notes: e.target.value }))}
                                    rows={3}
                                    placeholder="Ghi chú nội bộ..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setEditModal(null)}
                                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}