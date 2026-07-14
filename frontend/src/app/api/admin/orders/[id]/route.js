// src/app/api/admin/orders/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { PERMISSIONS } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';
import { restockOrderItems } from '@/lib/orderHelpers';
import { reversePendingPoints, confirmPendingPoints } from '@/lib/pointsHelpers';
import { ApiError, withApiError } from '@/lib/apiError';

const VALID_STATUSES = new Set(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']);
const VALID_PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'refunded']);
const FLOW = ['pending', 'confirmed', 'shipping', 'delivered'];

function serializeAdminOrder(doc) {
    const d = { id: doc.id, ...doc.data() };

    for (const field of ['createdAt', 'updatedAt']) {
        if (d[field]?.toDate) d[field] = d[field].toDate().toISOString();
    }

    if (typeof d.userId === 'string' && d.userId.length > 50) {
        d.userId = d.userId.slice(0, 20) + '...[token]';
    }

    if (!Array.isArray(d.items)) d.items = [];

    return d;
}

export const PATCH = withApiError(async (req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.ORDERS_UPDATE)

    const { id: orderId } = await params;
    const body = await req.json();

    const ref = dbAdmin.collection('orders').doc(orderId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }
    const current = doc.data();

    const updates = { updatedAt: new Date() };

    // ── status ──────────────────────────────────────────────────────────────
    if (body.status !== undefined && body.status !== null) {
        if (!VALID_STATUSES.has(body.status)) {
            throw new ApiError(400, `status không hợp lệ. Chọn một trong: ${[...VALID_STATUSES].join(', ')}`);
        }

        const currentStatus = current.status || 'pending';
        if (
            FLOW.includes(currentStatus) &&
            FLOW.includes(body.status) &&
            FLOW.indexOf(body.status) < FLOW.indexOf(currentStatus) &&
            body.status !== 'cancelled'
        ) {
            throw new ApiError(400, `Không thể chuyển ngược từ '${currentStatus}' về '${body.status}'`);
        }

        updates.status = body.status;

        // Tự động cập nhật paymentStatus khi delivered + COD
        if (body.status === 'delivered' && current.paymentMethod === 'cod') {
            if (updates.paymentStatus === undefined) {
                updates.paymentStatus = 'paid';
            }
        }

        if (body.status === 'delivered' && current.pointsConfirmed !== true) {
            await confirmPendingPoints(dbAdmin, {
                userId: current.userId,
                orderId,
                pointsEarned: current.pointsEarned || 0,
                alreadyConfirmed: current.pointsConfirmed === true,
            });
            updates.pointsConfirmed = true;
        }

        if (body.status === 'cancelled' && currentStatus !== 'cancelled' && currentStatus !== 'delivered') {
            await reversePendingPoints(dbAdmin, {
                userId: current.userId,
                orderId,
                pointsEarned: current.pointsEarned || 0,
                alreadyReversed: current.pointsReversed === true,
            });
            updates.pointsReversed = true;
        }
    }

    // ── paymentStatus ───────────────────────────────────────────────────────
    if (body.paymentStatus !== undefined && body.paymentStatus !== null) {
        if (!VALID_PAYMENT_STATUSES.has(body.paymentStatus)) {
            throw new ApiError(400, `paymentStatus không hợp lệ. Chọn một trong: ${[...VALID_PAYMENT_STATUSES].join(', ')}`);
        }
        updates.paymentStatus = body.paymentStatus;
    }

    // ── tracking_number / admin_notes ──────────────────────────────────────
    if (body.tracking_number !== undefined && body.tracking_number !== null) {
        updates.trackingNumber = String(body.tracking_number).trim();
    }
    if (body.admin_notes !== undefined && body.admin_notes !== null) {
        updates.adminNotes = String(body.admin_notes).trim();
    }

    if (Object.keys(updates).length === 1) {
        // chỉ có updatedAt → không có gì thay đổi
        throw new ApiError(400, 'Không có trường nào được cập nhật');
    }

    await ref.update(updates);

    const { updatedAt, ...changesWithoutTimestamp } = updates;
    await logAdminAction(dbAdmin, admin, {
        action: body.status ? 'update_order_status' : 'update_order',
        targetType: 'order',
        targetId: orderId,
        details: {
            changes: changesWithoutTimestamp,
            statusBefore: current.status,
        },
    });

    const updatedDoc = await ref.get();
    return Response.json({
        message: 'Cập nhật đơn hàng thành công',
        order: serializeAdminOrder(updatedDoc),
    });
});