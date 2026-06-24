import React from 'react';
import { Link } from 'react-router-dom';

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'MoMo', 'ZaloPay', 'VNPay'];

const POLICY_LINKS = [
    'Mua hàng và thanh toán Online',
    'Mua hàng trả góp',
    'Chính sách giao hàng',
    'Chính sách đổi trả',
    'Chính sách bảo hành',
    'Quy định về bảo mật dữ liệu',
];

const SERVICE_LINKS = [
    'Khách hàng doanh nghiệp (B2B)',
    'Ưu đãi thanh toán',
    'Quy chế hoạt động',
    'Chính sách bảo mật thông tin cá nhân',
    'Liên hệ hợp tác kinh doanh',
    'Tuyển dụng',
];

const SOCIAL_LINKS = [
    { icon: 'fab fa-facebook-f', href: 'https://www.facebook.com/' },
    { icon: 'fab fa-youtube', href: 'https://www.youtube.com/' },
    { icon: 'fab fa-instagram', href: 'https://www.instagram.com/' },
    { icon: 'fab fa-tiktok', href: 'https://www.tiktok.com/' },
];

const Footer = () => {
    return (
        <footer className="bg-slate-900 text-slate-300 font-sans">
            <div className="max-w-[1200px] mx-auto px-4 pt-12 pb-6">

                {/* Khối chính: 4 cột */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

                    {/* Cột 1: Hotline + thanh toán */}
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Tổng đài hỗ trợ
                        </h4>
                        <div className="space-y-2 text-sm">
                            <p>
                                Mua hàng - bảo hành{' '}
                                <a href="tel:18002097" className="text-[#fbbf24] font-semibold hover:underline">
                                    1800 2097
                                </a>
                                <span className="text-slate-500"> (7h30 - 22h00)</span>
                            </p>
                            <p>
                                Khiếu nại{' '}
                                <a href="tel:18002063" className="text-[#fbbf24] font-semibold hover:underline">
                                    1800 2063
                                </a>
                                <span className="text-slate-500"> (8h00 - 21h30)</span>
                            </p>
                        </div>

                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mt-6 mb-3">
                            Phương thức thanh toán
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {PAYMENT_METHODS.map((method) => (
                                <span
                                    key={method}
                                    className="bg-white/10 text-slate-200 text-[11px] font-medium px-2.5 py-1 rounded border border-white/10 border-slate-100"
                                >
                                    {method}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Cột 2: Chính sách */}
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Thông tin về chính sách
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            {POLICY_LINKS.map((label) => (
                                <li key={label}>
                                    <a href="#" className="hover:text-[#fbbf24] transition-colors">
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Cột 3: Dịch vụ */}
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Dịch vụ và thông tin khác
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            {SERVICE_LINKS.map((label) => (
                                <li key={label}>
                                    <a href="#" className="hover:text-[#fbbf24] transition-colors">
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Cột 4: Kết nối + đăng ký nhận tin */}
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Kết nối với chúng tôi
                        </h4>
                        <div className="flex gap-3 mb-6">
                            {SOCIAL_LINKS.map(({ icon, href }) => (
                                <a
                                    key={icon}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#fbbf24] hover:text-slate-900 transition-colors"
                                >
                                    <i className={icon}></i>
                                </a>
                            ))}
                        </div>

                        <p className="text-xs text-slate-400 mb-3">
                            Đăng ký nhận voucher 10% cho đơn hàng đầu tiên
                        </p>
                        <form
                            onSubmit={(e) => e.preventDefault()}
                            className="flex"
                        >
                            <input
                                type="email"
                                placeholder="Nhập email của bạn"
                                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white/10 border border-white/10 rounded-l-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <button
                                type="submit"
                                className="bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 font-semibold text-sm px-4 py-2 rounded-r-md transition-colors shrink-0"
                            >
                                Đăng ký
                            </button>
                        </form>
                    </div>
                </div>

                {/* Link danh mục nhanh */}
                <div className="border-t border-white/10 mt-10 pt-6 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
                    {['iPhone', 'iPad', 'MacBook', 'Apple Watch', 'AirPods', 'Phụ kiện'].map((cat, i, arr) => (
                        <React.Fragment key={cat}>
                            <Link to="/" className="hover:text-[#fbbf24] transition-colors">{cat}</Link>
                            {i < arr.length - 1 && <span className="text-slate-700">|</span>}
                        </React.Fragment>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/10 mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="text-xl font-bold text-white tracking-tight">
                        electro<span className="text-[#fbbf24]">.</span>
                    </div>
                    <p>© {new Date().getFullYear()} Electro Store. Bản quyền thuộc về chúng tôi.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;