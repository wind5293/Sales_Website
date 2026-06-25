import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const LOCATIONS = [
    "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng",
    "Cần Thơ", "Bình Dương", "Đồng Nai", "Thừa Thiên Huế", "Khánh Hòa"
];

const Profile = () => {
    const navigate = useNavigate();

    // Quản lý trạng thái dữ liệu profile
    const [formData, setFormData] = useState({
        uid: '',
        username: '',
        email: '',
        name: '',
        dob: '',
        gender: '',
        place: '',
        tel: '',
        points: 0,
        rank: 'Silver'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ type: '', message: '' });

    // Lấy thông tin Profile khi tải trang
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setAlert({ type: 'error', message: 'Vui lòng đăng nhập để xem thông tin!' });
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        const fetchProfile = async () => {
            try {
                setLoading(true);
                // Giả định endpoint lấy thông tin user hiện tại (bằng token)
                let token = localStorage.getItem('auth_token');

                let res;
                try {
                    res = await axios.get('/api/users/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (err) {
                    // Token hết hạn → tự động login lại lấy token mới
                    if (err.response?.status === 401) {
                        const email = localStorage.getItem('user_email');
                        const savedData = JSON.parse(localStorage.getItem('user_data') || '{}');

                        // Không lưu password nên phải redirect về login
                        setAlert({ type: 'error', message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!' });
                        localStorage.clear();
                        setTimeout(() => navigate('/login'), 2000);
                        return;
                    }
                    throw err;
                }
                const data = res.data || {};

                // Xử lý các giá trị null thành chuỗi rỗng để không lỗi ô input trong React
                setFormData({
                    uid: data.uid || '',
                    username: data.username || '',
                    email: data.email || '',
                    name: data.name || '',
                    dob: data.dob || '',
                    gender: data.gender || 'Khác',
                    place: data.place || '',
                    tel: data.tel || '',
                    points: data.points || 0,
                    rank: data.rank || 'Silver'
                });
            } catch (err) {
                console.error("Lỗi tải thông tin cá nhân:", err);
                setAlert({ type: 'error', message: 'Không thể tải thông tin cá nhân!' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    // Xử lý thay đổi dữ liệu trong ô input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Xử lý submit lưu thông tin thay đổi
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setAlert({ type: '', message: '' });

        const token = localStorage.getItem('auth_token');
        if (!token) {
            setAlert({ type: 'error', message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!' });
            setTimeout(() => navigate('/login'), 2000);
            setSaving(false);
            return;
        }

        try {
            await axios.patch('/api/users/me', {
                name: formData.name,
                dob: formData.dob,
                gender: formData.gender,
                place: formData.place,   // ← sửa: backend nhận "place", không phải "address"
                tel: formData.tel
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAlert({ type: 'success', message: 'Cập nhật thông tin thành công!' });

            if (formData.name) {
                localStorage.setItem('user_name', formData.name);
            }
        } catch (err) {
            console.error("Lỗi cập nhật profile:", err);
            setAlert({ type: 'error', message: 'Cập nhật thất bại. Vui lòng thử lại!' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen font-sans py-10">
            <div className="max-w-4xl mx-auto px-4">

                {/* Thông báo Alert */}
                {alert.message && (
                    <div className={`mb-6 p-4 rounded-md flex items-center gap-3 text-sm font-medium ${alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        {alert.message}
                    </div>
                )}

                <div className="bg-white rounded-sm shadow-xs border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-3">

                    {/* Cột trái: Thẻ tóm tắt Widget Thành viên */}
                    <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-slate-700">
                        <div className="w-full text-center">
                            {/* Avatar mặc định tròn */}
                            <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 border-4 border-slate-700 shadow-inner">
                                {formData.name ? formData.name.charAt(0).toUpperCase() : formData.username.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold tracking-wide">{formData.name || formData.username}</h2>
                            <p className="text-slate-400 text-xs mt-1">@{formData.username}</p>

                            {/* Badge Hạng thành viên */}
                            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/60 rounded-md border border-slate-600 text-xs font-semibold tracking-wider text-amber-400">
                                <i className="fas fa-crown text-[10px]"></i> Hạng {formData.rank}
                            </div>
                        </div>

                        {/* Thống kê điểm thưởng */}
                        <div className="w-full bg-slate-800/80 border border-slate-700/50 rounded-md p-4 mt-8 text-center">
                            <span className="text-xs text-slate-400 block uppercase font-semibold tracking-wider">Điểm tích lũy</span>
                            <span className="text-3xl font-black text-amber-400 mt-1 block">{formData.points.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 block mt-1">Mua sắm để tích thêm điểm thưởng</span>
                        </div>

                        <div className="w-full mt-6 space-y-2">
                            <Link
                                to="/profile/addresses"
                                className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600 group"
                            >
                                <div className="w-6 flex justify-center">
                                    <i className="fas fa-map-marker-alt text-slate-400 group-hover:text-amber-400 transition-colors"></i>
                                </div>
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Sổ địa chỉ</span>
                                <i className="fas fa-chevron-right ml-auto text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors"></i>
                            </Link>

                            <Link
                                to="/profile/change-password"
                                className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600 group"
                            >
                                <div className="w-6 flex justify-center">
                                    <i className="fas fa-lock text-slate-400 group-hover:text-amber-400 transition-colors"></i>
                                </div>
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Đổi mật khẩu</span>
                                <i className="fas fa-chevron-right ml-auto text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors"></i>
                            </Link>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-6 text-center">ID: {formData.uid}</p>
                    </div>

                    {/* Cột phải: Form chỉnh sửa chi tiết */}
                    <form onSubmit={handleSubmit} className="p-8 md:col-span-2 flex flex-col justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">Thông tin cá nhân</h1>
                            <p className="text-slate-400 text-sm mb-6">Cập nhật đầy đủ thông tin để nhận thêm ưu đãi thành viên.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Username (Read-only) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên tài khoản</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xs text-sm cursor-not-allowed outline-none"
                                    />
                                </div>

                                {/* Email (Read-only) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Địa chỉ Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xs text-sm cursor-not-allowed outline-none"
                                    />
                                </div>

                                {/* Họ và tên (Editable) */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Họ và tên</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên đầy đủ"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                                    />
                                </div>

                                {/* Số điện thoại (Editable) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        name="tel"
                                        value={formData.tel}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                                    />
                                </div>

                                {/* Ngày sinh (Editable) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngày sinh</label>
                                    <input
                                        type="date"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors text-slate-700"
                                    />
                                </div>

                                <div className="sm:col-span-2 mt-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Giới tính</label>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                id="nam"
                                                name="gender"
                                                value="Nam"
                                                checked={formData.gender === 'Nam'}
                                                onChange={handleChange}
                                                className="w-4 accent-amber-500"
                                            />
                                            <label htmlFor="nam" className="text-sm text-slate-700 cursor-pointer select-none">Nam</label>
                                        </div>

                                        <div className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                id="nu"
                                                name="gender"
                                                value="Nữ"
                                                checked={formData.gender === 'Nữ'}
                                                onChange={handleChange}
                                                className="w-4 h-4 cursor-pointer accent-amber-500"
                                            />
                                            <label htmlFor="nu" className="text-sm text-slate-700 cursor-pointer select-none">Nữ</label>
                                        </div>

                                        <div className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                id="khac"
                                                name="gender"
                                                value="Khác"
                                                checked={formData.gender === 'Khác'}
                                                onChange={handleChange}
                                                className="w-4 h-4 cursor-pointer accent-amber-500"
                                            />
                                            <label htmlFor="khac" className="text-sm text-slate-700 cursor-pointer select-none">Khác</label>
                                        </div>
                                    </div>
                                </div>

                                {/* Tỉnh / Thành phố (Editable - Dropdown) */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tỉnh / Thành phố</label>
                                    <select
                                        name="place"
                                        value={formData.place}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xs text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors text-slate-700 cursor-pointer"
                                    >
                                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                                        {LOCATIONS.map((loc, idx) => (
                                            <option key={idx} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                        </div>

                        {/* Thanh Action điều khiển phía dưới */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-[#FBBF24] hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm rounded-xs shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-xs h-4 w-4 border-b-2 border-white"></div>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <i className="far fa-save"></i> Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default Profile;