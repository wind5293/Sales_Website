'use client';
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ORDERS_PER_PAGE } from "./orderConstants";

const useOrders = (initialOrders = [], initialTotal = 0) => {
    const router = useRouter();
    const isFirstRun = useRef(true);

    const [activeTab, setActiveTab] = useState("");
    const [orders, setOrders] = useState(initialOrders);
    const [total, setTotal] = useState(initialTotal);
    const [skip, setSkip] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchOrders = useCallback(
        async (status, skipVal) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ skip: skipVal, limit: ORDERS_PER_PAGE });
                if (status) params.set("status", status);

                const res = await fetch(`/api/orders?${params.toString()}`);

                if (res.status === 401) {
                    router.push("/login");
                    return;
                }

                const data = await res.json();
                setOrders(data.orders || []);
                setTotal(data.total || 0);
            } catch (err) {
                console.error("Không tải được danh sách đơn hàng:", err);
            } finally {
                setLoading(false);
            }
        },
        [router]
    );

    useEffect(() => {
        // Lần render đầu: dữ liệu tab "" / skip 0 đã có sẵn từ Server Component, không fetch lại
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        setSkip(0);
        fetchOrders(activeTab, 0);
    }, [activeTab, fetchOrders]);

    const handlePage = (newSkip) => {
        setSkip(newSkip);
        fetchOrders(activeTab, newSkip);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleTabChange = (key) => {
        if (key !== activeTab) setActiveTab(key);
    };

    return {
        activeTab,
        orders,
        total,
        skip,
        loading,
        handleTabChange,
        handlePage,
    };
};

export default useOrders;