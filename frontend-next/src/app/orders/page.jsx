import { apiServer } from '@/lib/api.server';
import OrdersClient from '@/features/orders/OrdersClient';
import { ORDERS_PER_PAGE } from '@/features/orders/orderConstants';

export default async function OrdersPage() {
    let initialOrders = [];
    let initialTotal = 0;

    try {
        const data = await apiServer(`/api/orders?skip=0&limit=${ORDERS_PER_PAGE}`);
        initialOrders = data?.orders || [];
        initialTotal = data?.total || 0;
    } catch {
        // middleware đã chặn nếu thiếu cookie; đây chỉ là phòng hờ lỗi mạng/backend
    }

    return <OrdersClient initialOrders={initialOrders} initialTotal={initialTotal} />;
}