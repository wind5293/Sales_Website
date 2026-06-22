import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';

// Format giá dùng trong banner (dùng chung)
const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const Homepage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('featured');
    const [categories, setCategories] = useState([]);
    const [heroProduct, setHeroProduct] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Lấy sản phẩm (mặc định status=active, limit=8)
                const res = await axios.get('http://127.0.0.1:8000/api/products?limit=8');
                const allProducts = res.data.products;
                setProducts(allProducts);

                // Lấy sản phẩm đầu tiên làm hero banner
                if (allProducts.length > 0) {
                    setHeroProduct(allProducts[0]);
                }

                // Lấy danh mục
                const catRes = await axios.get('http://127.0.0.1:8000/api/products/category/all');
                setCategories(catRes.data.categories);

            } catch (err) {
                console.error("Lỗi khi tải dữ liệu:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Lọc sản phẩm theo tab đang chọn
    const getFilteredProducts = () => {
        switch (activeTab) {
            case 'featured':
                return products.filter(p => p.isFeatured);
            case 'sale':
                return products.filter(p => p.originalPrice && p.originalPrice > p.price);
            case 'all':
            default:
                return products;
        }
    };

    const filteredProducts = getFilteredProducts();
    // Nếu tab không có sản phẩm nào, hiển thị tất cả
    const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">

                {/* SECTION 1: HERO BANNER */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Banner chính */}
                    <div className="lg:col-span-2 rounded-md relative overflow-hidden h-[460px] bg-slate-900 text-white flex items-center px-12 shadow-sm group">
                        <div
                            className="absolute inset-0 z-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700"
                            style={{
                                backgroundImage: heroProduct?.thumbnailUrl
                                    ? `url('${heroProduct.thumbnailUrl}')`
                                    : "url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200')"
                            }}
                        />
                        <div className="relative z-10 max-w-md">
                            <span className="bg-[#fbbf24] text-[#1e293b] font-bold text-xs px-3 py-1 rounded mb-4 inline-block uppercase tracking-wider">
                                {heroProduct?.categoryName || 'Sản phẩm nổi bật'}
                            </span>
                            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                                Mua sắm những gì{' '}
                                <span className="text-[#fbbf24]">bạn thích.</span>
                            </h1>
                            <p className="text-slate-300 text-sm mb-2">
                                {heroProduct?.name || 'Khám phá các sản phẩm Apple chính hãng'}
                            </p>
                            {heroProduct?.price && (
                                <p className="text-[#fbbf24] font-bold text-xl mb-4">
                                    {formatPrice(heroProduct.price)}
                                </p>
                            )}
                            <a
                                href="#products"
                                className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1e293b] font-bold text-sm px-6 py-3 rounded-full inline-block shadow-lg transition-transform transform hover:-translate-y-0.5"
                            >
                                MUA NGAY
                            </a>
                        </div>
                    </div>

                    {/* Banner phụ bên phải — lấy từ categories */}
                    <div className="flex flex-col gap-6">
                        <div className="group flex-1 rounded-md relative overflow-hidden p-6 text-white flex items-center bg-[#1e293b]">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"
                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600')" }}
                            />
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-1">
                                    {categories[0]?.name || 'iPhone'}
                                </h3>
                                <p className="text-xs text-amber-400 font-semibold mb-3">Giảm mạnh đến 20%</p>
                                <a href="#products" className="text-xs font-bold border-b border-white pb-1 hover:text-[#fbbf24] hover:border-[#fbbf24]">
                                    Xem ngay
                                </a>
                            </div>
                        </div>
                        <div className="group flex-1 rounded-md relative overflow-hidden p-6 text-[#1e293b] flex items-center bg-[#fbbf24]/10 border border-[#fbbf24]/30">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-700"
                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600')" }}
                            />
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-1">
                                    {categories[1]?.name || 'MacBook'}
                                </h3>
                                <p className="text-xs text-slate-600 mb-3">Hỗ trợ trả góp 0% lãi suất</p>
                                <a href="#products" className="text-xs font-bold border-b border-[#1e293b] pb-1 hover:text-[#f59e0b]">
                                    Khám phá
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: FLASH SALE — lấy sản phẩm có giảm giá nhiều nhất */}
                {(() => {
                    const saleProduct = products
                        .filter(p => p.discountPercent)
                        .sort((a, b) => b.discountPercent - a.discountPercent)[0];

                    if (!saleProduct) return null;

                    return (
                        <section className="bg-white border border-slate-200 rounded-md p-6 lg:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                            <div className="flex-1 space-y-4">
                                <div className="text-yellow-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                    Ưu đãi giới hạn độc quyền
                                </div>
                                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
                                    {saleProduct.name}
                                </h2>
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-3xl font-extrabold text-yellow-500">
                                        {formatPrice(saleProduct.price)}
                                    </span>
                                    {saleProduct.originalPrice && (
                                        <>
                                            <span className="text-base text-slate-400 line-through">
                                                {formatPrice(saleProduct.originalPrice)}
                                            </span>
                                            <span className="text-xs bg-yellow-100 text-yellow-600 font-bold px-2 py-0.5 rounded">
                                                Tiết kiệm {formatPrice(saleProduct.originalPrice - saleProduct.price)}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500">{saleProduct.shortDescription}</p>
                            </div>
                            <div className="w-full md:w-1/2 max-h-[300px] flex justify-center bg-slate-50 rounded-md p-4 overflow-hidden">
                                {saleProduct.thumbnailUrl ? (
                                    <img
                                        src={saleProduct.thumbnailUrl}
                                        alt={saleProduct.name}
                                        className="max-h-full object-contain hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center text-slate-300 text-6xl">
                                        <i className="fas fa-image"></i>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })()}

                {/* SECTION 3: DANH SÁCH SẢN PHẨM */}
                <section id="products" className="space-y-6">
                    <div className="border-b border-slate-200 pb-3 flex justify-between items-end">
                        <div className="flex gap-6 text-sm font-semibold text-slate-400">
                            {[
                                { key: 'featured', label: 'Sản phẩm nổi bật' },
                                { key: 'sale', label: 'Đang khuyến mãi' },
                                { key: 'all', label: 'Tất cả' },
                            ].map(tab => (
                                <span
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`pb-3 cursor-pointer transition-colors ${activeTab === tab.key
                                        ? 'text-[#1e293b] border-b-2 border-[#fbbf24]'
                                        : 'hover:text-[#1e293b]'
                                        }`}
                                >
                                    {tab.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        /* Skeleton loading */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-md p-4 animate-pulse">
                                    <div className="h-44 bg-slate-200 rounded-lg mb-4"></div>
                                    <div className="h-3 bg-slate-200 rounded mb-2 w-1/3"></div>
                                    <div className="h-4 bg-slate-200 rounded mb-1"></div>
                                    <div className="h-4 bg-slate-200 rounded mb-3 w-2/3"></div>
                                    <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : displayProducts.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <i className="fas fa-box-open text-4xl mb-3 block"></i>
                            Không có sản phẩm nào
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayProducts.map((product) => (
                                <Link to={`/product/${product.id}`} key={product.id}>
                                    <ProductCard
                                        image={product.thumbnailUrl}
                                        category={product.categoryName}
                                        title={product.name}
                                        price={product.price}
                                        oldPrice={product.originalPrice}
                                        discountPercent={product.discountPercent}
                                        status={product.status}
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
};

export default Homepage;