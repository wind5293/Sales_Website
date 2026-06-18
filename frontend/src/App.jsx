import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Homepage from "./pages/Homepage";

export default function App() {
    const [currentPage, setCurrentPage] = useState('home'); 
    const [user, setUser] = useState('Welcome');

    const checkLoginStatus = () => {
        const token = localStorage.getItem('auth_token');
        const savedUserName = localStorage.getItem('user_name');

        if (token && savedUserName) {
            setUser(savedUserName);
        } else {
            setUser('Welcome');
        }
    };

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const handleNavigate = (pageName) => {
        setCurrentPage(pageName);
    };

    const handleLoginSuccess = (username) => {
        setUser(username);
        setCurrentPage('home');
    };

    const handleLogoutSuccess = () => {
        setUser('Welcome');
        setCurrentPage('home');
    };

    return (
        <div>
            <Navbar 
                onNavigate={handleNavigate} 
                username={user} 
                onLogout={handleLogoutSuccess} 
            />

            {currentPage === 'home' && <Homepage />}
            {currentPage === 'login' && <Login onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />}
            {currentPage === 'signup' && <Signup onNavigate={handleNavigate} />}
        </div>
    );
}