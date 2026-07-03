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
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                />
            </head>
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