import { getAuthHeader } from '@/lib/auth.server';
import { apiServer } from '@/lib/api.server';
import CheckoutClient from '@/features/checkout/CheckoutClient';

export default async function CheckoutPage() {
    let initialAddresses = [];

    const authHeader = await getAuthHeader();
    if (authHeader) {
        try {
            const data = await apiServer('/api/users/addresses', { headers: authHeader });
            initialAddresses = data?.addresses || [];
        } catch (err) {
            console.error('Không lấy được sổ địa chỉ ban đầu:', err);
        }
    }
    // Nếu chưa đăng nhập, middleware đã chặn /checkout từ trước, đây chỉ là phòng hờ.

    return <CheckoutClient initialAddresses={initialAddresses} />;
}