// src/app/api/admin/audit-logs/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { PERMISSIONS } from '@/lib/permissions';
import { withApiError } from '@/lib/apiError';

function serializeLog(doc) {
    const d = { id: doc.id, ...doc.data() };
    if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString();
    return d;
}

// ── GET /api/admin/audit-logs — danh sách (phân trang + lọc) ────────────────

export const GET = withApiError(async (req) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.AUDIT_VIEW)

    const { searchParams } = new URL(req.url);
    const skip = Number(searchParams.get('skip') || 0);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);
    const targetType = searchParams.get('targetType') || null; // user | order | product
    const action = searchParams.get('action') || null;
    const adminEmail = searchParams.get('adminEmail') || null;

    let query = dbAdmin.collection('audit_logs').orderBy('createdAt', 'desc');
    if (targetType) query = query.where('targetType', '==', targetType);
    if (action) query = query.where('action', '==', action);

    const hasPythonFilter = Boolean(adminEmail);

    if (!hasPythonFilter) {
        const totalSnap = await query.get();
        const total = totalSnap.size;

        const pageSnap = await query.offset(skip).limit(limit).get();
        const logs = pageSnap.docs.map(serializeLog);

        return Response.json({ logs, total });
    }

    const snap = await query.get();
    let all = snap.docs.map(serializeLog);

    const emailLower = adminEmail.trim().toLowerCase();
    all = all.filter((d) => (d.adminEmail || '').toLowerCase().includes(emailLower));

    const total = all.length;
    return Response.json({ logs: all.slice(skip, skip + limit), total });
});