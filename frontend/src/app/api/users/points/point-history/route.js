// src/app/api/users/points-history/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { withApiError } from '@/lib/apiError';
import { tsToIso } from '@/lib/reviewHelpers';

export const GET = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const snap = await dbAdmin
        .collection('points_history')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    const transactions = snap.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, ...d, createdAt: tsToIso(d.createdAt) };
    });

    return Response.json({ transactions, total: transactions.length });
});