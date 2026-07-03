'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const resetCart = useCallback(() => {
        setItems([]);
        setTotalItems(0);
        setTotalPrice(0);
    }, []);

    // Lấy giỏ hàng từ server
    const fetchCart = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/cart');
            const data = await res.json();
            setItems(data.items || []);
            setTotalItems(data.totalItems || 0);
            setTotalPrice(data.totalPrice || 0);
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
        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity }),
            });
            const data = await res.json();
            if (!res.ok) return { success: false, message: data.detail || 'Không thể thêm vào giỏ hàng' };
            await fetchCart();
            setIsOpen(true);
            return { success: true };
        } catch {
            return { success: false, message: 'Không thể thêm vào giỏ hàng' };
        }
    };

    // Cập nhật số lượng
    const updateQuantity = async (cartItemId, quantity) => {

        if (quantity < 1) {
            console.warn("Số lượng tối thiểu là 1");
            return;
        }
        try {
            await fetch(`/api/cart/item/${cartItemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity }),
            });
            await fetchCart();
        } catch (err) {
            console.error('Lỗi cập nhật:', err);
        }
    };

    // Xóa một sản phẩm
    const removeItem = async (cartItemId) => {
        try {
            await fetch(`/api/cart/item/${cartItemId}`, { method: 'DELETE' });
            await fetchCart();
        } catch (err) {
            console.error('Lỗi xóa sản phẩm:', err);
        }
    };

    // Xóa toàn bộ giỏ
    const clearCart = async () => {
        try {
            await fetch('/api/cart', { method: 'DELETE' });
            setItems([]); setTotalItems(0); setTotalPrice(0);
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
            resetCart,
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