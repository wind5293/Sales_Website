'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawner';

export default function SiteChrome({ username, isAdmin, children }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');

    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar username={username} isAdmin={isAdmin} />
            <CartDrawer />
            {children}
            <Footer />
        </>
    );
}