import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const CartContext = createContext(null);

const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // trạng thái mở/đóng drawer

    // Lấy giỏ hàng từ server
    const fetchCart = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setItems([]);
            setTotalItems(0);
            setTotalPrice(0);
            return;
        }
        try {
            setLoading(true);
            const res = await axios.get('/api/cart', { headers: getAuthHeader() });
            setItems(res.data.items || []);
            setTotalItems(res.data.totalItems || 0);
            setTotalPrice(res.data.totalPrice || 0);
        } catch (err) {
            console.error('Lỗi tải giỏ hàng:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Tải giỏ hàng khi app khởi động
    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    // Thêm sản phẩm vào giỏ
    const addToCart = async (productId, quantity = 1) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return { success: false, message: 'Vui lòng đăng nhập để thêm vào giỏ hàng' };

        try {
            await axios.post(
                '/api/cart',
                { productId, quantity },
                { headers: getAuthHeader() }
            );
            await fetchCart();
            setIsOpen(true); // tự mở drawer sau khi thêm
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.detail || 'Không thể thêm vào giỏ hàng';
            return { success: false, message: msg };
        }
    };

    // Cập nhật số lượng
    const updateQuantity = async (productId, quantity) => {
        try {
            await axios.patch(
                `/api/cart/item/${productId}`,
                { productId, quantity },
                { headers: getAuthHeader() }
            );
            await fetchCart();
        } catch (err) {
            console.error('Lỗi cập nhật:', err);
        }
    };

    // Xóa một sản phẩm
    const removeItem = async (productId) => {
        try {
            await axios.delete(`/api/cart/item/${productId}`, { headers: getAuthHeader() });
            await fetchCart();
        } catch (err) {
            console.error('Lỗi xóa sản phẩm:', err);
        }
    };

    // Xóa toàn bộ giỏ
    const clearCart = async () => {
        try {
            await axios.delete('/api/cart', { headers: getAuthHeader() });
            setItems([]);
            setTotalItems(0);
            setTotalPrice(0);
        } catch (err) {
            console.error('Lỗi xóa giỏ:', err);
        }
    };

    const openCart = () => setIsOpen(true);
    const closeCart = () => setIsOpen(false);

    return (
        <CartContext.Provider value={{
            items, totalItems, totalPrice, loading, isOpen,
            fetchCart, addToCart, updateQuantity, removeItem, clearCart,
            openCart, closeCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart phải dùng trong CartProvider');
    return ctx;
};