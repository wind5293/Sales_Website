'use client';

import { useState, useEffect, useCallback } from "react";
import adminApi from "@/utils/admin/adminApi";
import { fmt, fmtVND } from "@/utils/admin/helpers";
import { Spinner, Pagination } from "@/components/admin/AdminUI";
import { useAdminToast } from "@/context/AdminToastContext";

// ── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        active: {
            label: "Đang bán",
            cls: "bg-emerald-50 text-emerald-700 border border-emerald-200"
        },
        inactive: {
            label: "Ẩn",
            cls: "bg-gray-100  text-gray-500   border border-gray-200"
        },
        draft: {
            label: "Nháp",
            cls: "bg-amber-50  text-amber-700  border border-amber-200"
        },
    };
    const { label, cls } = map[status] ?? { label: status ?? "—", cls: "bg-gray-100 text-gray-500" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>{label}</span>;
}

// ── Product image thumbnail ────────────────────────────────────────────────
function ProductThumb({ src, alt }) {
    const [err, setErr] = useState(false);
    if (!src || err) {
        return (
            <div className="w-11 h-11 rounded-sm bg-gray-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-image text-gray-300 text-sm"></i>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setErr(true)}
            className="w-11 h-11 rounded-sm object-cover border border-gray-100 flex-shrink-0"
        />
    );
}

// ── Edit product modal ──────────────────────────────────────────────────────
function EditProductModal({ product, onClose, onDone, toast }) {
    const [form, setForm] = useState({
        name: product.name || "",
        price: product.price ?? 0,
        originalPrice: product.originalPrice ?? "",
        stock: product.stock ?? 0,
        status: product.status || "active",
    });
    const [saving, setSaving] = useState(false);

    const set = (field) => (e) => {
        const value = e.target.type === "number" ? e.target.valueAsNumber : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast("Tên sản phẩm không được để trống", "error");
            return;
        }
        if (form.price < 0 || (form.originalPrice !== "" && form.originalPrice < 0)) {
            toast("Giá không hợp lệ", "error");
            return;
        }

        setSaving(true);
        try {
            const body = {
                name: form.name.trim(),
                price: form.price,
                stockQuantity: form.stock,
                status: form.status,
            };
            // Chỉ gửi originalPrice nếu người dùng có nhập (để backend tự tính discountPercent)
            if (form.originalPrice !== "" && form.originalPrice !== null) {
                body.originalPrice = form.originalPrice;
            }

            await adminApi.patch(`/api/admin/products/${product.id}`, body);
            toast("Cập nhật sản phẩm thành công", "success");
            onDone();
        } catch (err) {
            const msg = err?.response?.data?.detail || "Cập nhật sản phẩm thất bại";
            toast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    const hasDiscount = form.originalPrice !== "" && form.originalPrice > form.price;
    const discountPercent = hasDiscount ? Math.round((1 - form.price / form.originalPrice) * 100) : 0;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Chỉnh sửa sản phẩm</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Tên sản phẩm */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1.5 block">Tên sản phẩm</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={set("name")}
                            className="w-full px-3 py-2.5 text-sm border border-gray-200
                                       focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                        />
                    </div>

                    {/* Giá bán + Giá gốc */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Giá bán (₫)</label>
                            <input
                                type="number"
                                min="0"
                                value={form.price}
                                onChange={set("price")}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200
                                           focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                                Giá gốc (₫) 
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.originalPrice}
                                onChange={set("originalPrice")}
                                placeholder="—"
                                className="w-full px-3 py-2.5 text-sm border border-gray-200
                                           focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                                           placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Preview mức giảm giá */}
                    {hasDiscount && (
                        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 px-3 py-2">
                            <i className="fas fa-tag text-amber-500"></i>
                            <span className="text-amber-700 font-medium">
                                Giảm {discountPercent}% so với giá gốc {fmtVND(form.originalPrice)}
                            </span>
                        </div>
                    )}

                    {/* Tồn kho + Trạng thái */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Tồn kho</label>
                            <input
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={set("stock")}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200
                                           focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Trạng thái</label>
                            <select
                                value={form.status}
                                onChange={set("status")}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-white
                                           focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                            >
                                <option value="active">Đang bán</option>
                                <option value="inactive">Ẩn</option>
                                <option value="draft">Nháp</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-2.5 text-sm font-medium transition-colors
                                   bg-amber-500 text-white hover:bg-amber-600
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {saving
                            ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                            : <><i className="fas fa-check"></i> Lưu thay đổi</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Products() {
    const toast = useAdminToast();
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [skip, setSkip] = useState(0);
    const [editProduct, setEditProduct] = useState(null); // product object being edited
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const limit = 20;

    const debouncedSearch = useDebounce(search);

    // Reset to page 0 whenever filters change
    useEffect(() => { setSkip(0); }, [debouncedSearch, filterStatus, filterCategory]);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ skip, limit });
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (filterStatus) params.set("status", filterStatus);
        if (filterCategory) params.set("categoryId", filterCategory);

        adminApi.get(`/api/admin/products?${params}`)
            .then((r) => {
                setProducts(r.data.products || []);
                setTotal(r.data.total || 0);
                if (!categories.length) {
                    const cats = [...new Set((r.data.products || []).map((p) => p.category).filter(Boolean))];
                    setCategories(cats);
                }
            })
            .catch(() => toast("Không tải được sản phẩm", "error"))
            .finally(() => setLoading(false));
    }, [skip, debouncedSearch, filterStatus, filterCategory]);

    useEffect(() => { load(); }, [load]);

    const pages = Math.ceil(total / limit);
    const page = Math.floor(skip / limit);

    const activeFilters = [debouncedSearch, filterStatus, filterCategory].filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Sản phẩm</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {loading ? "Đang tải..." : `${fmt(total)} sản phẩm`}
                    </p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none"></i>
                    <input
                        type="text"
                        placeholder="Tìm tên sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-sm bg-white
                                   focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                                   placeholder:text-gray-300"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-sm px-3 py-2 bg-white
                               focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                               text-gray-600"
                >
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ẩn</option>
                    <option value="out_of_stock">Hết hàng</option>
                    <option value="hidden">Ẩn hoàn toàn</option>
                </select>

                {/* Category filter */}
                {categories.length > 0 && (
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="text-sm border border-gray-200 rounded-sm px-3 py-2 bg-white
                                   focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                                   text-gray-600"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                )}

                {/* Clear filters */}
                {activeFilters > 0 && (
                    <button
                        onClick={() => { setSearch(""); setFilterStatus(""); setFilterCategory(""); }}
                        className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 hover:bg-gray-100 rounded-sm transition-colors"
                    >
                        <i className="fas fa-filter-circle-xmark mr-1"></i>
                        Xóa lọc ({activeFilters})
                    </button>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <Spinner />
            ) : products.length === 0 ? (
                /* Empty state */
                <div className="bg-white border border-gray-100 shadow-xs py-16 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                        <i className="fas fa-box-open text-2xl text-gray-300"></i>
                    </div>
                    <p className="font-medium text-gray-600">Không có sản phẩm nào</p>
                    <p className="text-sm text-gray-400">
                        {activeFilters > 0 ? "Thử thay đổi bộ lọc để xem kết quả khác." : "Chưa có sản phẩm nào trong hệ thống."}
                    </p>
                    {activeFilters > 0 && (
                        <button
                            onClick={() => { setSearch(""); setFilterStatus(""); setFilterCategory(""); }}
                            className="mt-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="bg-white border border-gray-100 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/70">
                                        <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">SẢN PHẨM</th>
                                        <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">DANH MỤC</th>
                                        <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">TRẠNG THÁI</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">GIÁ</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">TỒN KHO</th>
                                        <th className="text-center px-4 py-3 text-xs text-gray-400 font-semibold tracking-wide">THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {products.map((p) => (
                                        <tr key={p.id} className="hover:bg-amber-50/20 transition-colors group">
                                            {/* Product name + thumb */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <ProductThumb src={p.thumbnailUrl} alt={p.name} />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-800 line-clamp-1 leading-tight">{p.name}</p>
                                                        <p className="text-xs text-gray-300 mt-0.5 font-mono">{p.id}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3">
                                                {p.category ? (
                                                    <span className="text-gray-600 text-sm">{p.category}</span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge status={p.status} />
                                            </td>

                                            {/* Price */}
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                <div className="font-medium text-gray-800">{fmtVND(p.price)}</div>
                                                {p.discountPercent > 0 && (
                                                    <div className="text-xs text-amber-500">-{p.discountPercent}%</div>
                                                )}
                                            </td>

                                            {/* Stock */}
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {p.stock === 0 ? (
                                                    <span className="text-red-400 font-semibold">Hết hàng</span>
                                                ) : p.stock <= 5 ? (
                                                    <span className="text-amber-500 font-semibold">{fmt(p.stock)}</span>
                                                ) : (
                                                    <span className="text-gray-600">{fmt(p.stock)}</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setEditProduct(p)}
                                                        title="Chỉnh sửa"
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                                                                   hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    >
                                                        <i className="fas fa-pen text-sm"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Pagination
                        page={page}
                        pages={pages}
                        onPrev={() => setSkip((s) => Math.max(0, s - limit))}
                        onNext={() => setSkip((s) => s + limit)}
                    />
                </>
            )}

            {/* Edit modal */}
            {editProduct && (
                <EditProductModal
                    product={editProduct}
                    onClose={() => setEditProduct(null)}
                    onDone={() => { setEditProduct(null); load(); }}
                    toast={toast}
                />
            )}
        </div>
    );
}