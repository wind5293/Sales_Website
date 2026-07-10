'use client';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const CartCrossSell = ({ productId }) => {
    const { addToCart } = useCart();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState(null);

    useEffect(() => {
        if (!productId) {
            setSuggestions([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        fetch(`/api/cart/cross-sell?productId=${productId}&limit=4`)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) setSuggestions(data.products || []);
            })
            .catch((err) => console.error('Lỗi tải gợi ý mua kèm:', err))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [productId]);

    const handleAdd = async (id) => {
        setAddingId(id);
        await addToCart(id, 1);
        setAddingId(null);
    };

    // Không hiện khối này nếu không có gợi ý nào (và đã tải xong)
    if (!loading && suggestions.length === 0) return null;

    return (
        <div className="mx-5 mt-4 border border-amber-200 bg-amber-50/60 rounded-md overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100/70 border-b border-amber-200">
                <i className="fas fa-shopping-bag text-amber-600 text-sm"></i>
                <span className="text-sm font-bold text-amber-800">Mua kèm tiết kiệm hơn</span>
            </div>

            <ul className="divide-y divide-amber-100">
                {loading
                    ? [1, 2].map((i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                            <div className="w-12 h-12 bg-amber-100 rounded-md flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-amber-100 rounded w-3/4"></div>
                                <div className="h-3 bg-amber-100 rounded w-1/3"></div>
                            </div>
                        </li>
                    ))
                    : suggestions.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-12 h-12 bg-white rounded-md border border-amber-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {p.thumbnailUrl ? (
                                    <img
                                        src={p.thumbnailUrl}
                                        alt={p.name}
                                        className="w-full h-full object-contain p-1"
                                    />
                                ) : (
                                    <i className="fas fa-image text-amber-200"></i>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 line-clamp-2">{p.name}</p>
                                <p className="text-xs text-[#c2410c] font-bold mt-0.5">{formatPrice(p.price)}</p>
                            </div>
                            <button
                                onClick={() => handleAdd(p.id)}
                                disabled={addingId === p.id}
                                className="shrink-0 text-xs font-bold text-amber-700 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                            >
                                {addingId === p.id ? '...' : 'Chọn'}
                            </button>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

export default CartCrossSell;