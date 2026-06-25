import { formatPrice } from "../../utils/format";
import { STATUS_CONFIG } from "./orderConstants";
import { StatusBadge } from "./OrderComponents";
import OrderDetail from "./OrderDetail";

const OrderCard = ({ order, expanded, onExpand }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const previewItems = order.items?.slice(0, 2) || [];
    const extraCount = (order.items?.length || 0) - previewItems.length;

    return (
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">

            {/* Header */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                    <i className={`${cfg.icon} ${cfg.color} text-base shrink-0`} />
                    <div className="min-w-0">
                        <p className="text-xs text-slate-400 leading-tight">Mã đơn hàng</p>
                        <p className="text-sm font-bold text-slate-800 truncate">#{order.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={order.status} />
                    <button
                        onClick={() => onExpand(order.id)}
                        className="text-slate-400 hover:text-amber-500 transition-colors p-1"
                        aria-label={expanded ? "Thu gọn" : "Xem chi tiết"}
                    >
                        <i
                            className={`fas fa-chevron-down text-sm transition-transform duration-200 ${expanded ? "rotate-180" : ""
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Items preview */}
            <div className="px-5 py-4">
                <div className="space-y-3">
                    {previewItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            {item.thumbnailUrl ? (
                                <img
                                    src={item.thumbnailUrl}
                                    alt={item.productName}
                                    className="w-12 h-12 object-cover rounded-sm border border-slate-100 shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center shrink-0">
                                    <i className="fas fa-box text-slate-300 text-lg" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                                <p className="text-xs text-slate-400">x{item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-amber-600 shrink-0">
                                {formatPrice(item.price)}
                            </p>
                        </div>
                    ))}
                    {extraCount > 0 && (
                        <p className="text-xs text-slate-400 text-center py-1">
                            +{extraCount} sản phẩm khác
                        </p>
                    )}
                </div>

                {/* Footer tổng */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                        {order.estimated_delivery &&
                            order.status !== "delivered" &&
                            order.status !== "cancelled" && (
                                <p className="text-xs text-slate-400">
                                    <i className="fas fa-truck mr-1 text-amber-400" />
                                    Dự kiến: {order.estimated_delivery}
                                </p>
                            )}
                        {order.tracking_number && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                <i className="fas fa-barcode mr-1" />
                                {order.tracking_number}
                            </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Tổng tiền</p>
                        <p className="text-base text-yellow-500 font-bold text-slate-900">
                            {formatPrice(order.totalPrice)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Expanded detail panel */}
            {expanded && <OrderDetail orderId={order.id} />}
        </div>
    );
};

export default OrderCard;