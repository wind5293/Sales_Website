// src/app/api/admin/users/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';
import { ApiError, withApiError } from '@/lib/apiError';
import { PERMISSIONS } from '@/lib/permissions';

const VALID_RANKS = new Set(['Silver', 'Gold', 'Diamond']);

function serializeUser(doc) {
    const d = { id: doc.id, ...doc.data() };
    delete d.password_hash;
    delete d.password;

    for (const field of ['createdAt', 'updatedAt', 'lastLoginAt']) {
        if (d[field]?.toDate) d[field] = d[field].toDate().toISOString();
    }

    return d;
}

// ── PATCH /api/admin/users/{id} — ban, đổi rank, sửa điểm ──────────────────

export const PATCH = withApiError(async (req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.USERS_EDIT);
    const { id: userId } = await params;
    const body = await req.json();

    const userRef = dbAdmin.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy người dùng');
    }

    if (body.rank !== undefined && body.rank !== null && !VALID_RANKS.has(body.rank)) {
        throw new ApiError(400, `Hạng không hợp lệ. Chấp nhận: ${[...VALID_RANKS].sort().join(', ')}`);
    }

    if (body.points !== undefined && body.points !== null && body.points < 0) {
        throw new ApiError(400, 'Điểm tích lũy không được âm');
    }

    const updates = { updatedAt: new Date() };
    if (body.is_banned !== undefined && body.is_banned !== null) {
        updates.is_banned = body.is_banned;
    }
    if (body.rank !== undefined && body.rank !== null) {
        updates.rank = body.rank;
    }
    if (body.points !== undefined && body.points !== null) {
        updates.points = body.points;
    }

    await userRef.update(updates);
    const updatedDoc = await userRef.get();
    const updated = serializeUser(updatedDoc);

    const { updatedAt, ...changesWithoutTimestamp } = updates;
    await logAdminAction(dbAdmin, admin, {
        action: 'update_user',
        targetType: 'user',
        targetId: userId,
        details: { changes: changesWithoutTimestamp },
    });

    return Response.json({ message: 'Cập nhật người dùng thành công', user: updated });
});

// ── DELETE /api/admin/users/{id} — xoá (ẩn danh) tài khoản ──────────────────

export const DELETE = withApiError(async (_req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.USERS_DELETE);

    const { id: userId } = await params;
    const userRef = dbAdmin.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy người dùng');
    }

    if (doc.data().deleted) {
        throw new ApiError(400, 'Tài khoản này đã bị xóa trước đó');
    }

    const now = new Date();

    // Xoá các subcollection addresses + cart
    for (const sub of ['addresses', 'cart']) {
        const subSnap = await userRef.collection(sub).get();
        await Promise.all(subSnap.docs.map((d) => d.ref.delete()));
    }

    await userRef.update({
        deleted: true,
        deletedAt: now,
        is_banned: true,
        email: `deleted-${userId}@removed.local`,
        name: 'Người dùng đã xóa',
        phone: '',
        photoURL: '',
        updatedAt: now,
    });

    // Ẩn danh thông tin người nhận trên các đơn hàng cũ của user này
    const ordersSnap = await dbAdmin.collection('orders').where('userId', '==', userId).get();
    await Promise.all(
        ordersSnap.docs.map((orderDoc) =>
            orderDoc.ref.update({
                recipientName: 'Người dùng đã xóa',
                phone: '',
                shippingAddress: '',
                note: '',
                updatedAt: now,
            })
        )
    );

    await logAdminAction(dbAdmin, admin, {
        action: 'delete_user',
        targetType: 'user',
        targetId: userId,
    });

    return Response.json({ message: 'Đã xóa (ẩn danh) tài khoản người dùng thành công' });
});