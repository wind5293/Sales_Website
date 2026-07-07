'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

const LIMIT = 20;

const SORT_OPTIONS = [
    { value: 'default', label: 'Mặc định' },
    { value: 'price_asc', label: 'Giá tăng dần' },
    { value: 'price_desc', label: 'Giá giảm dần' },
    { value: 'name_asc', label: 'Tên A → Z' },
];

const PRICE_RANGES = [
    { label: 'Tất cả', min: null, max: null },
    { label: 'Dưới 1tr', min: null, max: 1000000 },
    { label: '1tr – 5tr', min: 1000000, max: 5000000 },
    { label: '5tr – 20tr', min: 5000000, max: 20000000 },
    { label: 'Trên 20tr', min: 20000000, max: null },
];

const RATING_OPTIONS = [
    { label: 'Tất cả', value: null },
    { label: '4★ trở lên', value: 4 },
    { label: '3★ trở lên', value: 3 },
];

const DEFAULT_FILTERS = {
    priceRange: 0,
    ratingMin: null,
    inStock: null,
    saleOnly: false,
};

const SkeletonCard = () => (
    <div className="bg-white border border-slate-200 rounded-sm p-4 animate-pulse">
        <div className="h-44 bg-slate-200 mb-4" />
        <div className="h-3 bg-slate-200 mb-2 w-1/3" />
        <div className="h-4 bg-slate-200 mb-1" />
        <div className="h-4 bg-slate-200 mb-3 w-2/3" />
        <div className="h-5 bg-slate-200 w-1/2" />
    </div>
);

const FilterSection = ({ title, children }) => (
    <div className="border-b border-slate-100 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
        {children}
    </div>
);

const SearchResults = ({ query, categoryId, initialProducts, initialTotal, initialCategoryName }) => {
    const router = useRouter();

    const [products, setProducts] = useState(initialProducts);
    const [total, setTotal] = useState(initialTotal);
    const [skip, setSkip] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [categoryName, setCategoryName] = useState(initialCategoryName);
    const [sortBy, setSortBy] = useState('default');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const filtersRef = useRef(filters);
    const sortByRef = useRef(sortBy);
    filtersRef.current = filters;
    sortByRef.current = sortBy;

    // Bỏ qua lần chạy đầu tiên: dữ liệu tab mặc định đã được Server Component fetch sẵn
    const isFirstRun = useRef(true);

    const activeFilterCount = [
        filters.priceRange !== 0,
        filters.ratingMin !== null,
        filters.inStock !== null,
        filters.saleOnly,
    ].filter(Boolean).length;

    const hasMore = products.length < total;

    const fetchResults = useCallback(async (currentSkip, isReset = false) => {
        const f = filtersRef.current;
        const sort = sortByRef.current;

        if (!query && !categoryId) {
            setProducts([]);
            setTotal(0);
            setLoading(false);
            return;
        }

        isReset ? setLoading(true) : setLoadingMore(true);

        try {
            const range = PRICE_RANGES[f.priceRange];
            const params = new URLSearchParams();

            if (query) params.set('q', query);
            if (categoryId) params.set('categoryId', categoryId);
            params.set('limit', LIMIT);
            params.set('skip', currentSkip);

            if (range.min !== null) params.set('price_min', range.min);
            if (range.max !== null) params.set('price_max', range.max);
            if (f.ratingMin !== null) params.set('rating_min', f.ratingMin);
            if (f.inStock !== null) params.set('in_stock', f.inStock);

            const hasAdvancedFilter =
                f.priceRange !== 0 || f.ratingMin !== null || f.inStock !== null;

            let items = [];
            let serverTotal = 0;

            if (hasAdvancedFilter) {
                // Giữ nguyên logic gốc (xem ghi chú về khả năng đây là bug)
                if (query) params.set('category', categoryId);
                const res = await fetch(`/api/products/filter?${params.toString()}`);
                const data = await res.json();
                items = data.items || [];
                serverTotal = data.total ?? items.length;
            } else {
                const res = await fetch(`/api/products/search?${params.toString()}`);
                const data = await res.json();
                items = data.items || [];
                serverTotal = data.total ?? items.length;
            }

            if (f.saleOnly) {
                items = items.filter(p => p.discountPercent > 0);
            }

            items = [...items].sort((a, b) => {
                switch (sort) {
                    case 'price_asc': return a.price - b.price;
                    case 'price_desc': return b.price - a.price;
                    case 'name_asc': return a.name.localeCompare(b.name, 'vi');
                    default: return 0;
                }
            });

            if (isReset) {
                setProducts(items);
            } else {
                setProducts(prev => [...prev, ...items]);
            }

            setTotal(serverTotal);

            if (categoryId && items.length > 0 && !categoryName) {
                setCategoryName(items[0].categoryName || categoryId);
            }

        } catch (err) {
            console.error('Lỗi tải kết quả:', err);
            if (isReset) {
                setProducts([]);
                setTotal(0);
            }
        } finally {
            isReset ? setLoading(false) : setLoadingMore(false);
        }
    }, [query, categoryId, categoryName]);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        setProducts([]);
        setSkip(0);
        setCategoryName('');
        fetchResults(0, true);
    }, [query, categoryId, filters, sortBy]);

    const handleLoadMore = () => {
        const nextSkip = skip + LIMIT;
        setSkip(nextSkip);
        fetchResults(nextSkip, false);
    };

    const updateFilter = (key, value) =>
        setFilters(prev => ({ ...prev, [key]: value }));

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setSortBy('default');
    };

    const pageTitle = categoryId
        ? (categoryName || 'Đang tải...')
        : query
            ? <>Kết quả cho: <span className="text-amber-500">"{query}"</span></>
            : 'Tất cả sản phẩm';

    const breadcrumbLabel = categoryId ? (categoryName || 'Danh mục') : 'Tìm kiếm';

    const SidebarContent = () => (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-slate-800 text-base">Bộ lọc</span>
                {activeFilterCount > 0 && (
                    <button
                        onClick={resetFilters}
                        className="text-xs text-amber-500 hover:text-amber-600 font-semibold"
                    >
                        Xóa tất cả ({activeFilterCount})
                    </button>
                )}
            </div>

            <FilterSection title="Khoảng giá">
                <div className="flex flex-col gap-2">
                    {PRICE_RANGES.map((range, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="price_range"
                                checked={filters.priceRange === idx}
                                onChange={() => updateFilter('priceRange', idx)}
                                className="accent-amber-400"
                            />
                            <span className={`text-sm transition-colors ${filters.priceRange === idx ? 'text-amber-600 font-semibold' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                {range.label}
                            </span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Đánh giá">
                <div className="flex flex-col gap-2">
                    {RATING_OPTIONS.map(opt => (
                        <label key={opt.label} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="rating"
                                checked={filters.ratingMin === opt.value}
                                onChange={() => updateFilter('ratingMin', opt.value)}
                                className="accent-amber-400"
                            />
                            <span className={`text-sm transition-colors ${filters.ratingMin === opt.value ? 'text-amber-600 font-semibold' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                {opt.value
                                    ? <>{Array.from({ length: opt.value }).map((_, i) => <span key={i} className="text-amber-400">★</span>)} trở lên</>
                                    : opt.label
                                }
                            </span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Tình trạng">
                <div className="flex flex-col gap-2">
                    {[
                        { label: 'Tất cả', value: null },
                        { label: 'Còn hàng', value: true },
                        { label: 'Hết hàng', value: false },
                    ].map(opt => (
                        <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="in_stock"
                                checked={filters.inStock === opt.value}
                                onChange={() => updateFilter('inStock', opt.value)}
                                className="accent-amber-400"
                            />
                            <span className={`text-sm transition-colors ${filters.inStock === opt.value ? 'text-amber-600 font-semibold' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Khuyến mãi">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div
                        onClick={() => updateFilter('saleOnly', !filters.saleOnly)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${filters.saleOnly ? 'bg-red-400' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.saleOnly ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm text-slate-600">Chỉ xem đang giảm giá</span>
                </label>
            </FilterSection>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto px-4 py-8">

                <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                    <span onClick={() => router.push('/')} className="hover:text-amber-500 cursor-pointer transition-colors">
                        Trang chủ
                    </span>
                    <i className="fas fa-chevron-right text-[10px]" />
                    <span className="text-slate-700 font-medium">{breadcrumbLabel}</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                        {!loading && (
                            <p className="text-sm text-slate-400 mt-1">
                                {total} sản phẩm
                                {activeFilterCount > 0 && ` · ${activeFilterCount} bộ lọc đang áp dụng`}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-amber-300 transition-colors"
                        >
                            <i className="fas fa-sliders-h" />
                            Bộ lọc
                            {activeFilterCount > 0 && (
                                <span className="bg-amber-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-6 items-start">

                    <aside className="hidden lg:block w-56 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-5 sticky top-6">
                        <SidebarContent />
                    </aside>

                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-24 text-slate-400">
                                <i className="fas fa-search text-5xl mb-4 block text-slate-300" />
                                <p className="text-lg font-medium text-slate-600">Không tìm thấy sản phẩm</p>
                                <p className="text-sm mt-1">
                                    {activeFilterCount > 0
                                        ? 'Thử xóa bớt bộ lọc để xem thêm kết quả.'
                                        : query
                                            ? `Không có kết quả cho "${query}".`
                                            : 'Danh mục này chưa có sản phẩm.'
                                    }
                                </p>
                                <div className="flex justify-center gap-3 mt-5">
                                    {activeFilterCount > 0 && (
                                        <button
                                            onClick={resetFilters}
                                            className="px-5 py-2 text-amber-500 hover:bg-amber-50 font-semibold text-sm transition-colors"
                                        >
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { resetFilters(); router.push('/'); }}
                                        className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold text-sm transition-colors"
                                    >
                                        Về trang chủ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {products.map(product => (
                                        <Link href={`/product/${product.id}`} key={product.id}>
                                            <ProductCard
                                                id={product.id}
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

                                {hasMore && (
                                    <div className="mt-8 flex flex-col items-center gap-2">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-8 py-3 bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-600 text-slate-700 font-semibold text-sm rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {loadingMore
                                                ? <><i className="fas fa-spinner fa-spin" /> Đang tải...</>
                                                : <><i className="fas fa-chevron-down" /> Xem thêm {Math.min(LIMIT, total - products.length)} sản phẩm</>
                                            }
                                        </button>
                                        <p className="text-xs text-slate-400">
                                            Đang hiển thị {products.length} / {total} sản phẩm
                                        </p>
                                    </div>
                                )}

                                {!hasMore && total > LIMIT && (
                                    <p className="mt-8 text-center text-xs text-slate-400">
                                        Đã hiển thị tất cả {total} sản phẩm
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="relative ml-auto w-72 max-w-full h-full bg-white shadow-xl p-6 overflow-y-auto">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl"
                        >
                            <i className="fas fa-times" />
                        </button>
                        <SidebarContent />
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="mt-6 w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-xs text-sm transition-colors"
                        >
                            Xem {total} kết quả
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchResults;