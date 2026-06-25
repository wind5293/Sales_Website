export const STATUS_CONFIG = {
    pending: {
        label: "Chờ xác nhận",
        icon: "fas fa-clock",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        dot: "bg-amber-400",
    },
    confirmed: {
        label: "Đã xác nhận",
        icon: "fas fa-check-circle",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        dot: "bg-blue-400",
    },
    shipped: {
        label: "Đang giao hàng",
        icon: "fas fa-shipping-fast",
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        dot: "bg-purple-400",
    },
    delivered: {
        label: "Đã giao hàng",
        icon: "fas fa-box-check",
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        dot: "bg-green-400",
    },
    cancelled: {
        label: "Đã huỷ",
        icon: "fas fa-times-circle",
        color: "text-red-500",
        bg: "bg-red-50",
        border: "border-red-200",
        dot: "bg-red-400",
    },
};

export const TABS = [
    { key: "", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "confirmed", label: "Đã xác nhận" },
    { key: "shipped", label: "Đang giao" },
    { key: "delivered", label: "Đã giao" },
    { key: "cancelled", label: "Đã huỷ" },
];

export const ORDERS_PER_PAGE = 5;