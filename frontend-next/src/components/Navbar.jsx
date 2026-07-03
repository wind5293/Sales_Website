'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';

const CATEGORY_ICONS = {
    'iPhone': 'fas fa-mobile-alt',
    'iPad': 'fas fa-tablet-alt',
    'MacBook': 'fas fa-laptop',
    'Apple Watch': 'far fa-clock',
    'AirPods': 'fas fa-headphones',
};

const USER_MENU_ITEMS = [
    { 
        id: 'profile', 
        name: 'Tài khoản của tôi', 
        icon: 'far fa-user', 
        path: '/profile' 
    },
    { 
        id: 'orders', 
        name: 'Đơn mua', 
        icon: 'fas fa-clipboard-list', 
        path: '/orders' 
    },
    { 
        id: 'notifications', 
        name: 'Thông báo', 
        icon: 'far fa-bell', 
        path: '/notifications' 
    }
];

const Navbar = ({ onNavigate, username, onLogout, onSearch, onCartClick }) => {
    const navigate = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [showCategory, setShowCategory] = useState(false); 
    const [showLocation, setShowLocation] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Hồ Chí Minh');
    const [categories, setCategories] = useState([]);

    const popupRef = useRef(null); 
    const categoryRef = useRef(null);
    const locationRef = useRef(null);

    const { totalItems, openCart, resetCart } = useCart();

    useEffect(() => {
        fetch('/api/products/category/all')
            .then(r => r.json())
            .then(data => setCategories(data.categories))
            .catch(err => console.error('Lỗi load categories:', err));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) 
                setShowPopup(false);
            if (categoryRef.current && !categoryRef.current.contains(event.target)) 
                setShowCategory(false);
            if (locationRef.current && !locationRef.current.contains(event.target)) 
                setShowLocation(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const locations = [
        "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng",
        "Cần Thơ", "Bình Dương", "Đồng Nai", "Thừa Thiên Huế", "Khánh Hòa"
    ];

    const handleHomeClick = () => {
        router.push('/');
    };

    const handleCategoryClick = (cat) => {
        router.push(`/category/${cat.id}`);
        setShowCategory(false);
    };

    const handleAccountClick = () => {
        if (username === 'Welcome') {
            router.push('/login');
        } else {
            setShowPopup(!showPopup);
            setShowCategory(false);
            setShowLocation(false);
        }
    };

    const handleUserMenuClick = (path) => {
        setShowPopup(false); // Đóng popup
        router.push(path);      // Chuyển trang
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        resetCart();
        setShowPopup(false);
        router.push('/');
        router.refresh();
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Kiểm tra nếu người dùng có nhập chữ mới cho tìm kiếm
            if (searchQuery.trim() !== '') {
                if (onSearch) onSearch(searchQuery);
                // Tùy chọn: Xóa ô tìm kiếm sau khi enter
                // setSearchQuery(''); 
            }
        }
    };

    const handleCartClick = () => {
        if (onCartClick) {
            onCartClick();
        }
    };

    return (
        <nav className="w-full font-sans bg-gradient-to-b from-[#eab308] to-[#c2410c] shadow-md">

            {/* 1. Top Bar - Thanh thông báo chạy ngang */}
            <div className="text-white text-[12px] py-1.5 hidden lg:block">
                <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between gap-2 whitespace-nowrap text-white/90">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">VAT đầy đủ</span>
                        <span className="text-white/50">•</span>
                        <span><i className="fas fa-truck mr-1.5"></i>Giao nhanh - Miễn phí vận chuyển cho đơn 300k</span>
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
                    <div className="relative hidden lg:block" ref={categoryRef}>
                        <button
                            onClick={() => {
                                setShowCategory(!showCategory);
                                setShowLocation(false);
                                setShowPopup(false);
                            }}
                            className="bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-md flex flex-row items-center gap-2 transition-colors shrink-0"
                        >
                            <i className="fas fa-th-large text-lg"></i>
                            <span className="text-sm">Danh mục</span>
                            <i className={`fas fa-chevron-down text-[10px] transition-transform ${showCategory ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* Cửa sổ Popup Danh mục */}
                        {showCategory && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-xl py-2 z-50 border border-gray-100">
                                {categories.map((cat, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleCategoryClick(cat)}
                                        className="px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-3"
                                    >
                                        <i className={`${cat.icon} w-5 text-center text-gray-400`}></i>
                                        <span className="font-medium">{cat.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nút Vị trí */}
                    <div className="relative hidden lg:block" ref={locationRef}>
                        <button
                            onClick={() => {
                                setShowLocation(!showLocation);
                                setShowCategory(false);
                                setShowPopup(false);
                            }}
                            className="bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-md flex flex-row items-center gap-2 transition-colors shrink-0"
                        >
                            <i className="fas fa-map-marker-alt text-lg"></i>
                            <span className="text-sm whitespace-nowrap">{selectedLocation}</span>
                            <i className={`fas fa-chevron-down text-[10px] transition-transform ${showLocation ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* Cửa sổ Popup Địa điểm */}
                        {showLocation && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-xl py-2 z-50 border border-gray-100 max-h-64 overflow-y-auto">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 tracking-wider">
                                    Chọn tỉnh/thành phố
                                </div>
                                {locations.map((loc, index) => (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            setSelectedLocation(loc);
                                            setShowLocation(false); 
                                        }}
                                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${selectedLocation === loc
                                                ? 'bg-amber-100 text-amber-700 font-semibold'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {loc}
                                        {selectedLocation === loc && <i className="fas fa-check float-right mt-1"></i>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                            onKeyDown={handleSearchKeyDown}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-md focus:outline-none text-sm text-gray-800 placeholder-gray-400"
                        />
                    </div>

                    {/* Khối chức năng bên phải */}
                    <div className="flex items-center gap-4 text-white shrink-0 ml-2">

                        {/* Giỏ hàng */}
                        <div 
                        onClick={openCart}
                        className="cursor-pointer hover:text-white/80 transition-colors flex items-center gap-2">
                            <span className="hidden md:block text-sm">Giỏ hàng</span>
                            <div className="relative">
                                <i className="fas fa-shopping-cart text-2xl"></i>
                                {/* Dùng màu vàng của logo #fbbf24 */}
                                <span className="absolute -top-1 -right-2 bg-[#fbbf24] text-red-700 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    { totalItems > 0 ? (totalItems > 99 ? '99+' : totalItems) : '' }
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
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md py-2 z-50 border border-gray-200">

                                    {/* Header: Tên người dùng */}
                                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{username}</p>
                                    </div>

                                    {isAdmin && (
                                        <>
                                            <div
                                                onClick={() => {
                                                    setShowPopup(false);
                                                    navigate("/admin");
                                                }}
                                                className="px-4 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-3 border-b border-amber-100"
                                            >
                                                <i className="fas fa-tachometer-alt w-4 text-center text-amber-500"></i>
                                                <span className="font-semibold">Trang quản trị</span>
                                                <i className="fas fa-arrow-right ml-auto text-[10px] text-amber-400"></i>
                                            </div>
                                        </>
                                    )}

                                    {/* Các mục Menu */}
                                    {USER_MENU_ITEMS.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleUserMenuClick(item.path)}
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-3"
                                        >
                                            <i className={`${item.icon} w-4 text-center text-gray-400`}></i>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                    ))}
                                    {/* Nút Đăng xuất */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-3 font-medium"
                                    >
                                        <i className="fas fa-sign-out-alt w-4 text-center"></i>
                                        <span>Đăng xuất</span>
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