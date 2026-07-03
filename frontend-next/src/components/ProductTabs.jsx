// src/components/ProductTabs.jsx
'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';

export default function ProductTabs({ products }) {
    const [activeTab, setActiveTab] = useState('featured');

    const displayProducts = useMemo(() => {
        const base = products;
        if (activeTab === 'featured') {
            return [...base].filter(p => p.discountPercent > 0)
                .sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 8);
        }
        if (activeTab === 'sale') return base.filter(p => p.discountPercent > 0);
        return base; // 'all'
    }, [activeTab, products]);

    return (
        <section id="products" className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-end">
                <div className="flex gap-6 text-sm font-semibold text-slate-400">
                    {[
                        { key: 'featured', label: 'Sản phẩm nổi bật' },
                        { key: 'sale', label: 'Đang khuyến mãi' },
                        { key: 'all', label: 'Tất cả' },
                    ].map(tab => (
                        <span
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-3 cursor-pointer transition-colors ${activeTab === tab.key ? 'text-[#1e293b] border-b-2 border-[#fbbf24]' : 'hover:text-[#1e293b]'
                                }`}
                        >
                            {tab.label}
                        </span>
                    ))}
                </div>
            </div>

            {displayProducts.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <i className="fas fa-box-open text-4xl mb-3 block"></i>
                    Không có sản phẩm nào
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayProducts.map((product) => (
                        <Link href={`/product/${product.id}`} key={product.id}>
                            <ProductCard
                                id={product.id} image={product.thumbnailUrl} category={product.categoryName}
                                title={product.name} price={product.price} oldPrice={product.originalPrice}
                                discountPercent={product.discountPercent} status={product.status}
                            />
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}