// src/app/page.jsx
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import ProductTabs from '@/components/ProductTabs';
import { listProducts, getNewProducts, listCategories } from '@/lib/services/products';

export const metadata = { title: 'Trang chủ | Electro' };

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

export default async function Homepage() {
    // 3 request chạy song song, thay cho 3 lệnh axios.get() nối tiếp trong useEffect cũ
    const [productsRes, catRes, newRes] = await Promise.all([
        listProducts({ limit: 100 }),
        listCategories(),
        getNewProducts({ limit: 8 }),
    ]);

    const products = productsRes.products;
    const categories = catRes.categories;
    const newProducts = newRes.products;

    const heroProduct =
        [...products].filter(p => p.discountPercent > 0)
            .sort((a, b) => b.discountPercent - a.discountPercent)[0] || products[0];

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">

                {/* SECTION 1: HERO BANNER */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-md relative overflow-hidden h-[460px] bg-slate-900 text-white flex items-center px-12 shadow-sm group">
                        <div
                            className="absolute inset-0 z-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700"
                            style={{ backgroundImage: `url('${heroProduct?.thumbnailUrl}')` }}
                        />
                        <div className="relative z-10 max-w-md">
                            <span className="bg-[#fbbf24] text-[#1e293b] font-bold text-xs px-3 py-1 rounded mb-4 inline-block uppercase tracking-wider">
                                {heroProduct?.categoryName || 'Sản phẩm nổi bật'}
                            </span>
                            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                                Mua sắm những gì <span className="text-[#fbbf24]">bạn thích.</span>
                            </h1>
                            <p className="text-slate-300 text-sm mb-2">{heroProduct?.name}</p>
                            {heroProduct?.price && (
                                <p className="text-[#fbbf24] font-bold text-xl mb-4">{formatPrice(heroProduct.price)}</p>
                            )}
                            <a href="#products" className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1e293b] font-bold text-sm px-6 py-3 rounded-full inline-block shadow-lg">
                                MUA NGAY
                            </a>
                        </div>
                    </div>
                    {/* Banner phụ */}
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
                                <a href="/search?category=2eont9yiHhkiM6MCbJcn" className="text-xs font-bold border-b border-white pb-1 hover:text-[#fbbf24] hover:border-[#fbbf24]">
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
                                <a href="/search?category=9wv419GZPDpji5ejrzSV" className="text-xs font-bold border-b border-[#1e293b] pb-1 hover:text-[#f59e0b]">
                                    Khám phá
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2.5: SẢN PHẨM MỚI  */}
                {newProducts.length > 0 && (
                    <section className="space-y-6">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-end">
                            <h2 className="text-lg font-bold text-slate-800">Sản phẩm mới</h2>
                            <Link href="/search" className="text-xs text-amber-500 font-semibold hover:underline">
                                Xem tất cả
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {newProducts.map((product) => (
                                <Link href={`/product/${product.id}`} key={product.id}>
                                    <ProductCard
                                        id={product.id} image={product.thumbnailUrl} category={product.categoryName}
                                        title={product.name} price={product.price} oldPrice={product.originalPrice}
                                        discountPercent={product.discountPercent} status={product.status}
                                    />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 3: phần có tab lọc + state → đẩy toàn bộ xuống Client Component,
            truyền `products` xuống làm props thay vì để nó tự fetch lại */}
                <ProductTabs products={products} />

            </main>
        </div>
    );
}