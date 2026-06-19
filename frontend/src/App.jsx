import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Homepage from "./pages/Homepage";
import SearchPage from "./pages/SearchPage";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";

function AppContent() {
    const [user, setUser] = useState('Welcome');
    const navigate = useNavigate();

    const checkLoginStatus = () => {
        const token = localStorage.getItem('auth_token');
        const savedUserName = localStorage.getItem('user_name');   
        setUser(token && savedUserName ? savedUserName : 'Welcome');
    }

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const handleLoginSuccess = (username) => {
        setUser(username);
    }

    const handleLogoutSuccess = () => {
        setUser('Welcome');
        navigate('/');
    }

    const handleSearchSubmit = (keyword) => {
        navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
    }

    const handleCartClick = () => {
        navigate('/cart');
    }

    return (
        <div>
            <Navbar
                username={user}
                onLogout={handleLogoutSuccess}
                onSearch={handleSearchSubmit}
                onCartClick={handleCartClick}
            />

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:id" element={<ProductDetail />} />
            </Routes>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}