'use client';
import { useState, useEffect, useCallback } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt } from "../../../utils/admin/helpers";
import { Spinner, Pagination } from "../../../components/admin/AdminUI";

export default function Users({ toast }) {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [skip, setSkip] = useState(0);
    const [editModal, setEditModal] = useState(null);
    const [editData, setEditData] = useState({});
    const limit = 20;

    const load = useCallback(() => {
        setLoading(true);
        adminApi.get(`/api/admin/users?skip=${skip}&limit=${limit}`)
            .then((r) => { setUsers(r.data.users || []); setTotal(r.data.total || 0); })
            .catch(() => toast("Không tải được người dùng", "error"))
            .finally(() => setLoading(false));
    }, [skip]);

    useEffect(() => { load(); }, [load]);

    const handleUpdate = async () => {
        try {
            await adminApi.patch(`/api/admin/users/${editModal}`, editData);
            toast("Cập nhật người dùng thành công", "success");
            setEditModal(null);
            load();
        } catch {
            toast("Cập nhật thất bại", "error");
        }
    };

    const handleDelete = async (userId, email) => {
        if (!confirm(`Xóa tài khoản "${email}"? Hành động này không thể hoàn tác.`)) return;
        try {
            await adminApi.delete(`/api/admin/users/${userId}`);
            toast("Đã xóa tài khoản", "success");
            load();
        } catch {
            toast("Xóa thất bại", "error");
        }
    };

    const pages = Math.ceil(total / limit);
    const page = Math.floor(skip / limit);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">
                Người dùng <span className="text-sm text-gray-400 font-normal">({fmt(total)})</span>
            </h2>

            {loading ? <Spinner /> : (
                <div className="bg-white border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Người dùng</th>
                                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Hạng</th>
                                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Điểm</th>
                                    <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold">Trạng thái</th>
                                    <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-800">{u.display_name || u.username || "—"}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 capitalize">{u.rank || "—"}</td>
                                        <td className="px-4 py-3 text-right font-medium text-amber-600">{fmt(u.points)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {u.is_banned
                                                ? <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600">Bị cấm</span>
                                                : <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-600">Hoạt động</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditModal(u.id);
                                                        setEditData({ is_banned: u.is_banned, rank: u.rank || "", points: u.points || 0 });
                                                    }}
                                                    className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 hover:bg-amber-50 transition-colors"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id, u.email)}
                                                    className="text-xs text-red-500 hover:text-red-600 px-2 py-1 hover:bg-red-50 transition-colors"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <i className="fas fa-users text-3xl mb-2 block"></i>
                                Không có người dùng
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

            {/* Edit User Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-gray-800">Cập nhật người dùng</h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Cấm tài khoản</span>
                                <button
                                    onClick={() => setEditData((d) => ({ ...d, is_banned: !d.is_banned }))}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${editData.is_banned ? "bg-red-500" : "bg-gray-200"}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${editData.is_banned ? "left-7" : "left-1"}`}></span>
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hạng thành viên</label>
                                <select
                                    value={editData.rank}
                                    onChange={(e) => setEditData((d) => ({ ...d, rank: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                    <option value="">Thường</option>
                                    <option value="silver">Silver</option>
                                    <option value="gold">Gold</option>
                                    <option value="platinum">Platinum</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm tích lũy</label>
                                <input
                                    type="number"
                                    value={editData.points}
                                    onChange={(e) => setEditData((d) => ({ ...d, points: parseInt(e.target.value) || 0 }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
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
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}