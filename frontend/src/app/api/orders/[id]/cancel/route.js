// src/app/api/orders/[id]/cancel/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { restockOrderItems } from '@/lib/orderHelpers';

export const PATCH = withApiError(async (req, { params }) => {
    const { id: orderId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const ref = dbAdmin.collection('orders').doc(orderId);
    const doc = await ref.get();

    if (!doc.exists) {
        throw new ApiError(404, 'Đơn hàng không tồn tại');
    }

    const order = doc.data();
    if (order.userId !== uid) {
        throw new ApiError(403, 'Không có quyền huỷ đơn hàng này');
    }
    if (order.status !== 'pending') {
        throw new ApiError(400, `Không thể huỷ đơn ở trạng thái '${order.status}'`);
    }

    // Hoàn lại tồn kho
    await restockOrderItems(order.items || []);

    await reversePendingPoints(dbAdmin, {
        userId: order.userId,
        orderId,
        pointsEarned: order.pointsEarned || 0,
        alreadyReversed: order.pointsReversed === true,
    });

    await ref.update({ status: 'cancelled', pointsReversed: true, updatedAt: new Date() });
    return Response.json({ message: 'Đã huỷ đơn hàng' });
});