'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import { OrderTimeline } from "./OrderComponents";

const OrderDetail = ({ orderId }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/orders/${orderId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setDetail(data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [orderId]);

    if (loading) {
        return (
            <div className="px-5 pb-4 border-t border-slate-100 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-1/3 mt-4 mb-3" />
                <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
            </div>
        );
    }

    if (!detail) return null;

    return (
        <div className="px-5 pb-5 border-t border-slate-100">
            <OrderTimeline timeline={detail.timeline} />
            {detail.message && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-sm text-xs text-amber-700">
                    <i className="fas fa-info-circle mr-1.5" />
                    {detail.message}
                </div>
            )}
            <div className="mt-4 flex gap-2 justify-end">
                <Link
                    href={`/orders/${orderId}`}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 border border-amber-300 hover:border-amber-400 px-3 py-1.5 rounded-sm transition-colors"
                >
                    <i className="fas fa-file-alt mr-1.5" />
                    Chi tiết đầy đủ
                </Link>
            </div>
        </div>
    );
};

export default OrderDetail;