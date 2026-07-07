// src/app/api/users/points/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { tsToIso } from '@/lib/reviewHelpers';
import { computeRank, pointsToNextRank, nextRankName } from '@/lib/pointsHelpers';

export const GET = withApiError(async () => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const userDoc = await dbAdmin.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new ApiError(404, 'Không tìm thấy người dùng');
    }

    const userData = userDoc.data();
    const points = userData.points || 0;
    const rank = computeRank(points);

    // ⚠️ Cần composite index: userId (==) + createdAt (orderBy).
    const historySnap = await dbAdmin
        .collection('points_history')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    const history = historySnap.docs.map((doc) => {
        const d = doc.data();
        return { ...d, createdAt: tsToIso(d.createdAt) };
    });

    return Response.json({
        points,
        rank,
        pointsToNextRank: pointsToNextRank(points),
        nextRank: nextRankName(rank),
        history,
    });
});