import React from 'react';

const ProductCard = ({ image, category, title, price, oldPrice }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer">
            {/* Khối hiển thị ảnh sản phẩm tập trung */}
            <div className="h-44 w-full flex items-center justify-center overflow-hidden mb-4 bg-slate-50 rounded-lg p-2 relative">
                <img
                    src={image}
                    alt={title}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Thông tin văn bản */}
            <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1 font-medium">{category}</span>
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 h-10 mb-2 group-hover:text-[#fbbf24] transition-colors">
                    {title}
                </h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-red-500">${price}</span>
                    {oldPrice && <span className="text-xs text-slate-400 line-through">${oldPrice}</span>}
                </div>
            </div>

            {/* Button hành động */}
            <button className="mt-4 w-full bg-slate-100 hover:bg-[#fbbf24] text-slate-800 font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2">
                <i className="fas fa-shopping-basket"></i> Thêm vào giỏ
            </button>
        </div>
    );
};

export default ProductCard;