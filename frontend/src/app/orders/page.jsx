import { getCurrentUser } from '@/lib/auth.server';
import { listOrders } from '@/lib/services/orders';
import OrdersClient from '@/features/orders/OrdersClient';
import { ORDERS_PER_PAGE } from '@/features/orders/orderConstants';

export default async function OrdersPage() {
    let initialOrders = [];
    let initialTotal = 0;

    const user = await getCurrentUser();
    if (user?.id) {
        try {
            const data = await listOrders(user.id, { limit: ORDERS_PER_PAGE, skip: 0 });
            initialOrders = data?.orders || [];
            initialTotal = data?.total || 0;
        } catch (err) {
            console.error('Không lấy được đơn hàng ban đầu:', err);
        }
    }
    // Nếu chưa đăng nhập, middleware đã chặn /orders từ trước, đây chỉ là phòng hờ.

    return <OrdersClient initialOrders={initialOrders} initialTotal={initialTotal} />;
}