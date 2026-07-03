// src/app/layout.jsx
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartProvider } from '@/context/CartContext';
import { getCurrentUser, getIsAdmin } from '@/lib/auth.server';
import CartDrawer from '@/components/CartDrawner';

export default async function RootLayout({ children }) {
    const user = await getCurrentUser();
    const isAdmin = await getIsAdmin();

    return (
        <html lang="vi">
            <body>
                <CartProvider>
                    <Navbar username={user?.name || 'Welcome'} isAdmin={isAdmin} />
                    <CartDrawer />
                    {children}
                    <Footer />
                </CartProvider>
            </body>
        </html>
    );
}