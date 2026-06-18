import React, { useState, useEffect, useRef } from 'react';

const Navbar = ({ onNavigate, username, onLogout }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleHomeClick = () => {
        if (onNavigate) onNavigate('home');
    }

    const handleAccountClick = () => {
        if (username === 'Welcome') {
            if (onNavigate) onNavigate('login');
        } else {
            // if (onNavigate) onNavigate('profile');
            setShowPopup(!showPopup);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        localStorage.removeItem('auth_token'); 
        localStorage.removeItem('user_data');

        setShowPopup(false);
        if (onLogout) onLogout();
    };

    return (
        <nav className="w-full font-sans bg-gradient-to-b from-[#eab308] to-[#c2410c] shadow-md">

            {/* 1. Top Bar - Thanh thông báo chạy ngang */}
            <div className="text-white text-[12px] py-1.5 hidden lg:block">
                <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between gap-2 whitespace-nowrap text-white/90">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">VAT đầy đủ</span>
                        <span className="text-white/50">•</span>
                        <span><i className="fas fa-truck mr-1.5"></i>Giao nhanh - Miễn phí cho đơn 300k</span>
                        <span className="text-white/50">•</span>
                        <span><i className="fas fa-sync-alt mr-1.5"></i>Thu cũ giá ngon - Lên đời tiết kiệm</span>
                        <span className="text-white/50">•</span>
                        <span><i className="fas fa-award mr-1.5"></i>Sản phẩm Chính hãng - Xuất VAT</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white/50">|</span>
                        <a href="#store" className="hover:text-white transition-colors"><i className="fas fa-store mr-1.5"></i>Cửa hàng gần bạn</a>
                        <span className="text-white/50">|</span>
                        <a href="#tracking" className="hover:text-white transition-colors"><i className="fas fa-file-invoice mr-1.5"></i>Tra cứu đơn hàng</a>
                        <span className="text-white/50">|</span>
                        <a href="tel:18002097" className="hover:text-white transition-colors font-semibold"><i className="fas fa-phone-alt mr-1.5"></i>1800 2097</a>
                    </div>
                </div>
            </div>

            {/* 2. Main Header Bar */}
            <div className="w-full">
                <div className="max-w-[1200px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

                    {/* Thương hiệu / Logo */}
                    <div 
                    onClick={handleHomeClick}
                    className="text-3xl font-bold text-white tracking-tight cursor-pointer mr-2 shrink-0"
                    >
                        electro<span className="text-[#fbbf24]">.</span>
                    </div>

                    {/* Nút Danh mục */}
                    <button className="hidden lg:flex bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-md flex-row items-center gap-2 transition-colors shrink-0">
                        <i className="fas fa-th-large text-lg"></i>
                        <span className="text-sm">Danh mục</span>
                        <i className="fas fa-chevron-down text-[10px]"></i>
                    </button>

                    {/* Nút Vị trí */}
                    <button className="hidden lg:flex bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-md flex-row items-center gap-2 transition-colors shrink-0">
                        <i className="fas fa-map-marker-alt text-lg"></i>
                        <span className="text-sm">Hồ Chí Minh</span>
                        <i className="fas fa-chevron-down text-[10px]"></i>
                    </button>

                    {/* Thanh tìm kiếm trung tâm */}
                    <div className="flex-1 max-w-[500px] relative shrink w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="fas fa-search text-gray-500 text-lg"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-md focus:outline-none text-sm text-gray-800 placeholder-gray-400"
                        />
                    </div>

                    {/* Khối chức năng bên phải */}
                    <div className="flex items-center gap-4 text-white shrink-0 ml-2">

                        {/* Giỏ hàng */}
                        <div className="cursor-pointer hover:text-white/80 transition-colors flex items-center gap-2">
                            <span className="hidden md:block text-sm">Giỏ hàng</span>
                            <div className="relative">
                                <i className="fas fa-shopping-cart text-2xl"></i>
                                {/* Dùng màu vàng của logo #fbbf24 */}
                                <span className="absolute -top-1 -right-2 bg-[#fbbf24] text-red-700 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    3
                                </span>
                            </div>
                        </div>

                        {/* Tài khoản */}
                        <div className="relative" ref={popupRef}>
                            <div
                                onClick={handleAccountClick}
                                className="cursor-pointer bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                            >
                                <span className="hidden md:block text-sm">{username}</span>
                                <i className="far fa-user-circle text-2xl"></i>
                            </div>

                            {showPopup && username !== 'Welcome' && (
                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2 font-medium"
                                    >
                                        <i className="fas fa-sign-out-alt"></i> Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;