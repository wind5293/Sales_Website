// src/app/api/admin/users/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { PERMISSIONS } from '@/lib/permissions';
import { withApiError } from '@/lib/apiError';

function serializeUser(doc) {
    const d = { id: doc.id, ...doc.data() };
    delete d.password_hash;
    delete d.password;

    for (const field of ['createdAt', 'updatedAt', 'lastLoginAt']) {
        if (d[field]?.toDate) d[field] = d[field].toDate().toISOString();
    }

    return d;
}

export const GET = withApiError(async (req) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.USERS_VIEW);

    const { searchParams } = new URL(req.url);
    const skip = Number(searchParams.get('skip') || 0);
    const limit = Number(searchParams.get('limit') || 20);

    const collection = dbAdmin.collection('users');

    // Đếm tổng — dùng count() aggregation thay vì .select([]).stream() bên Python,
    // nhẹ hơn nhiều vì không cần tải toàn bộ document về client.
    const countSnap = await collection.count().get();
    const total = countSnap.data().count;

    const pageSnap = await collection.offset(skip).limit(limit).get();
    const users = pageSnap.docs.map(serializeUser);

    return Response.json({ users, total });
});