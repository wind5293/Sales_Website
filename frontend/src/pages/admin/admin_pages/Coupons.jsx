import { useState, useEffect, useCallback } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmtDate } from "../../../utils/admin/helpers";
import { Spinner } from "../../../components/admin/AdminUI";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtVND = (n) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + "đ";

const CouponBadge = ({ isActive, validUntil }) => {
    const expired =
        validUntil && new Date(validUntil) < new Date();
    if (expired)
        return (
            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
                Hết hạn
            </span>
        );
    if (!isActive)
        return (
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600">
                Vô hiệu
            </span>
        );
    return (
        <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
            Đang dùng
        </span>
    );
};

const EMPTY_FORM = {
    code: "",
    discountPercent: "",
    discountAmount: "",
    minOrder: "",
    maxUses: 100,
    validUntil: "",
};

// ── Modal tạo / sửa coupon ────────────────────────────────────────────────────

function CouponModal({ initial, onClose, onSave }) {
    const isEdit = !!initial;
    const [form, setForm] = useState(
        initial
            ? {
                code: initial.code,
                discountPercent: initial.discountPercent ?? "",
                discountAmount: initial.discountAmount ?? "",
                minOrder: initial.minOrder ?? "",
                maxUses: initial.maxUses ?? 100,
                validUntil: initial.validUntil
                    ? initial.validUntil.slice(0, 10)
                    : "",
            }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        setErr("");
        if (!form.code.trim()) return setErr("Vui lòng nhập mã giảm giá");
        if (!form.discountPercent && !form.discountAmount)
            return setErr("Phải có % giảm hoặc số tiền giảm");

        setSaving(true);
        try {
            const payload = {
                code: form.code.toUpperCase().trim(),
                discountPercent: form.discountPercent
                    ? Number(form.discountPercent)
                    : null,
                discountAmount: form.discountAmount
                    ? Number(form.discountAmount)
                    : null,
                minOrder: form.minOrder ? Number(form.minOrder) : 0,
                maxUses: Number(form.maxUses) || 100,
                validUntil: form.validUntil || null,
            };

            if (isEdit) {
                await adminApi.patch(
                    `/api/coupons/admin/${initial.code}`,
                    payload
                );
            } else {
                await adminApi.post("/api/coupons/admin", payload);
            }
            onSave();
        } catch (e) {
            setErr(
                e.response?.data?.detail ||
                "Có lỗi xảy ra, vui lòng thử lại"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white shadow-xs w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">
                        {isEdit ? "Chỉnh sửa mã" : "Tạo mã giảm giá"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Mã */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                            Mã giảm giá
                        </label>
                        <input
                            value={form.code}
                            onChange={(e) =>
                                set("code", e.target.value.toUpperCase())
                            }
                            disabled={isEdit}
                            placeholder="VD: APPLE10"
                            className="w-full border border-gray-200 rounded-xs px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-gray-50 disabled:text-gray-400 uppercase"
                        />
                    </div>

                    {/* Loại giảm giá */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                                Giảm % <span className="text-gray-300 normal-case">(hoặc)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={form.discountPercent}
                                    onChange={(e) => {
                                        set("discountPercent", e.target.value);
                                        if (e.target.value) set("discountAmount", "");
                                    }}
                                    placeholder="10"
                                    className="w-full border border-gray-200 rounded-sm px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                                Giảm tiền
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.discountAmount}
                                onChange={(e) => {
                                    set("discountAmount", e.target.value);
                                    if (e.target.value) set("discountPercent", "");
                                }}
                                placeholder="500000"
                                className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </div>
                    </div>

                    {/* Điều kiện */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                                Đơn tối thiểu
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.minOrder}
                                onChange={(e) => set("minOrder", e.target.value)}
                                placeholder="0"
                                className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                                Số lượt dùng
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={form.maxUses}
                                onChange={(e) => set("maxUses", e.target.value)}
                                placeholder="100"
                                className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </div>
                    </div>

                    {/* Hạn dùng */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
                            Hạn sử dụng{" "}
                            <span className="text-gray-300 normal-case font-normal">
                                để trống = không giới hạn 
                            </span >
                        </label>
                        <input
                            type="date"
                            value={form.validUntil}
                            onChange={(e) => set("validUntil", e.target.value)}
                            className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                    </div>

                    {err && (
                        <p className="text-xs text-red-500 flex items-center gap-1.5">
                            <i className="fas fa-exclamation-circle"></i> {err}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-sm transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-sm text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && (
                            <div className="w-3.5 h-3.5 border-2 border-gray-700 border-t-transparent rounded-sm animate-spin"></div>
                        )}
                        {isEdit ? "Lưu thay đổi" : "Tạo mã"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminCoupons({ toast }) {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeOnly, setActiveOnly] = useState(false);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(null); // null | "create" | coupon object
    const [confirm, setConfirm] = useState(null); // null | coupon object

    const load = useCallback(() => {
        setLoading(true);
        adminApi
            .get(`/api/coupons/admin?limit=200&active_only=${activeOnly}`)
            .then((r) => setCoupons(r.data.coupons ?? []))
            .catch(() => toast("Không tải được danh sách mã", "error"))
            .finally(() => setLoading(false));
    }, [activeOnly]);

    useEffect(() => { load(); }, [load]);

    const handleDisable = async (coupon) => {
        try {
            await adminApi.delete(`/api/coupons/admin/${coupon.code}`);
            toast("Đã vô hiệu hóa mã " + coupon.code, "success");
            setConfirm(null);
            load();
        } catch {
            toast("Không thể vô hiệu hóa mã này", "error");
        }
    };

    const filtered = coupons.filter((c) =>
        c.code?.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const total = coupons.length;
    const active = coupons.filter(
        (c) =>
            c.isActive &&
            (!c.validUntil || new Date(c.validUntil) > new Date())
    ).length;
    const totalUsed = coupons.reduce((s, c) => s + (c.usedCount ?? 0), 0);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                    Quản lý mã giảm giá
                </h2>
                <button
                    onClick={() => setModal("create")}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-xs text-sm transition-colors shadow-xs"
                >
                    <i className="fas fa-plus text-xs"></i>
                    Tạo mã mới
                </button>
            </div>

            {/* Stats */}
            <div className="bg-white round-xs border border-gray-100 grid grid-cols-3 gap-4">
                {[
                    { label: "Tổng mã", value: total, icon: "fas fa-ticket-alt", color: "text-amber-500" },
                    { label: "Đang hoạt động", value: active, icon: "fas fa-check-circle", color: "text-green-500" },
                    { label: "Lượt đã dùng", value: totalUsed, icon: "fas fa-users", color: "text-blue-500" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="p-4 flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <i className={`${s.icon} ${s.color} text-sm`}></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 leading-none">
                                {s.value}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo mã..."
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <div
                        onClick={() => setActiveOnly((v) => !v)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${activeOnly ? "bg-amber-400" : "bg-gray-200"
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activeOnly ? "translate-x-4" : "translate-x-0.5"
                                }`}
                        />
                    </div>
                    Chỉ xem đang hoạt động
                </label>
            </div>

            {/* Table */}
            {loading ? (
                <Spinner />
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xs p-12 shadow-xs border border-gray-100 text-center">
                    <i className="fas fa-ticket-alt text-3xl text-gray-200 mb-3"></i>
                    <p className="text-gray-400 text-sm">
                        {search ? "Không tìm thấy mã nào" : "Chưa có mã giảm giá nào"}
                    </p>
                    {!search && (
                        <button
                            onClick={() => setModal("create")}
                            className="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-xs text-sm transition-colors"
                        >
                            Tạo mã đầu tiên
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xs shadow-xs border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {[
                                        "Mã",
                                        "Giảm giá",
                                        "Điều kiện",
                                        "Hạn dùng",
                                        "Lượt dùng",
                                        "Trạng thái",
                                        "",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-xs text-gray-500 font-semibold whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((c) => (
                                    <tr
                                        key={c.code}
                                        className="hover:bg-amber-50/30 transition-colors"
                                    >
                                        {/* Mã */}
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold text-gray-900 tracking-widest bg-gray-100 px-2 py-0.5 text-xs">
                                                {c.code}
                                            </span>
                                        </td>

                                        {/* Giảm giá */}
                                        <td className="px-4 py-3">
                                            {c.discountPercent ? (
                                                <span className="font-bold text-amber-600 text-base">
                                                    -{c.discountPercent}%
                                                </span>
                                            ) : (
                                                <span className="font-bold text-amber-600">
                                                    -{fmtVND(c.discountAmount)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Điều kiện */}
                                        <td className="px-4 py-3 text-gray-500">
                                            {c.minOrder > 0
                                                ? `Từ ${fmtVND(c.minOrder)}`
                                                : "Không giới hạn"}
                                        </td>

                                        {/* Hạn dùng */}
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                            {c.validUntil
                                                ? fmtDate(c.validUntil)
                                                : "Không giới hạn"}
                                        </td>

                                        {/* Lượt dùng */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                    {c.usedCount ?? 0}/{c.maxUses}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Trạng thái */}
                                        <td className="px-4 py-3">
                                            <CouponBadge
                                                isActive={c.isActive}
                                                validUntil={c.validUntil}
                                            />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => setModal(c)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <i className="fas fa-pen text-xs"></i>
                                                </button>
                                                {c.isActive && (
                                                    <button
                                                        onClick={() => setConfirm(c)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Vô hiệu hóa"
                                                    >
                                                        <i className="fas fa-ban text-xs"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                        {filtered.length} mã
                        {search && ` · tìm kiếm "${search}"`}
                    </div>
                </div>
            )}

            {/* Modal tạo / sửa */}
            {modal && (
                <CouponModal
                    initial={modal === "create" ? null : modal}
                    onClose={() => setModal(null)}
                    onSave={() => {
                        setModal(null);
                        toast(
                            modal === "create"
                                ? "Tạo mã thành công"
                                : "Cập nhật thành công",
                            "success"
                        );
                        load();
                    }}
                />
            )}

            {/* Confirm vô hiệu hóa */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-xs w-full max-w-sm mx-4 p-6">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-ban text-red-500 text-lg"></i>
                        </div>
                        <h3 className="font-bold text-gray-900 text-center mb-1">
                            Vô hiệu hóa mã?
                        </h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            Mã{" "}
                            <span className="font-mono font-bold text-gray-700">
                                {confirm.code}
                            </span>{" "}
                            sẽ không còn dùng được. Hành động này có thể hoàn tác bằng cách chỉnh sửa lại.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xs transition-colors border border-gray-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDisable(confirm)}
                                className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xs transition-colors"
                            >
                                Vô hiệu hóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}