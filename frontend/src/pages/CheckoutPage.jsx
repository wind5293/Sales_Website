import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const PAYMENT_METHODS = [
    { id: 'cod', label: 'Thanh toán khi nhận hàng', icon: 'fas fa-money-bill-wave', sub: 'Thanh toán tiền mặt khi nhận hàng' },
    { id: 'bank', label: 'Chuyển khoản ngân hàng', icon: 'fas fa-university', sub: 'ATM / Internet Banking' },
    { id: 'momo', label: 'Ví MoMo', icon: 'fas fa-wallet', sub: 'Thanh toán qua ví điện tử MoMo' },
];

const SHIPPING_METHODS = [
    { id: 'fast', label: 'Giao hàng nhanh', price: 30000, eta: 'Nhận hàng 24 - 25 Th06' },
    { id: 'standard', label: 'Giao hàng tiêu chuẩn', price: 15000, eta: 'Nhận hàng 26 - 28 Th06' },
    { id: 'express', label: 'Hỏa tốc', price: 60000, eta: 'Nhận hàng trong ngày' },
];

const Divider = () => <hr className="border-slate-100" />;

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, totalItems, totalPrice, fetchCart } = useCart();

    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [note, setNote] = useState('');

    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');
    const [availableVouchers, setAvailableVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    const [shipping, setShipping] = useState(SHIPPING_METHODS[0]);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [wantInvoice, setWantInvoice] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [showAddressModal, setShowAddressModal] = useState(false);

    const discountAmount = appliedVoucher?.discountAmount ?? 0;
    const finalTotal = totalPrice + shipping.price - discountAmount;

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên';
        if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
        else if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.trim())) e.phone = 'Số điện thoại không hợp lệ';
        if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ';
        return e;
    };

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        axios.get('/api/users/addresses', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            const list = res.data.addresses || [];
            setAddresses(list);
            const def = list.find(a => a.is_default) || list[0];
            if (def) {
                setForm({
                    name: def.name || '',
                    phone: def.phone || '',
                    address: [def.street, def.district, def.city]
                        .filter(Boolean).join(', '),
                });
            }
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!showVoucherModal) return;
        setLoadingVouchers(true);
        const token = localStorage.getItem('auth_token');
        fetch(`/api/coupons/available?order_total=${totalPrice}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => setAvailableVouchers(data.coupons ?? []))
            .catch(() => setAvailableVouchers([]))
            .finally(() => setLoadingVouchers(false));
    }, [showVoucherModal]);

    const handleApplyVoucher = async () => {
        setVoucherError('');
        const code = voucherInput.toUpperCase().trim();
        if (!code) return;

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    voucherCode: code,
                    orderTotal: totalPrice,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setVoucherError(data.detail || 'Mã không hợp lệ');
                return;
            }

            // data trả về: { valid, voucherCode, discountAmount, discountPercent, finalPrice, message }
            setAppliedVoucher({
                code: data.voucherCode,
                discountAmount: data.discountAmount,
                discountPercent: data.discountPercent,
                finalPrice: data.finalPrice,
            });
            setShowVoucherModal(false);
            setVoucherInput('');

        } catch {
            setVoucherError('Không thể kết nối máy chủ, thử lại sau');
        }
    }

    const handleApplyVoucherDirect = (v) => {
        const discountAmount = v.discountPercent
            ? Math.round(totalPrice * v.discountPercent / 100)
            : Math.min(v.discountAmount, totalPrice);

        setAppliedVoucher({
            code: v.code,
            discountAmount,
            discountPercent: v.discountPercent,
            finalPrice: totalPrice - discountAmount,
        });
        setShowVoucherModal(false);
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const token = localStorage.getItem('auth_token');
        if (!token) { navigate('/login'); return; }
        setLoading(true);
        try {
            const res = await axios.post('/api/orders',
                {
                    shippingAddress: form.address.trim(),
                    phone: form.phone.trim(),
                    name: form.name.trim(),
                    note: note.trim(),
                    paymentMethod: paymentMethod.id,
                    shippingMethod: shipping.id,
                    voucherCode: appliedVoucher?.code || null
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setOrderSuccess({ orderId: res.data.orderId, totalPrice: res.data.totalPrice });
            await fetchCart();
        } catch (err) {
            setErrors({ submit: err.response?.data?.detail || 'Đặt hàng thất bại. Vui lòng thử lại.' });
        } finally {
            setLoading(false);  
        }
    };

    // ── Màn hình thành công ──────────────────────────────────────────────
    if (orderSuccess) {
        return (
            <div className="bg-[#f5f5f5] min-h-screen flex items-center justify-center px-4 py-12">
                <div className="bg-white rounded-sm shadow max-w-lg w-full p-10 text-center">
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100">
                        <i className="fas fa-check-circle text-5xl text-amber-400"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        Đặt hàng thành công!
                    </h1>
                    <p className="text-slate-500 text-sm mb-8">
                        Cảm ơn bạn đã mua hàng tại
                        <span className="text-[#f59e0b] font-semibold">
                            electro.
                        </span>
                    </p>
                    <div className="bg-[#fafafa] border border-slate-200 rounded-sm p-5 mb-6 text-left divide-y divide-dashed divide-slate-200 space-y-3">
                        <div className="flex justify-between text-sm pb-3">
                            <span className="text-slate-500">
                                Mã đơn hàng
                            </span>
                            <span className="font-mono font-bold text-slate-800 text-xs tracking-wider">
                                #{orderSuccess.orderId.slice(-10).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm pt-3">
                            <span className="text-slate-500">
                                Phương thức thanh toán
                            </span>
                            <span className="font-semibold text-slate-700">
                                {paymentMethod.label}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm pt-3">
                            <span className="text-slate-500">
                                Dự kiến giao hàng
                            </span>
                            <span className="font-semibold text-green-600">
                                {shipping.eta}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm pt-3">
                            <span className="text-slate-500">
                                Trạng thái
                            </span>
                            <span className="text-amber-700 text-sm font-bold">
                                Chờ xác nhận
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                            <span className="font-bold text-slate-700">
                                Tổng thanh toán
                            </span>
                            <span className="text-2xl font-bold text-[#f59e0b]">
                                {formatPrice(orderSuccess.totalPrice)}
                            </span>
                        </div>
                    </div>
                    <Link to="/" className="block w-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold py-3 rounded-sm text-sm text-center transition-colors">
                        Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="bg-[#f5f5f5] min-h-screen flex items-center justify-center px-4">
                <div className="text-center bg-white p-12 rounded-sm shadow">
                    <i className="fas fa-shopping-cart text-5xl text-slate-200 mb-4 block"></i>
                    <p className="font-semibold text-slate-600 mb-5">
                        Giỏ hàng của bạn đang trống
                    </p>
                    <Link to="/" className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-sm px-8 py-3 rounded-sm transition-colors inline-block">
                        Mua ngay
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f5f5f5] min-h-screen">

            {/* Breadcrumb */}
            <div className="max-w-5xl mx-auto px-4 pt-5 pb-2 flex items-center gap-2 text-xs">
                <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-[#f59e0b] transition-colors">
                    <i className="fas fa-home text-[11px]"></i>
                    Trang chủ
                </Link>
                <i className="fas fa-chevron-right text-[9px] text-slate-300"></i>
                <span className="text-slate-600 font-medium">
                    Thanh toán
                </span>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Card duy nhất bao toàn bộ, các section ngăn bởi <hr> */}
                <div className="bg-white">

                    {/* ── 1. Địa chỉ nhận hàng ── */}
                    <div className="px-6 py-6">
                        <h2 className="text-[#f59e0b] font-semibold text-base mb-4 flex items-center justify-between">
                            <span><i className="fas fa-map-marker-alt mr-2"></i>Địa chỉ nhận hàng</span>
                            {addresses.length > 0 && (
                                <button
                                    onClick={() => setShowAddressModal(true)}
                                    className="text-xs font-normal text-[#f59e0b] hover:underline border border-amber-200 px-2 py-1"
                                >
                                    <i className="fas fa-book mr-1"></i>Chọn từ sổ địa chỉ
                                </button>
                            )}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Họ và tên
                                </label>
                                <input name="name" value={form.name}
                                    onChange={e => {
                                        setForm(p => ({ ...p, name: e.target.value }));
                                        setErrors(p => ({ ...p, name: '' }));
                                    }}
                                    placeholder="Nguyễn Văn A"
                                    className={`w-full border px-3 py-2 text-sm focus:outline-none focus:border-[#f59e0b] ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">
                                    {errors.name}
                                </p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Số điện thoại
                                </label>
                                <input name="phone" value={form.phone} type="tel"
                                    onChange={e => {
                                        setForm(p => ({ ...p, phone: e.target.value }));
                                        setErrors(p => ({ ...p, phone: '' }));
                                    }}
                                    placeholder="0123 456 789"
                                    className={`w-full border px-3 py-2 text-sm focus:outline-none focus:border-[#f59e0b] ${errors.phone ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Địa chỉ nhận hàng
                                </label>
                                <input name="address" value={form.address}
                                    onChange={e => {
                                        setForm(p => ({ ...p, address: e.target.value }));
                                        setErrors(p => ({ ...p, address: '' }));
                                    }}
                                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                                    className={`w-full border px-3 py-2 text-sm focus:outline-none focus:border-[#f59e0b] ${errors.address ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>
                        </div>
                    </div>

                    <Divider />

                    {/* ── 2. Sản phẩm ── */}
                    <div>
                        {/* Header bảng */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs text-slate-400 tracking-wide">
                            <div className="col-span-6">Sản phẩm</div>
                            <div className="col-span-2 text-center">Đơn giá</div>
                            <div className="col-span-2 text-center">Số lượng</div>
                            <div className="col-span-2 text-right">Thành tiền</div>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {items.map(item => (
                                <li key={item.cartItemId} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                    <div className="col-span-12 md:col-span-6 flex gap-3 items-center">
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                            {item.thumbnailUrl
                                                ? <img src={item.thumbnailUrl} alt={item.productName} className="w-full h-full object-contain p-1" />
                                                : <i className="fas fa-image text-slate-300 text-2xl"></i>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-slate-800 line-clamp-2 font-medium">{item.productName}</p>
                                            {item.status === 'out_of_stock' && (
                                                <span className="text-[10px] bg-red-100 text-red-500 font-semibold px-2 py-0.5 mt-1 inline-block">Hết hàng</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        <span className="text-sm text-[#f59e0b] font-semibold">{formatPrice(item.price)}</span>
                                    </div>
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        <span className="text-sm text-slate-600 border-slate-200 px-3 py-1">{item.quantity}</span>
                                    </div>
                                    <div className="hidden md:flex col-span-2 justify-end">
                                        <span className="text-sm font-bold text-[#f59e0b]">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                    <div className="md:hidden col-span-12 flex justify-between text-xs text-slate-500 -mt-2">
                                        <span>{formatPrice(item.price)} × {item.quantity}</span>
                                        <span className="font-bold text-[#f59e0b]">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Lời nhắn + Vận chuyển */}
                        <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Lời nhắn cho người bán</label>
                                <input value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Lưu ý cho người bán..."
                                    className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#f59e0b]"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500">Phương thức vận chuyển</span>
                                    <button onClick={() => setShowShippingModal(true)} className="text-xs text-[#f59e0b] hover:underline font-medium">Thay đổi</button>
                                </div>
                                <div className="border border-slate-200 px-3 py-2">
                                    <p className="text-sm font-semibold text-slate-800">{shipping.label}</p>
                                    <p className="text-xs text-green-600 mt-0.5">{shipping.eta} · {formatPrice(shipping.price)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Divider />

                    {/* ── 3. Voucher ── */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-ticket-alt text-[#f59e0b]"></i>
                            <span className="font-semibold text-slate-800 text-sm">Voucher của Shop</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {appliedVoucher && (
                                <div className="flex items-center gap-2">
                                    <span className="bg-amber-50 border border-amber-200 text-[#f59e0b] text-xs font-bold px-2 py-1 ">
                                        -{appliedVoucher.discountPercent
                                            ? `${appliedVoucher.discountPercent}%`
                                            : formatPrice(appliedVoucher.discountAmount)
                                        }
                                    </span>
                                    <button onClick={() => setAppliedVoucher(null)} className="text-slate-400 hover:text-red-400 text-xs"><i className="fas fa-times"></i></button>
                                </div>
                            )}
                            <button onClick={() => setShowVoucherModal(true)} className="text-sm text-[#f59e0b] hover:underline font-medium">
                                {appliedVoucher ? 'Thêm voucher' : 'Chọn Voucher'}
                            </button>
                        </div>
                    </div>

                    <Divider />

                    {/* ── 4. Hóa đơn điện tử ── */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-file-invoice text-slate-400"></i>
                            <span className="text-sm text-slate-700">Hóa đơn điện tử</span>
                            <span className="text-xs text-slate-400">(Xuất VAT)</span>
                        </div>
                        <button onClick={() => setWantInvoice(!wantInvoice)}
                            className={`text-sm font-medium transition-colors ${wantInvoice ? 'text-[#f59e0b]' : 'text-slate-400 hover:text-[#f59e0b]'}`}>
                            {wantInvoice
                                ? <span className="flex items-center gap-1"><i className="fas fa-check-circle text-green-500"></i> Đã yêu cầu</span>
                                : 'Yêu Cầu Ngay'}
                        </button>
                    </div>

                    <Divider />

                    {/* ── 5. Phương thức thanh toán ── */}
                    <div className="px-6 py-4">
                        <span className="font-semibold text-slate-800 text-sm block mb-3">Phương thức thanh toán</span>
                        <div className="space-y-2">
                            {PAYMENT_METHODS.map(pm => (
                                <div
                                    key={pm.id}
                                    onClick={() => setPaymentMethod(pm)}
                                    className={`flex items-center gap-3 border px-4 py-3 cursor-pointer transition-all
                    ${paymentMethod.id === pm.id
                                            ? 'border-[#f59e0b] bg-amber-50'
                                            : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                                        }`}
                                >
                                    {/* Radio dot */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${paymentMethod.id === pm.id ? 'border-[#f59e0b]' : 'border-slate-300'}`}>
                                        {paymentMethod.id === pm.id && (
                                            <div className="w-2 h-2 bg-[#f59e0b]"></div>
                                        )}
                                    </div>
                                    <i className={`${pm.icon} text-lg w-6 ${paymentMethod.id === pm.id ? 'text-[#f59e0b]' : 'text-slate-400'}`}></i>
                                    <div>
                                        <p className={`text-sm font-semibold ${paymentMethod.id === pm.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {pm.label}
                                        </p>
                                        <p className="text-xs text-slate-400">{pm.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Divider />

                    {/* ── 6. Tổng + Đặt hàng ── */}
                    <div className="px-6 py-5">
                        <div className="space-y-2 mb-5 max-w-sm ml-auto">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Tổng tiền hàng ({totalItems} sản phẩm)</span>
                                <span>{formatPrice(totalPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Phí vận chuyển</span>
                                <span>{formatPrice(shipping.price)}</span>
                            </div>
                            {appliedVoucher && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Voucher giảm giá</span>
                                    <span>-{formatPrice(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-slate-700 font-semibold">Tổng thanh toán</span>
                                <span className="text-2xl font-extrabold text-[#f59e0b]">{formatPrice(finalTotal)}</span>
                            </div>
                        </div>

                        {errors.submit && (
                            <div className="bg-red-50 border border-red-200 px-4 py-3 mb-4 text-red-600 text-sm flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i> {errors.submit}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 text-center md:text-left">
                                Nhấn "Đặt hàng" đồng nghĩa với việc bạn đồng ý tuân theo{' '}
                                <span className="text-[#f59e0b] cursor-pointer hover:underline">Điều khoản dịch vụ</span>
                            </p>
                            <button onClick={handleSubmit} disabled={loading}
                                className="w-full md:w-48 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-60 text-white font-bold py-3 text-sm transition-colors flex items-center justify-center gap-2">
                                {loading ? <><i className="fas fa-spinner fa-spin"></i> Đang xử lý...</> : 'Đặt hàng'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {showVoucherModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Chọn Voucher</h3>
                            <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Input nhập mã */}
                            <div className="flex gap-2">
                                <input
                                    value={voucherInput}
                                    onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(''); }}
                                    placeholder="Nhập mã voucher"
                                    className="flex-1 border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-[#f59e0b]"
                                />
                                <button
                                    onClick={handleApplyVoucher}
                                    className="bg-[#f59e0b] hover:bg-[#d97706] text-white px-4 py-2 rounded-sm text-sm font-semibold transition-colors"
                                >
                                    Áp dụng
                                </button>
                            </div>
                            {voucherError && <p className="text-red-500 text-xs">{voucherError}</p>}

                            {/* Danh sách voucher từ API */}
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400 font-medium tracking-wide">
                                    Voucher khả dụng
                                </p>

                                {loadingVouchers ? (
                                    <div className="flex justify-center py-6">
                                        <div className="w-6 h-6 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : availableVouchers.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">
                                        Không có voucher khả dụng
                                    </p>
                                ) : (
                                    availableVouchers.map(v => {
                                        const isExpired = v.validUntil && new Date(v.validUntil) < new Date();
                                        const isFull = v.usedCount >= v.maxUses;
                                        const canUse = !isExpired && !isFull && totalPrice >= (v.minOrder || 0);

                                        return (
                                            <div
                                                key={v.code}
                                                onClick={() => canUse && handleApplyVoucherDirect(v)}
                                                className={`flex items-center gap-3 border p-3 transition-colors
                                        ${appliedVoucher?.code === v.code
                                                        ? 'border-[#f59e0b] bg-amber-50'
                                                        : canUse
                                                            ? 'border-slate-200 cursor-pointer hover:border-[#f59e0b] hover:bg-amber-50'
                                                            : 'border-slate-100 opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                    <i className="fas fa-ticket-alt text-[#f59e0b]"></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {v.discountPercent
                                                            ? `Giảm ${v.discountPercent}%`
                                                            : `Giảm ${formatPrice(v.discountAmount)}`
                                                        }
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {v.minOrder > 0
                                                            ? `Đơn tối thiểu ${formatPrice(v.minOrder)}`
                                                            : 'Không giới hạn đơn'
                                                        }
                                                        {' · '}
                                                        Mã: <span className="font-mono font-bold">{v.code}</span>
                                                    </p>
                                                    {isExpired && <p className="text-xs text-red-400">Đã hết hạn</p>}
                                                    {isFull && !isExpired && <p className="text-xs text-red-400">Đã hết lượt dùng</p>}
                                                    {!canUse && !isExpired && !isFull && (
                                                        <p className="text-xs text-slate-400">
                                                            Cần thêm {formatPrice((v.minOrder || 0) - totalPrice)}
                                                        </p>
                                                    )}
                                                </div>
                                                {appliedVoucher?.code === v.code && (
                                                    <i className="fas fa-check-circle text-[#f59e0b]"></i>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddressModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                            <h3 className="font-bold text-slate-800">Chọn địa chỉ giao hàng</h3>
                            <button onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-5 space-y-3">
                            {addresses.map((addr) => (
                                <div
                                    key={addr.address_id}
                                    onClick={() => {
                                        setForm({
                                            name: addr.name || '',
                                            phone: addr.phone || '',
                                            address: [addr.street, addr.district, addr.city]
                                                .filter(Boolean).join(', '),
                                        });
                                        setErrors({});
                                        setShowAddressModal(false);
                                    }}
                                    className="border border-slate-200 p-4 cursor-pointer hover:border-[#f59e0b] hover:bg-amber-50 transition-colors relative"
                                >
                                    {addr.is_default && (
                                        <span className="absolute top-3 right-3 text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5">
                                            Mặc định
                                        </span>
                                    )}
                                    <p className="font-semibold text-slate-800 text-sm pr-16">{addr.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{addr.phone}</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {[addr.street, addr.district, addr.city].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            ))}

                            <button
                                onClick={() => { setShowAddressModal(false); navigate('/profile/addresses'); }}
                                className="w-full border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:border-[#f59e0b] hover:text-[#f59e0b] transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-plus"></i>
                                Thêm địa chỉ mới
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Vận chuyển ── */}
            {showShippingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white rounded-sm shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Chọn đơn vị vận chuyển</h3>
                            <button onClick={() => setShowShippingModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-5 space-y-2">
                            {SHIPPING_METHODS.map(s => (
                                <div key={s.id} onClick={() => { setShipping(s); setShowShippingModal(false); }}
                                    className={`flex items-center gap-3 border rounded-sm p-4 cursor-pointer transition-colors hover:border-[#f59e0b] ${shipping.id === s.id ? 'border-[#f59e0b] bg-amber-50' : 'border-slate-200'}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${shipping.id === s.id ? 'border-[#f59e0b]' : 'border-slate-300'}`}>
                                        {shipping.id === s.id && <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                                        <p className="text-xs text-green-600 mt-0.5">{s.eta}</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{formatPrice(s.price)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Thanh toán ── */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white rounded-sm shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Phương thức thanh toán</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-5 space-y-2">
                            {PAYMENT_METHODS.map(pm => (
                                <div key={pm.id} onClick={() => { setPaymentMethod(pm); setShowPaymentModal(false); }}
                                    className={`flex items-center gap-3 border rounded-sm p-4 cursor-pointer transition-colors hover:border-[#f59e0b] ${paymentMethod.id === pm.id ? 'border-[#f59e0b] bg-amber-50' : 'border-slate-200'}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod.id === pm.id ? 'border-[#f59e0b]' : 'border-slate-300'}`}>
                                        {paymentMethod.id === pm.id && <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>}
                                    </div>
                                    <i className={`${pm.icon} text-[#f59e0b] w-5 text-base`}></i>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{pm.label}</p>
                                        <p className="text-xs text-slate-400">{pm.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutPage;