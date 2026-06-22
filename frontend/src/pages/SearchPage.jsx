import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';

const SORT_OPTIONS = [
    { value: 'default', label: 'Mặc định' },
    { value: 'price_asc', label: 'Giá tăng dần' },
    { value: 'price_desc', label: 'Giá giảm dần' },
    { value: 'name_asc', label: 'Tên A → Z' },
];

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');
    const [filterSale, setFilterSale] = useState(false);

    useEffect(() => {
        if (!query) {
            setProducts([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const fetchSearchResults = async () => {
            try {
                const res = await axios.get(
                    `/api/products/search?q=${encodeURIComponent(query)}&limit=100`
                );

                if (!cancelled) {
                    // Backend trả về mảng sản phẩm nằm trong field "items"
                    setProducts(res.data.items || []);
                }
            } catch (err) {
                console.error("Lỗi tải kết quả tìm kiếm:", err);
                if (!cancelled) setProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchSearchResults();

        return () => {
            cancelled = true;
        };
    }, [query]);

    // Lọc + sắp xếp kết quả
    const displayProducts = [...products]
        .filter(p => filterSale ? (p.discountPercent > 0) : true)
        .sort((a, b) => {
            switch (sortBy) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                case 'name_asc': return a.name.localeCompare(b.name, 'vi');
                default: return 0;
            }
        });

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                    <span
                        onClick={() => navigate('/')}
                        className="hover:text-amber-500 cursor-pointer transition-colors"
                    >
                        Trang chủ
                    </span>
                    <i className="fas fa-chevron-right text-[10px]"></i>
                    <span className="text-slate-700 font-medium">Tìm kiếm</span>
                </nav>

                {/* Header tìm kiếm */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Kết quả tìm kiếm cho: "{query}"
                        </h1>
                        {!loading && (
                            <p className="text-sm text-slate-400 mt-1">
                                Tìm thấy {displayProducts.length} sản phẩm
                            </p>
                        )}
                    </div>

                    {/* Bộ lọc & sắp xếp */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle chỉ xem đang giảm giá */}
                        <button
                            onClick={() => setFilterSale(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-colors
                                ${filterSale
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                                }`}
                        >
                            <i className="fas fa-tag"></i>
                            Đang giảm giá
                        </button>

                        {/* Dropdown sắp xếp */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Danh sách sản phẩm */}
                {loading ? (
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
                    <div className="text-center py-24 text-slate-400">
                        <i className="fas fa-search text-5xl mb-4 block text-slate-300"></i>
                        <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
                        <p className="text-sm mt-1">Rất tiếc, chúng tôi không tìm thấy kết quả nào phù hợp với từ khóa "{query}"</p>
                        <button
                            onClick={() => { setFilterSale(false); setSortBy('default'); navigate('/'); }}
                            className="mt-4 px-6 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-full text-sm transition-colors"
                        >
                            Quay lại trang chủ
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {displayProducts.map(product => (
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
            </div>
        </div>
    );
};

export default SearchPage;