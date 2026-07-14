// src/app/api/admin/orders/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { PERMISSIONS } from '@/lib/permissions';
import { ApiError, withApiError } from '@/lib/apiError';

const VALID_STATUSES = new Set(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']);
const VALID_PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'refunded']);

// Serializer riêng cho admin — khác serializeOrder() dùng ở route user-facing
// vì cần che bớt userId (khi nó đang lưu JWT token dài).
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

export const GET = withApiError(async (req) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.ORDERS_VIEW)

    const { searchParams } = new URL(req.url);
    const skip = Number(searchParams.get('skip') || 0);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);
    const status = searchParams.get('status') || null;
    const paymentStatus = searchParams.get('paymentStatus') || null;
    const paymentMethod = searchParams.get('paymentMethod') || null;
    const dateFrom = searchParams.get('date_from') || null; // ISO date: 2026-06-01
    const dateTo = searchParams.get('date_to') || null;
    const q = searchParams.get('q') || null;

    let query = dbAdmin.collection('orders').orderBy('createdAt', 'desc');

    if (status) {
        if (!VALID_STATUSES.has(status)) {
            throw new ApiError(400, `status không hợp lệ. Chọn một trong: ${[...VALID_STATUSES].join(', ')}`);
        }
        query = query.where('status', '==', status);
    }

    if (paymentStatus) {
        if (!VALID_PAYMENT_STATUSES.has(paymentStatus)) {
            throw new ApiError(400, `paymentStatus không hợp lệ. Chọn một trong: ${[...VALID_PAYMENT_STATUSES].join(', ')}`);
        }
        query = query.where('paymentStatus', '==', paymentStatus);
    }

    if (paymentMethod) {
        query = query.where('paymentMethod', '==', paymentMethod);
    }

    const hasInMemoryFilter = Boolean(dateFrom || dateTo || q);

    if (!hasInMemoryFilter) {
        const totalSnap = await query.get();
        const total = totalSnap.size;
        const revenue = totalSnap.docs.reduce((sum, doc) => sum + (doc.data().totalPrice || 0), 0);

        const pageSnap = await query.offset(skip).limit(limit).get();
        const orders = pageSnap.docs.map(serializeAdminOrder);

        return Response.json({
            orders,
            total,
            revenue,
            page: Math.floor(skip / limit),
            pages: Math.ceil(total / limit),
        });
    }

    const snap = await query.get();
    let all = snap.docs.map(serializeAdminOrder);

    if (dateFrom) {
        const dtFrom = new Date(dateFrom);
        if (Number.isNaN(dtFrom.getTime())) {
            throw new ApiError(400, 'date_from không hợp lệ, dùng định dạng YYYY-MM-DD');
        }
        const isoFrom = dtFrom.toISOString();
        all = all.filter((d) => d.createdAt && d.createdAt >= isoFrom);
    }

    if (dateTo) {
        const dtTo = new Date(dateTo);
        if (Number.isNaN(dtTo.getTime())) {
            throw new ApiError(400, 'date_to không hợp lệ, dùng định dạng YYYY-MM-DD');
        }
        dtTo.setHours(23, 59, 59, 999);
        const isoTo = dtTo.toISOString();
        all = all.filter((d) => d.createdAt && d.createdAt <= isoTo);
    }

    if (q) {
        const qLower = q.trim().toLowerCase();
        all = all.filter(
            (d) =>
                (d.recipientName || '').toLowerCase().includes(qLower) ||
                (d.phone || '').toLowerCase().includes(qLower)
        );
    }

    const total = all.length;
    const revenue = all.reduce((sum, d) => sum + (d.totalPrice || 0), 0);

    return Response.json({
        orders: all.slice(skip, skip + limit),
        total,
        revenue,
        page: Math.floor(skip / limit),
        pages: Math.ceil(total / limit),
    });
});