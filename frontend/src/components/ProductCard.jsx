import React from 'react';
import { useCart } from '../context/CartContext';

// Format số thành tiền VNĐ: 29990000 → "29.990.000đ"
const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    return Number(price).toLocaleString('vi-VN') + 'đ';
};

const ProductCard = ({ id, image, category, title, price, oldPrice, discountPercent, status }) => {
    const isOutOfStock = status === 'out_of_stock';

    const { addToCart } = useCart();
    
    const handleAddToCart = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (isOutOfStock) return;

        const result = await addToCart(id, 1);

        if (!result.success) {
            alert(result.message);
        }
    }

    return (
        <div className={`bg-white border border-slate-100 rounded-md p-4 hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer relative ${isOutOfStock ? 'opacity-60' : ''}`}>

            {/* Badge giảm giá */}
            {discountPercent && !isOutOfStock && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
                    -{discountPercent}%
                </span>
            )}

            {/* Badge hết hàng */}
            {isOutOfStock && (
                <span className="absolute top-3 left-3 bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
                    Hết hàng
                </span>
            )}

            {/* Ảnh sản phẩm */}
            <div className="h-44 w-full flex items-center justify-center overflow-hidden mb-4 bg-slate-50 rounded-md p-2 relative">
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            // Fallback nếu ảnh lỗi
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                {/* Placeholder khi không có ảnh */}
                <div
                    className="w-full h-full items-center justify-center text-slate-300 text-4xl"
                    style={{ display: image ? 'none' : 'flex' }}
                >
                    <i className="fas fa-image"></i>
                </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1 font-medium">
                    {category}
                </span>
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 h-10 mb-2 group-hover:text-[#fbbf24] transition-colors">
                    {title}
                </h3>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-yellow-500">
                        {formatPrice(price)}
                    </span>
                    {oldPrice && oldPrice > price && (
                        <span className="text-xs text-slate-400 line-through">
                            {formatPrice(oldPrice)}
                        </span>
                    )}
                </div>
            </div>

            {/* Nút thêm giỏ hàng */}
            <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}    
                className={`mt-4 w-full font-semibold py-2.5 rounded-md text-xs transition-colors flex items-center justify-center gap-2
                    ${isOutOfStock
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-[#fbbf24] text-slate-800 cursor-pointer'
                    }`}
            >
                <i className="fas fa-shopping-basket"></i>
                {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
            </button>
        </div>
    );
};

export default ProductCard;