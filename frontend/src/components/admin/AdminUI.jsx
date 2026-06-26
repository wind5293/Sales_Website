import { useEffect } from "react";
import { STATUS_MAP } from "../../utils/admin/helpers";

// ── Loading spinner ───────────────────────────────────────────────────────────
export const Spinner = () => (
    <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

// ── Toast notification ────────────────────────────────────────────────────────
export const Toast = ({ msg, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all
            ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            <i className={type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle"}></i>
            {msg}
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};

// ── Order status badge ────────────────────────────────────────────────────────
export const Badge = ({ status }) => {
    const s = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
            {s.label}
        </span>
    );
};

// ── Pagination controls ───────────────────────────────────────────────────────
export const Pagination = ({ page, pages, onPrev, onNext }) => {
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Trang {page + 1} / {pages}</span>
            <div className="flex gap-2">
                <button
                    disabled={page === 0}
                    onClick={onPrev}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                    <i className="fas fa-chevron-left"></i>
                </button>
                <button
                    disabled={page >= pages - 1}
                    onClick={onNext}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    );
};