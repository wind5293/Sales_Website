import { useState } from "react";
import { Link } from "react-router-dom";
import { TABS, ORDERS_PER_PAGE, STATUS_CONFIG } from "../features/orders/orderConstants";
import useOrders from "../features/orders/useOrders";
import OrderCard from "../features/orders/OrderCard";

const OrdersSkeleton = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-sm p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-5 bg-slate-100 rounded w-20" />
                </div>
                <div className="flex gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-sm shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const EmptyOrders = ({ activeTab }) => (
    <div className="text-center py-20 text-slate-400">
        <i className="fas fa-clipboard-list text-5xl mb-4 block opacity-30" />
        <p className="font-semibold text-slate-600 mb-1">Chưa có đơn hàng nào</p>
        <p className="text-sm">
            {activeTab
                ? `Không có đơn ở trạng thái "${STATUS_CONFIG[activeTab]?.label}"`
                : "Hãy mua sắm và quay lại đây nhé!"}
        </p>
        <Link
            to="/"
            className="inline-block mt-6 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-sm transition-colors"
        >
            Mua sắm ngay
        </Link>
    </div>
);

const Pagination = ({ skip, total, onPage }) => {
    const totalPages = Math.ceil(total / ORDERS_PER_PAGE);
    const currentPage = Math.floor(skip / ORDERS_PER_PAGE) + 1;

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            <button
                onClick={() => onPage(skip - ORDERS_PER_PAGE)}
                disabled={skip === 0}
                className="px-3 py-1.5 text-sm rounded-sm border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <i className="fas fa-chevron-left" />
            </button>

            {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                const isActive = page === currentPage;
                if (
                    totalPages > 7 &&
                    Math.abs(page - currentPage) > 2 &&
                    page !== 1 &&
                    page !== totalPages
                ) {
                    if (page === 2 || page === totalPages - 1)
                        return <span key={i} className="text-slate-300 text-sm">…</span>;
                    return null;
                }
                return (
                    <button
                        key={i}
                        onClick={() => onPage(i * ORDERS_PER_PAGE)}
                        className={`w-8 h-8 text-sm rounded-sm border transition-colors font-semibold ${isActive
                                ? "bg-[#fbbf24] border-[#fbbf24] text-slate-900"
                                : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600"
                            }`}
                    >
                        {page}
                    </button>
                );
            })}

            <button
                onClick={() => onPage(skip + ORDERS_PER_PAGE)}
                disabled={skip + ORDERS_PER_PAGE >= total}
                className="px-3 py-1.5 text-sm rounded-sm border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <i className="fas fa-chevron-right" />
            </button>
        </div>
    );
};

const Orders = () => {
    const [expandedId, setExpandedId] = useState(null);
    const { activeTab, orders, total, skip, loading, handleTabChange, handlePage } = useOrders();

    const handleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const handlePageChange = (newSkip) => {
        setExpandedId(null);
        handlePage(newSkip);
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Page header */}
                <div className="mb-6">
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                        <Link to="/" className="hover:text-amber-500">Trang chủ</Link>
                        <span>/</span>
                        <span>Đơn mua</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-600">Đơn mua của tôi</h1>
                    {total > 0 && !loading && (
                        <p className="text-sm text-slate-400 mt-1">{total} đơn hàng</p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-sm transition-colors whitespace-nowrap ${activeTab === tab.key
                                    ? "bg-[#fbbf24] text-slate-900 shadow-sm"
                                    : "bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <OrdersSkeleton />
                ) : orders.length === 0 ? (
                    <EmptyOrders activeTab={activeTab} />
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                expanded={expandedId === order.id}
                                onExpand={handleExpand}
                            />
                        ))}
                    </div>
                )}

                <Pagination skip={skip} total={total} onPage={handlePageChange} />
            </div>
        </div>
    );
};

export default Orders;