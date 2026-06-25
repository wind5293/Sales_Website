import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosAuth from "../../utils/axiosAuth";
import { ORDERS_PER_PAGE } from "./orderConstants";

const useOrders = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("");
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(
        async (status, skipVal) => {
            setLoading(true);
            try {
                const params = { skip: skipVal, limit: ORDERS_PER_PAGE };
                if (status) params.status = status;
                const res = await axiosAuth.get("/api/orders", { params });
                setOrders(res.data.orders || []);
                setTotal(res.data.total || 0);
            } catch (err) {
                if (err.response?.status === 401) navigate("/login");
            } finally {
                setLoading(false);
            }
        },
        [navigate]
    );

    useEffect(() => {
        setSkip(0);
        fetchOrders(activeTab, 0);
    }, [activeTab, fetchOrders]);

    const handleTabChange = (key) => {
        if (key !== activeTab) setActiveTab(key);
    };

    const handlePage = (newSkip, onSuccess) => {
        setSkip(newSkip);
        fetchOrders(activeTab, newSkip);
        if (onSuccess) onSuccess();
        window.scrollTo({ top: 0, behavior: "smooth" });
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