import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const CartDrawer = () => {
    const navigate = useNavigate();
    const { items, totalItems, totalPrice, loading, isOpen, closeCart, updateQuantity, removeItem } = useCart();

    // Đóng drawer khi bấm Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [closeCart]);

    // Khóa scroll body khi drawer mở
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleCheckout = () => {
        closeCart();
        navigate('/checkout');
    };

    return (
        <>
            {/* Overlay mờ phía sau */}
            <div
                onClick={closeCart}
                className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Drawer panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow -2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-[#eab308] to-[#c2410c]">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-shopping-cart text-white text-lg"></i>
                        <span className="font-bold text-white text-base">Giỏ hàng</span>
                        {totalItems > 0 && (
                            <span className="bg-white text-[#c2410c] text-xs font-bold px-2 py-0.5 rounded-full">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={closeCart}
                        className="text-white/80 hover:text-white transition-colors p-1"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Nội dung */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col gap-4 p-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-20 h-20 bg-slate-200 rounded-md flex-shrink-0"></div>
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        /* Giỏ trống */
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <i className="fas fa-shopping-cart text-3xl text-slate-300"></i>
                            </div>
                            <p className="font-semibold text-slate-700 mb-1">Giỏ hàng trống</p>
                            <p className="text-sm text-slate-400 mb-6">Thêm sản phẩm vào giỏ để tiếp tục mua sắm</p>
                        </div>
                    ) : (
                        /* Danh sách sản phẩm */
                        <ul className="divide-y divide-slate-100 px-5">
                            {items.map((item) => (
                                <li key={item.cartItemId} className="py-4 flex gap-4">
                                    {/* Ảnh sản phẩm */}
                                    <div className="w-20 h-20 bg-slate-50 rounded-md border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                        {item.thumbnailUrl ? (
                                            <img
                                                src={item.thumbnailUrl}
                                                alt={item.productName}
                                                className="w-full h-full object-contain p-1"
                                            />
                                        ) : (
                                            <i className="fas fa-image text-2xl text-slate-300"></i>
                                        )}
                                    </div>

                                    {/* Thông tin */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                                            {item.productName}
                                        </p>

                                        {/* Badge hết hàng */}
                                        {item.status === 'out_of_stock' && (
                                            <span className="text-[10px] bg-red-100 text-red-500 font-semibold px-2 py-0.5 rounded mt-1 inline-block">
                                                Hết hàng
                                            </span>
                                        )}
                                        {item.status === 'unavailable' && (
                                            <span className="text-[10px] bg-slate-100 text-slate-400 font-semibold px-2 py-0.5 rounded mt-1 inline-block">
                                                Không còn bán
                                            </span>
                                        )}

                                        <p className="text-[#c2410c] font-bold text-sm mt-1">
                                            {formatPrice(item.price)}
                                        </p>

                                        {/* Điều chỉnh số lượng */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                                                <button
                                                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm"
                                                >
                                                    <i className="fas fa-minus text-xs"></i>
                                                </button>
                                                <span className="w-8 text-center text-sm font-semibold text-slate-800">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                                    disabled={item.quantity >= item.stockQuantity}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                                >
                                                    <i className="fas fa-plus text-xs"></i>
                                                </button>
                                            </div>

                                            {/* Xóa */}
                                            <button
                                                onClick={() => removeItem(item.cartItemId)}
                                                className="text-slate-300 hover:text-red-400 transition-colors p-1"
                                                title="Xóa khỏi giỏ"
                                            >
                                                <i className="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer — tổng tiền + nút thanh toán */}
                {items.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-4 bg-white space-y-3">
                        <div className="flex justify-between items-center text-sm text-slate-500">
                            <span>{totalItems} sản phẩm</span>
                            <span className="text-xs text-slate-400">Chưa gồm phí vận chuyển</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-700">Tổng cộng</span>
                            <span className="text-xl font-extrabold text-[#c2410c]">
                                {formatPrice(totalPrice)}
                            </span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            className="w-full bg-[#fbbf24] hover:opacity-90 text-white font-bold py-3 rounded-md text-sm transition-opacity flex items-center justify-center gap-2 shadow-md"
                        >
                            <i className="fas fa-lock text-xs"></i>
                            Tiến hành thanh toán
                        </button>
                        <button
                            onClick={closeCart}
                            className="w-full text-slate-500 hover:text-slate-700 text-sm py-1 transition-colors"
                        >
                            Tiếp tục mua sắm
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;