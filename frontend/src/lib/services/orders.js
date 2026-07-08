// src/lib/services/orders.js
//
// Dùng chung cho cả route.js (client gọi qua fetch) lẫn Server Component
// (page.jsx gọi thẳng trong lúc SSR, không cần vòng qua HTTP self-fetch).

import { dbAdmin } from '@/lib/firebaseAdmin';
import { serializeOrder } from '@/lib/orderHelpers';

/** GET /api/orders — đơn hàng của 1 user, có filter status + phân trang */
export async function listOrders(uid, { status, limit = 20, skip = 0 } = {}) {
    const cappedLimit = Math.min(limit, 100);
    const safeSkip = Math.max(skip, 0);

    // ⚠️ Cần composite index: userId (==) + createdAt (orderBy), và thêm
    // status (==) + userId (==) + createdAt (orderBy) nếu có filter status.
    let query = dbAdmin
        .collection('orders')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc');

    if (status) {
        query = query.where('status', '==', status);
    }

    const allSnap = await query.get();
    const total = allSnap.size;

    const paginatedSnap = await query.offset(safeSkip).limit(cappedLimit).get();
    const orders = paginatedSnap.docs.map(serializeOrder);

    return { orders, total };
}