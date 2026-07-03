'use client';
import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function AddToCartButton({ productId, isOutOfStock }) {
    const { addToCart } = useCart();
    const [cartMsg, setCartMsg] = useState('');

    const handleAddToCart = async () => {
        const result = await addToCart(productId, 1);
        if (!result.success) setCartMsg(result.message);
    };

    return (
        <>
            <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full font-semibold py-3 rounded-sm text-sm transition-colors flex items-center justify-center gap-2
          ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 cursor-pointer'}`}
            >
                <i className="fas fa-shopping-basket" />
                {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            {cartMsg && <p className="text-red-500 text-sm mt-2">{cartMsg}</p>}
        </>
    );
}