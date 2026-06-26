import { useState, useEffect, useCallback, useRef } from "react";
import adminApi from "../../../utils/admin/adminApi";
import { fmt, fmtVND } from "../../../utils/admin/helpers";
import { Spinner, Pagination } from "../../../components/admin/AdminUI";

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

// ── Upload modal ───────────────────────────────────────────────────────────
function UploadModal({ productId, onClose, onDone, toast }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [uploadedUrl, setUploadUrl] = useState(null);
    const [tab, setTab] = useState("file")       
    const [urlInput, setUrlInput] = useState("");
    const [submittingUrl, setSubmittingUrl] = useState(false);
    const inputRef = useRef();

    const handleFile = async (file) => {
        if (!file) return;

        // Validate phía client trước
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            toast("Chỉ chấp nhận JPG, PNG, WEBP, GIF", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast("Ảnh vượt quá 5 MB", "error");
            return;
        }

        setPreview(URL.createObjectURL(file));
        setUploading(true);
        setUploadedUrl(null);

        const form = new FormData();
        form.append("file", file);

        try {
            const r = await adminApi.post("/api/admin/products/upload-image", form);
            const url = r.data.image_url;
            setUploadedUrl(url);

            await adminApi.post(`/api/admin/products/${productId}/images`)

            toast("Đã thêm ảnh thành công", "success");
            onDone();
        } catch {
            const msg = err?.response?.data?.detail || "Upload ảnh thất bại";
            toast(msg, "error");
            setPreview(null);
            setUploadedUrl(null);
        } finally {
            setUploading(false);
        }
    };

    // ── Thêm ảnh bằng URL có sẵn ─────────────────────────────────────────
    const handleUrlSubmit = async () => {
        const url = urlInput.trim();
        if (!url) return;
        if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url)) {
            toast("URL không hợp lệ (phải là link ảnh JPG/PNG/WEBP)", "error");
            return;
        }
        setSubmittingUrl(true);
        try {
            await adminApi.post(`/api/admin/products/${productId}/images`, { image_url: url });
            toast("Đã thêm ảnh thành công", "success");
            onDone();
        } catch (err) {
            const msg = err?.response?.data?.detail || "Thêm ảnh thất bại";
            toast(msg, "error");
        } finally {
            setSubmittingUrl(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Thêm ảnh sản phẩm</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {[
                        { key: "file", label: "Tải lên máy", icon: "fa-upload" },
                        { key: "url", label: "Từ URL", icon: "fa-link" },
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                                ${tab === key
                                    ? "text-amber-600 border-b-2 border-amber-500"
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <i className={`fas ${icon} text-xs`}></i>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {/* ── Tab: Upload file ── */}
                    {tab === "file" && (
                        <div
                            className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
                                ${uploading
                                    ? "border-amber-300 bg-amber-50/50 cursor-not-allowed"
                                    : "border-gray-200 hover:border-amber-400 hover:bg-amber-50/30"
                                }`}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => !uploading && inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => handleFile(e.target.files[0])}
                                disabled={uploading}
                            />

                            {preview ? (
                                /* Preview + trạng thái upload */
                                <div className="p-5 flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={preview}
                                            alt="preview"
                                            className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                                        />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                                                <i className="fas fa-spinner fa-spin text-amber-500 text-xl"></i>
                                            </div>
                                        )}
                                        {uploadedUrl && !uploading && (
                                            <div className="absolute inset-0 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                                <i className="fas fa-check-circle text-emerald-500 text-2xl"></i>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {uploading ? "Đang tải lên Firebase Storage..." : uploadedUrl ? "Tải lên thành công" : ""}
                                    </p>
                                </div>
                            ) : (
                                /* Drop zone mặc định */
                                <div className="py-10 flex flex-col items-center gap-2 text-gray-400 select-none">
                                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-1">
                                        <i className="fas fa-cloud-upload-alt text-xl text-amber-400"></i>
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">Kéo thả hoặc bấm để chọn ảnh</p>
                                    <p className="text-xs">JPG, PNG, WEBP · Tối đa 5 MB</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: URL ── */}
                    {tab === "url" && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                                    Dán URL ảnh vào đây
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                                               focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                                               placeholder:text-gray-300"
                                />
                            </div>

                            {/* Preview URL */}
                            {urlInput && (
                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center h-36">
                                    <img
                                        src={urlInput}
                                        alt="url preview"
                                        className="max-h-full max-w-full object-contain"
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleUrlSubmit}
                                disabled={!urlInput.trim() || submittingUrl}
                                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors
                                           bg-amber-500 text-white hover:bg-amber-600
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           flex items-center justify-center gap-2"
                            >
                                {submittingUrl
                                    ? <><i className="fas fa-spinner fa-spin"></i> Đang thêm...</>
                                    : <><i className="fas fa-plus"></i> Thêm ảnh</>
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Products({ toast }) {
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [skip, setSkip] = useState(0);
    const [uploadModal, setUploadModal] = useState(null); // product id
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
                // Collect unique categories from response if no separate endpoint
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
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
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
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white
                               focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent
                               text-gray-600"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ẩn</option>
                    <option value="draft">Nháp</option>
                </select>

                {/* Category filter */}
                {categories.length > 0 && (
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white
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
                        className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                <div className="bg-white rounded-xl border border-gray-100 shadow-xs py-16 flex flex-col items-center gap-3 text-center">
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
                    <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
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
                                                    <ProductThumb src={p.images?.[0]?.url} alt={p.name} />
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
                                            <td className="px-4 py-3 text-right font-medium text-gray-800 tabular-nums">
                                                {fmtVND(p.price)}
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
                                                        onClick={() => setUploadModal(p.id)}
                                                        title="Thêm ảnh"
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                                                                   hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                    >
                                                        <i className="fas fa-image text-sm"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => {/* navigate to edit */ }}
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

            {/* Upload modal */}
            {uploadModal && (
                <UploadModal
                    productId={uploadModal}
                    onClose={() => setUploadModal(null)}
                    onDone={() => { setUploadModal(null); load(); }}
                    toast={toast}
                />
            )}
        </div>
    );
}