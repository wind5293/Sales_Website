// src/app/api/users/redeem-points/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { computeRank, generateVoucherCode, POINTS_TO_VND } from '@/lib/pointsHelpers';

export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();
    const pointsToRedeem = Number(body.points_to_redeem);
    if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
        throw new ApiError(422, 'points_to_redeem phải là số nguyên dương');
    }

    const discountAmount = pointsToRedeem * POINTS_TO_VND;
    const voucherCode = generateVoucherCode();
    const userRef = dbAdmin.collection('users').doc(uid);

    const { newPoints, newRank } = await dbAdmin.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new ApiError(404, 'Không tìm thấy người dùng');
        }

        const currentPoints = userSnap.data().points || 0;
        if (pointsToRedeem > currentPoints) {
            throw new ApiError(
                400,
                `Không đủ điểm. Bạn có ${currentPoints} điểm, cần ${pointsToRedeem} điểm.`
            );
        }

        const newPoints = currentPoints - pointsToRedeem;
        const newRank = computeRank(newPoints);

        const voucherRef = dbAdmin.collection('coupons').doc(voucherCode);
        tx.set(voucherRef, {
            code: voucherCode,
            type: 'points_redeem',
            discountAmount,
            discountPercent: null,
            userId: uid,
            isUsed: false,
            maxUses: 1,
            usedCount: 0,
            minOrder: 0,
            validUntil: null,
            isActive: true,
            createdAt: new Date(),
        });
        tx.update(userRef, { points: newPoints, rank: newRank });

        return { newPoints, newRank };
    });

    // Ghi log sau khi transaction thành công (giống thứ tự bên FastAPI)
    await dbAdmin.collection('points_history').add({
        userId: uid,
        delta: -pointsToRedeem,
        reason: `Đổi ${pointsToRedeem} điểm lấy voucher ${voucherCode}`,
        orderId: null,
        createdAt: new Date(),
    });

    return Response.json({
        message: 'Đổi điểm thành công!',
        voucherCode,
        discountAmount,
        remainingPoints: newPoints,
        rank: newRank,
    });
});