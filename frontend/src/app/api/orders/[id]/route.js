// src/app/api/orders/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { serializeOrder } from '@/lib/orderHelpers';

export const GET = withApiError(async (req, { params }) => {
    const { id: orderId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const doc = await dbAdmin.collection('orders').doc(orderId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Đơn hàng không tồn tại');
    }

    const order = serializeOrder(doc);
    if (order.userId !== uid) {
        throw new ApiError(403, 'Không có quyền truy cập đơn hàng này');
    }

    return Response.json(order);
});