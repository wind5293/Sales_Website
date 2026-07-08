import { getCurrentUser } from '@/lib/auth.server';
import { listAddresses } from '@/lib/services/users';
import CheckoutClient from '@/features/checkout/CheckoutClient';

export default async function CheckoutPage() {
    let initialAddresses = [];

    const user = await getCurrentUser();
    if (user?.id) {
        try {
            const data = await listAddresses(user.id);
            initialAddresses = data?.addresses || [];
        } catch (err) {
            console.error('Không lấy được sổ địa chỉ ban đầu:', err);
        }
    }
    // Nếu chưa đăng nhập, middleware đã chặn /checkout từ trước, đây chỉ là phòng hờ.

    return <CheckoutClient initialAddresses={initialAddresses} />;
}