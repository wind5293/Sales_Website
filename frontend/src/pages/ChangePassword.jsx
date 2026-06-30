import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChangePassword = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [show, setShow] = useState({
        old: false,
        new: false,
        confirm: false,
    });

    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ type: '', message: '' });

    // Kiểm tra độ mạnh mật khẩu
    const getStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        const map = [
            { level: 1, label: 'Rất yếu', color: 'bg-red-500' },
            { level: 2, label: 'Yếu', color: 'bg-orange-400' },
            { level: 3, label: 'Trung bình', color: 'bg-yellow-400' },
            { level: 4, label: 'Mạnh', color: 'bg-green-500' },
        ];
        return map[score - 1] || { level: 0, label: '', color: '' };
    };

    const strength = getStrength(form.new_password);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setAlert({ type: '', message: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlert({ type: '', message: '' });

        if (!form.old_password || !form.new_password || !form.confirm_password) {
            setAlert({ type: 'error', message: 'Vui lòng điền đầy đủ các trường.' });
            return;
        }
        if (form.new_password.length < 6) {
            setAlert({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
            return;
        }
        if (form.new_password !== form.confirm_password) {
            setAlert({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' });
            return;
        }
        if (form.old_password === form.new_password) {
            setAlert({ type: 'error', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                setAlert({ type: 'error', message: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.' });
                setTimeout(() => navigate('/login'), 2000);
                return;
            }
            await axios.post('/api/users/change-password', {
                old_password: form.old_password,
                new_password: form.new_password,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAlert({ type: 'success', message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
            setForm({ old_password: '', new_password: '', confirm_password: '' });

            // Đăng xuất sau 2 giây để buộc đăng nhập lại với mật khẩu mới
            setTimeout(() => {
                localStorage.clear();
                navigate('/login');
            }, 2500);

        } catch (err) {
            console.error("Chi tiết lỗi:", err);
            console.log("Dữ liệu phản hồi từ server:", err.response);

            const detail = err.response?.data?.detail;
            if (detail?.includes('Mật khẩu cũ')) {
                setAlert({ type: 'error', message: 'Mật khẩu hiện tại không đúng.' });
            } else if (err.response?.status === 401) {
                localStorage.removeItem('auth_token');
                navigate('/login');
            } else {
                setAlert({ type: 'error', message: 'Đổi mật khẩu thất bại. Vui lòng thử lại!' });
            }
        } finally {
            setSaving(false);
        }
    };

    const ToggleIcon = ({ field }) => (
        <button
            type="button"
            onClick={() => setShow(prev => ({ ...prev, [field]: !prev[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
        >
            <i className={`fas ${show[field] ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
        </button>
    );

    return (
        <div className="bg-slate-50 min-h-screen font-sans py-10">
            <div className="max-w-4xl mx-auto px-4">

                {/* Alert */}
                {alert.message && (
                    <div className={`mb-6 p-4 rounded-xs flex items-center gap-3 text-sm font-medium ${alert.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        {alert.message}
                    </div>
                )}

                <div className="bg-white rounded-xs border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-3">

                    {/* Cột trái: mô tả bảo mật */}
                    <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700">
                        <div>
                            <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-xs flex items-center justify-center mb-6">
                                <i className="fas fa-lock text-amber-400 text-xl"></i>
                            </div>
                            <h2 className="text-xl font-bold tracking-wide mb-2">Đổi mật khẩu</h2>
                            
                            {/* Tips */}
                            <div className="mt-8 space-y-3">
                                {[
                                    { icon: 'fa-check', text: 'Ít nhất 8 ký tự' },
                                    { icon: 'fa-check', text: 'Có chữ hoa và chữ thường' },
                                    { icon: 'fa-check', text: 'Có ít nhất một chữ số' },
                                    { icon: 'fa-check', text: 'Có ký tự đặc biệt (!@#$…)' },
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm">
                                        <span className={`w-4 h-4 rounded-xs flex items-center justify-center flex-shrink-0 text-[9px] ${form.new_password && (
                                                (i === 0 && form.new_password.length >= 8) ||
                                                (i === 1 && /[A-Z]/.test(form.new_password) && /[a-z]/.test(form.new_password)) ||
                                                (i === 2 && /[0-9]/.test(form.new_password)) ||
                                                (i === 3 && /[^A-Za-z0-9]/.test(form.new_password))
                                            )
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-700 text-slate-500'
                                            }`}>
                                            <i className={`fas ${tip.icon}`}></i>
                                        </span>
                                        <span className="text-slate-400">{tip.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Form đổi mật khẩu */}
                    <form onSubmit={handleSubmit} className="p-8 md:col-span-2 flex flex-col justify-between">
                        <div>

                            <div className="space-y-5">

                                {/* Mật khẩu hiện tại */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Mật khẩu hiện tại
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={show.old ? 'text' : 'password'}
                                            name="old_password"
                                            value={form.old_password}
                                            onChange={handleChange}
                                            placeholder="Nhập mật khẩu hiện tại"
                                            autoComplete="current-password"
                                            className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                                        />
                                        <ToggleIcon field="old" />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-100"></div>
                                    <span className="text-xs text-slate-400 font-medium">Mật khẩu mới</span>
                                    <div className="flex-1 h-px bg-slate-100"></div>
                                </div>

                                {/* Mật khẩu mới */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={show.new ? 'text' : 'password'}
                                            name="new_password"
                                            value={form.new_password}
                                            onChange={handleChange}
                                            placeholder="Nhập mật khẩu mới"
                                            autoComplete="new-password"
                                            className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                                        />
                                        <ToggleIcon field="new" />
                                    </div>

                                    {/* Thanh độ mạnh */}
                                    {form.new_password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs font-medium ${strength.level <= 1 ? 'text-red-500' :
                                                    strength.level === 2 ? 'text-orange-500' :
                                                        strength.level === 3 ? 'text-yellow-600' : 'text-green-600'
                                                }`}>{strength.label}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Xác nhận mật khẩu mới */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={show.confirm ? 'text' : 'password'}
                                            name="confirm_password"
                                            value={form.confirm_password}
                                            onChange={handleChange}
                                            placeholder="Nhập lại mật khẩu mới"
                                            autoComplete="new-password"
                                            className={`w-full px-4 py-2.5 pr-10 border rounded-xs text-sm focus:outline-none focus:ring-2 transition-colors ${form.confirm_password && form.new_password !== form.confirm_password
                                                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                                                    : form.confirm_password && form.new_password === form.confirm_password
                                                        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400'
                                                        : 'border-slate-200 focus:ring-amber-500/20 focus:border-amber-500'
                                                }`}
                                        />
                                        <ToggleIcon field="confirm" />
                                        {/* Tick xác nhận khớp */}
                                        {form.confirm_password && form.new_password === form.confirm_password && (
                                            <div className="absolute right-9 top-1/2 -translate-y-1/2">
                                                <i className="fas fa-check-circle text-green-500 text-sm"></i>
                                            </div>
                                        )}
                                    </div>
                                    {form.confirm_password && form.new_password !== form.confirm_password && (
                                        <p className="text-xs text-red-500 mt-1">Mật khẩu xác nhận chưa khớp.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-[#FBBF24] hover:bg-amber-400 text-white font-semibold text-sm rounded-xs shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Đang lưu...</>
                                ) : (
                                    <><i className="fas fa-key"></i> Đổi mật khẩu</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;