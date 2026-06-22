import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleIcon, FacebookIcon } from "../components/Icons";

export default function Login({ onNavigate, onLoginSuccess }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!email.trim() || !password.trim()){
            setError('Vui lòng điền email và mật khẩu!')
            return;
        }

        try {
            const response = await axios.post('/api/auth/login', {
                email: email,
                password: password
            });
            localStorage.setItem('auth_token', response.data.idToken);

            setMessage(`🎉 ${response.data.message}`);

            const userData = response.data.user;
            localStorage.setItem('user_email', userData.email);
            localStorage.setItem('user_name', userData.username || 'Guest');
            localStorage.setItem('user_data', JSON.stringify(userData));

            if (onLoginSuccess) {
                onLoginSuccess(userData.username || 'Guest');
            }

            setTimeout(() => {
                navigate('/');
            }, 2000);

            console.log(response.data);

        } catch(err) {
            if (err.response && err.response.data) {
                const detail = err.response.data.detail;
                setError(typeof detail === 'string' ? detail : 'Đăng nhập thất bại!');
            } else {
                setError('Không thể kết nối đến máy chủ Backend!');
            }
        }
    };

    return (
        <div className="min-h-screen w-full relative bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964')] bg-cover bg-center bg-no-repeat">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-10">
                <div className="w-full max-w-[450px] bg-white p-8 sm:p-10 rounded-1xl border border-gray-100">
                    {/* Logo */}
                    <div className="mb-6 text-center">
                        <span className="text-2xl font-bold text-gray-900">
                            electro<span className="text-amber-500">.</span>
                        </span>
                    </div>

                    {/* Tiêu đề */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Đăng nhập</h1>
                    <p className="text-sm text-gray-500 mb-6 text-center">
                        Chưa có tài khoản?{" "}
                        <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/signup');
                        }}
                        className="font-semibold text-gray-900 hover:underline">
                            Đăng ký ngay
                        </a>
                    </p>

                    {/* Hộp thoại thông báo lỗi/thành công */}
                    {message && (
                        <div className="mb-4 p-3 text-sm rounded-1x1 bg-green-50 text-green-700 border border-green-200 text-center">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 text-sm rounded-1x1 bg-red-50 text-red-700 border border-red-200 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="com@example.com"
                                className="w-full px-4 py-2 rounded-1x1 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
                                required
                            />
                        </div>

                        {/* Mật khẩu */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full px-4 py-2 pr-12 rounded-1x1 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                >
                                    <i className={showPassword ? "far fa-eye" : "far fa-eye-slash"}></i>
                                </button>
                            </div>
                        </div>

                        {/* Ghi nhớ + Quên mật khẩu */}
                        <div className="flex items-center justify-between text-xs pt-1">
                            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="w-4 h-4 border-gray-300 text-amber-500 focus:ring-amber-400"
                                />
                                Ghi nhớ đăng nhập
                            </label>
                            <a href="#" className="font-medium text-gray-700 hover:underline">
                                Quên mật khẩu?
                            </a>
                        </div>

                        {/* Nút đăng nhập */}
                        <button
                            type="submit"
                            className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition shadow-sm text-sm mt-2"
                        >
                            Đăng nhập
                        </button>
                    </form>

                    {/* Đường kẻ "hoặc" */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">hoặc tiếp tục với</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Social login */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            <GoogleIcon /> Google
                        </button>
                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            <FacebookIcon /> Facebook
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

