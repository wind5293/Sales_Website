import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import axios from "axios";
import { CartProvider, useCart } from "./context/CartContext";
import CheckoutPage from "./pages/CheckoutPage";
import CartDrawner from "./components/CartDrawner";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Homepage from "./pages/Homepage";
import SearchPage from "./pages/SearchPage";
import ProductDetail from "./pages/ProductDetail";
import CategoryPage from "./pages/CategoryPage";
import Footer from "./components/Footer";
import Profile from "./pages/Profile";
import AddressBook from "./pages/AddressBook";
import ChangePassword from "./pages/ChangePassword";
import Orders from "./pages/Orders";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { isTokenExpired, clearAuthData } from "./utils/auth";

function CategoryRedirect() {
    const { categoryId } = useParams();
    return <Navigate to={`/search?category=${categoryId}`} replace />;
}

const AppContent = () => {
    const [user, setUser] = useState('Welcome');
    const [userId, setUserId] = useState(null)
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");

    const { openCart } = useCart();

    const checkLoginStatus = () => {
        const token = localStorage.getItem('auth_token');
        const savedUserName = localStorage.getItem('user_name');
        const savedUserId = localStorage.getItem('user_data')
            ? JSON.parse(localStorage.getItem('user_data')).uid
            : null;

        setUser(token && savedUserName ? savedUserName : 'Welcome');
        setUserId(token ? savedUserId : null);
    }

    useEffect(() => {
        const checkToken = () => {
            const token = localStorage.getItem('auth_token');
            const adminInfo = localStorage.getItem('admin_info');

            if (isTokenExpired(token)) {
                if (adminInfo) {
                    const savedUserName = localStorage.getItem('user_name');
                    setUser(savedUserName || 'Admin');
                } else {
                    clearAuthData();
                    setUser('Welcome');
                    setUserId(null);
                }
                return;
            }
            const savedUserName = localStorage.getItem('user_name');
            const savedUserId = localStorage.getItem('user_data')
                ? JSON.parse(localStorage.getItem('user_data')).uid
                : null;
            setUser(savedUserName || 'Welcome');
            setUserId(savedUserId);
        };

        checkToken();
        const interval = setInterval(checkToken, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLoginSuccess = (username) => {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        setUser(localStorage.getItem('user_name') || username);
        setUserId(userData.uid || null);
    }

    const handleLogoutSuccess = () => {
        setUser('Welcome');
        setUserId(null);
        navigate('/');
    }

    const handleSearchSubmit = (keyword) => {
        navigate(`/search?q=${encodeURIComponent(keyword)}`);
    }

    const handleCartClick = () => {
        navigate('/cart');
    }

    return (
        <div>
            {!isAdmin && (
                <Navbar
                    username={user}
                    onLogout={handleLogoutSuccess}
                    onSearch={handleSearchSubmit}
                    onCartClick={openCart}
                />
            )}

            <CartDrawner />

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/search" element={<SearchPage />} />
                <Route
                    path="/product/:id"
                    element={
                        <ProductDetail
                            currentUserId={userId}
                            currentUserName={localStorage.getItem('user_name')}
                        />
                    }
                />
                <Route path="/category/:categoryId" element={<CategoryRedirect />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/addresses" element={<AddressBook />} />
                <Route path="/profile/change-password" element={<ChangePassword />} />
                <Route path="/orders" element={<Orders />} />

                <Route 
                    path="/admin/*"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }    
                />
            </Routes>

            {!isAdmin && (<Footer />)}
        </div>

    );
}

export default function App() {
    return (
        <BrowserRouter>
            <CartProvider>
                <AppContent />
            </CartProvider>
        </BrowserRouter >
    );
}