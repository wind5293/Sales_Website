import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const API = 'http://127.0.0.1:8000';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, totalItems, totalPrice, fetchCart } = useCart();

    const [form, setForm] = useState({
        shippingAddress: '',
        phone: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null); // null | { orderId, totalPrice }

    const validate = () => {
        const e = {};
        if (!form.shippingAddress.trim()) e.shippingAddress = 'Vui lòng nhập địa chỉ giao hàng';
        if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
        else if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.trim())) e.phone = 'Số điện thoại không hợp lệ';
        return e;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }

        const token = localStorage.getItem('auth_token');
        if (!token) { navigate('/login'); return; }

        setLoading(true);
        try {
            const res = await axios.post(
                `${API}/api/orders`,
                { shippingAddress: form.shippingAddress.trim(), phone: form.phone.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOrderSuccess({ orderId: res.data.orderId, totalPrice: res.data.totalPrice });
            await fetchCart(); // làm mới giỏ (đã bị xóa phía server)
        } catch (err) {
            const msg = err.response?.data?.detail || 'Đặt hàng thất bại. Vui lòng thử lại.';
            setErrors({ submit: msg });
        } finally {
            setLoading(false);
        }
    };

    // ── Màn hình thành công ────────────────────────────────────────────────
    if (orderSuccess) {
        return (
            <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm max-w-md w-full p-8 text-center">
                    {/* Icon check */}
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <i className="fas fa-check-circle text-4xl text-green-500"></i>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Đặt hàng thành công!</h1>
                    <p className="text-slate-500 text-sm mb-6">
                        Cảm ơn bạn đã mua hàng. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.
                    </p>

                    <div className="bg-slate-50 rounded-md p-4 mb-6 text-left space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Mã đơn hàng</span>
                            <span className="font-mono font-semibold text-slate-800 text-xs">#{orderSuccess.orderId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tổng thanh toán</span>
                            <span className="font-bold text-[#c2410c]">{formatPrice(orderSuccess.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Thanh toán</span>
                            <span className="font-semibold text-slate-700">Tiền mặt khi nhận hàng</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Trạng thái</span>
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                Chờ xác nhận
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link
                            to="/"
                            className="w-full bg-[#fbbf24] text-white font-bold py-3 rounded-lg text-sm text-center hover:opacity-90 transition-opacity"
                        >
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Giỏ hàng trống ────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-shopping-cart text-3xl text-slate-300"></i>
                    </div>
                    <p className="font-semibold text-slate-700 mb-4">Giỏ hàng trống</p>
                    <Link to="/" className="bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-full transition-colors">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    // ── Trang thanh toán chính ────────────────────────────────────────────
    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-5xl mx-auto px-4 py-8">

                {/* Breadcrumb */}
                <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
                    <Link to="/" className="hover:text-amber-500">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-slate-600">Thanh toán</span>
                </div>

                <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Thanh toán</h1>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* ── Cột trái: Form thông tin ── */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* Thông tin giao hàng */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-map-marker-alt text-[#c2410c]"></i>
                                Thông tin giao hàng
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Địa chỉ nhận hàng <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="shippingAddress"
                                        value={form.shippingAddress}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                                        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none transition-shadow ${errors.shippingAddress ? 'border-red-400' : 'border-slate-200'}`}
                                    />
                                    {errors.shippingAddress && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <i className="fas fa-exclamation-circle"></i> {errors.shippingAddress}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Số điện thoại <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="0909 123 456"
                                        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-shadow ${errors.phone ? 'border-red-400' : 'border-slate-200'}`}
                                    />
                                    {errors.phone && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <i className="fas fa-exclamation-circle"></i> {errors.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Phương thức thanh toán */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-credit-card text-[#c2410c]"></i>
                                Phương thức thanh toán
                            </h2>
                            <div className="border-2 border-amber-400 bg-amber-50 rounded-lg px-4 py-3 flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Tiền mặt khi nhận hàng (COD)</p>
                                    <p className="text-xs text-slate-500">Thanh toán khi nhận được hàng</p>
                                </div>
                                <i className="fas fa-money-bill-wave text-amber-500 ml-auto text-lg"></i>
                            </div>
                        </div>

                        {/* Lỗi submit */}
                        {errors.submit && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-600 text-sm">
                                <i className="fas fa-exclamation-triangle"></i>
                                {errors.submit}
                            </div>
                        )}
                    </div>

                    {/* ── Cột phải: Tóm tắt đơn hàng ── */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm sticky top-6">
                            <h2 className="font-bold text-slate-800 mb-4">
                                Đơn hàng ({totalItems} sản phẩm)
                            </h2>

                            {/* Danh sách sản phẩm */}
                            <ul className="divide-y divide-slate-100 mb-4 max-h-72 overflow-y-auto">
                                {items.map((item) => (
                                    <li key={item.cartItemId} className="py-3 flex gap-3">
                                        <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                            {item.thumbnailUrl ? (
                                                <img src={item.thumbnailUrl} alt={item.productName} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <i className="fas fa-image text-slate-300"></i>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-snug">
                                                {item.productName}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">x{item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                                            {formatPrice(item.subtotal)}
                                        </p>
                                    </li>
                                ))}
                            </ul>

                            {/* Tổng */}
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Tạm tính</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Phí vận chuyển</span>
                                    <span className="text-green-600 font-semibold">Miễn phí</span>
                                </div>
                                <div className="flex justify-between font-extrabold text-slate-900 text-base pt-2 border-t border-slate-100">
                                    <span>Tổng cộng</span>
                                    <span className="text-[#c2410c]">{formatPrice(totalPrice)}</span>
                                </div>
                            </div>

                            {/* Nút đặt hàng */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full mt-5 bg-[#fbbf24] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3.5 rounded-lg text-sm transition-opacity flex items-center justify-center gap-2 shadow-md"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle"></i>
                                        Đặt hàng ngay
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
                                <i className="fas fa-shield-alt"></i>
                                Thông tin của bạn được bảo mật
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;