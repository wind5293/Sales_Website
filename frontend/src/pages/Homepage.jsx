import React from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';

const Homepage = () => {
    // Dữ liệu mẫu mô phỏng từ hình ảnh thiết kế của bạn
    const products = [
        { id: 1, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400', category: 'Headphones', title: 'Wireless Audio System Multiroom 360', price: '2299.00', oldPrice: '2500.00' },
        { id: 2, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400', category: 'Cameras', title: 'Purple NX Mini F1 Smart Digital Camera', price: '559.00' },
        { id: 3, image: 'https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?q=80&w=400', category: 'Game Consoles', title: 'Console Controller Wireless + USB 3.0 Cable', price: '90.00', oldPrice: '99.00' },
        { id: 4, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=400', category: 'Smartphones', title: 'Smartphone 6S 32GB LTE Dual SIM', price: '1100.00' }
    ];

    return (
        <div className="bg-slate-50 min-height-screen font-sans">

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">

                {/* SECTION 1: HERO BANNER DESIGN (Layout tập trung hình ảnh lớn) */}
                <section
                    className="grid grid-columns-1 
                    lg:grid-cols-3 
                    gap-6"
                >
                    {/* Banner chính lớn bên trái */}
                    <div className="lg:col-span-2 rounded-md relative overflow-hidden h-[460px] bg-slate-900 text-white flex items-center px-12 shadow-sm group">
                        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-60  group-hover:scale-102 transition-transform duration-700"
                             style={{ backgroundImage: "url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200')" }}></div>
                        <div className="relative z-10 max-w-md">
                            <span className="bg-[#fbbf24] text-[#1e293b] font-bold text-xs px-3 py-1 rounded mb-4 inline-block uppercase tracking-wider">
                                Ưu đãi tuần này
                            </span>
                            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                                Shop to get what 
                                <span className="text-[#fbbf24]">you love.</span>
                            </h1>
                            <p className="text-slate-300 text-sm mb-6">
                                Trải nghiệm các dòng máy tính xách tay thế hệ mới mang lại hiệu năng đỉnh cao cho công việc.
                            </p>
                            <a href="#shop" className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1e293b] font-bold text-sm px-6 py-3 rounded-full inline-block shadow-lg transition-transform transform hover:-translate-y-0.5">
                                MUA NGAY
                            </a>
                        </div>
                    </div>

                    {/* Cặp Banner phụ bên phải */}
                    <div className="flex flex-col gap-6">
                        <div className="flex-1 rounded-md relative overflow-hidden p-6 text-white flex items-center bg-[#1e293b]">
                            <div className="absolute inset-0 bg-cover bg-center opacity-40" 
                                 style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600')" }}>
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-1">Game Consoles</h3>
                                <p className="text-xs text-amber-400 font-semibold mb-3">Giảm mạnh đến 20%</p>
                                <a href="#shop" className="text-xs font-bold border-b border-white pb-1 hover:text-[#fbbf24] hover:border-[#fbbf24]">
                                    Xem ngay
                                </a>
                            </div>
                        </div>
                        <div className="flex-1 rounded-2xl relative overflow-hidden p-6 text-[#1e293b] flex items-center bg-[#fbbf24]/10 border border-[#fbbf24]/30">
                            <div className="absolute inset-0 bg-cover bg-center opacity-20" 
                                 style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600')" }}>
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-1">Smartphones 6S</h3>
                                <p className="text-xs text-slate-600 mb-3">Hỗ trợ trả góp 0% lãi suất</p>
                                <a href="#shop" className="text-xs font-bold border-b border-[#1e293b] pb-1 hover:text-[#f59e0b]">Khám phá</a>
                            </div>
                        </div>
                    </div>
                </section>


                {/* SECTION 2: FLASH SALE COUNTDOWN (Ưu đãi đặc biệt) */}
                <section className="bg-white border border-slate-200 rounded-md p-6 lg:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                    {/* Cột chữ và Đồng hồ đếm ngược */}
                    <div className="flex-1 space-y-4">
                        <div className="text-yellow-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Ưu đãi giới hạn độc quyền
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Game Console Controller + USB Cable</h2>

                        {/* Cấu trúc các khối đếm ngược thời gian từ layout ảnh */}
                        <div className="flex gap-3 py-2">
                            <div className="bg-slate-100 rounded-md p-3 text-center min-w-[65px]">
                                <div className="font-bold text-xl text-slate-800">08</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase">Giờ</div>
                            </div>
                            <div className="bg-slate-100 rounded-md p-3 text-center min-w-[65px]">
                                <div className="font-bold text-xl text-slate-800">42</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase">Phút</div>
                            </div>
                            <div className="bg-slate-100 rounded-md p-3 text-center min-w-[65px]">
                                <div className="font-bold text-xl text-slate-800">19</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase">Giây</div>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-extrabold text-yellow-500">$90.00</span>
                            <span className="text-base text-slate-400 line-through">$99.00</span>
                            <span className="text-xs bg-yellow-100 text-yellow-600 font-bold px-2 py-0.5 rounded">Tiết kiệm $9.00</span>
                        </div>
                    </div>

                    {/* Cột ảnh lớn của sản phẩm Flash Sale */}
                    <div className="w-full md:w-1/2 max-h-[300px] flex justify-center bg-slate-50 rounded-md p-4 overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?q=80&w=600"
                            alt="Flash Sale Product"
                            className="max-h-full object-contain hover:scale-102 transition-transform duration-300"
                        />
                    </div>
                </section>

                {/* SECTION 3: PRODUCT GRID (Lưới danh sách sản phẩm) */}
                <section className="space-y-6">
                    <div className="border-b border-slate-200 pb-3 flex justify-between items-end">
                        <div className="flex gap-6 text-sm font-semibold text-slate-400">
                            <span className="text-[#1e293b] border-b-2 border-[#fbbf24] pb-3 cursor-pointer">Sản phẩm nổi bật</span>
                            <span className="hover:text-[#1e293b] pb-3 cursor-pointer transition-colors">Đang khuyến mãi</span>
                            <span className="hover:text-[#1e293b] pb-3 cursor-pointer transition-colors">Bán chạy nhất</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                image={product.image}
                                category={product.category}
                                title={product.title}
                                price={product.price}
                                oldPrice={product.oldPrice}
                            />
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
};

export default Homepage;