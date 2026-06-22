import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleIcon, FacebookIcon } from "../components/Icons";

export default function Signup() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [tel, setTel] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!username.trim() || !email.trim() || !tel.trim() || !password.trim()) {
            setError('Vui lòng điền đầy đủ tất cả các thông tin!');
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/auth/signup', {
                username: username,
                password: password,
                email: email,
                tel: tel
            });

            setMessage(`🎉 ${response.data.message}`);
            
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            if (err.response && err.response.data) {
                const detail = err.response.data.detail;
                setError(typeof detail === 'string' ? detail : 'Đăng ký tài khoản thất bại!');
            } else {
                setError('Không thể kết nối đến máy chủ Backend!');
            }
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200')] bg-cover bg-center bg-no-repeat px-4 sm:px-6 py-10">

            {/* Hộp thoại đăng ký: */}
            <div className="w-full max-w-[450px] bg-white p-8 sm:p-10 border border-gray-100">

                {/* Logo thương hiệu */}
                <div className="mb-6 text-center">
                    <span className="text-2xl font-bold text-gray-900">
                        electro<span className="text-amber-500">.</span>
                    </span>
                </div>

                {/* Tiêu đề trang */}
                <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Đăng ký</h1>
                <p className="text-sm text-gray-500 mb-6 text-center">
                    Đã có tài khoản?{" "}
                    <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/login');
                        }}
                        className="font-semibold text-gray-900 hover:underline">
                        Đăng nhập ngay
                    </a>
                </p>

                {/* Hộp thoại hiển thị thông báo lỗi hoặc thành công */}
                {message && (
                    <div className="mb-4 p-3 text-sm bg-green-50 text-green-700 border border-green-200 text-center">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="mb-4 p-3 text-sm bg-red-50 text-red-700 border border-red-200 text-center">
                        {error}
                    </div>
                )}

                {/* Form nhập liệu */}
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Tên đăng nhập */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            Tên đăng nhập
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            className="w-full px-4 py-2 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
                            required
                        />
                    </div>

                    {/* Địa chỉ Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-4 py-2 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
                            required
                        />
                    </div>

                    {/* Số điện thoại */}
                    <div>
                        <label htmlFor="tel" className="block text-sm font-medium text-gray-700 mb-1">
                            Số điện thoại
                        </label>
                        <input
                            id="tel"
                            type="tel"
                            value={tel}
                            onChange={(e) => setTel(e.target.value)}
                            placeholder="09xxxxxxxx"
                            className="w-full px-4 py-2 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
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
                                placeholder="••••••••"
                                className="w-full px-4 py-2 pr-12 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-sm"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                <i className={showPassword ? "far fa-eye-slash" : "far fa-eye"}></i>
                            </button>
                        </div>
                    </div>

                    {/* Điều khoản dịch vụ (Thay thế nút Ghi nhớ của trang Login) */}
                    <div className="text-xs text-gray-500 pt-1 leading-normal">
                        Bằng việc đăng ký, bạn đồng ý với các{" "}
                        <a href="#" className="font-medium text-gray-700 hover:underline">Điều khoản dịch vụ</a> và{" "}
                        <a href="#" className="font-medium text-gray-700 hover:underline">Chính sách bảo mật</a> của chúng tôi.
                    </div>

                    {/* Nút Submit Đăng Ký */}
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition shadow-sm text-sm mt-2"
                    >
                        Tạo tài khoản
                    </button>
                </form>

                {/* Đường kẻ phân tách mạng xã hội */}
                <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">hoặc đăng ký bằng</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Đăng ký qua mạng xã hội */}
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
    );
}