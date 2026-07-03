// ── Format helpers ────────────────────────────────────────────────────────────
export const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0);
export const fmtVND = (n) => fmt(n) + "₫";
export const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("vi-VN") : "—");

// ── Order status map ──────────────────────────────────────────────────────────
export const STATUS_MAP = {
    pending: { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-700" },
    confirmed: { label: "Đã xác nhận", cls: "bg-blue-100 text-blue-700" },
    shipping: { label: "Đang giao", cls: "bg-purple-100 text-purple-700" },
    delivered: { label: "Đã giao", cls: "bg-green-100 text-green-700" },
    cancelled: { label: "Đã huỷ", cls: "bg-red-100 text-red-700" },
};

// ── Sidebar nav config ────────────────────────────────────────────────────────
export const NAV = [
    { id: "overview", label: "Tổng quan", icon: "fas fa-chart-pie" },
    { id: "products", label: "Sản phẩm", icon: "fas fa-box" },
    { id: "orders", label: "Đơn hàng", icon: "fas fa-clipboard-list" },
    { id: "users", label: "Người dùng", icon: "fas fa-users" },
    { id: "coupons", label: "Mã giảm giá", icon: "fas fa-ticket-alt" },
    { id: "analytics", label: "Báo cáo", icon: "fas fa-chart-bar" },
    { id: "audit_logs", label: "Nhật ký hoạt động", icon: "fas fa-clipboard-list" }
];