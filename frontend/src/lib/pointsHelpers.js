// src/lib/pointsHelpers.js

// Port trực tiếp từ app/core/constants.py — single source of truth, không tự đổi giá trị.
export const RANK_THRESHOLDS = { Silver: 0, Gold: 500, Diamond: 2000 };
export const VALID_RANKS = new Set(Object.keys(RANK_THRESHOLDS));

/** Tương đương compute_rank() bên Python. */
export function computeRank(points) {
    if (points >= RANK_THRESHOLDS.Diamond) return 'Diamond';
    if (points >= RANK_THRESHOLDS.Gold) return 'Gold';
    return 'Silver';
}

export const POINTS_TO_VND = 1000;

export function pointsToNextRank(points) {
    if (points < RANK_THRESHOLDS.Gold) return RANK_THRESHOLDS.Gold - points;
    if (points < RANK_THRESHOLDS.Diamond) return RANK_THRESHOLDS.Diamond - points;
    return null;
}

export function nextRankName(rank) {
    if (rank === 'Silver') return 'Gold';
    if (rank === 'Gold') return 'Diamond';
    return null;
}

export async function logPointsTransaction(dbAdmin, { userId, delta, reason, orderId = null }) {
    await dbAdmin.collection('points_history').add({
        userId,
        delta,
        reason,
        orderId,
        createdAt: new Date(),
    });
}

export async function reversePendingPoints(dbAdmin, { userId, orderId, pointsEarned, alreadyReversed }) {
    if (!pointsEarned || pointsEarned <= 0 || alreadyReversed) {
        return { reversed: false };
    }

    const userRef = dbAdmin.collection('users').doc(userId);
    const result = await dbAdmin.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return null;

        const userData = snap.data();
        const newPending = Math.max(0, (userData.pendingPoints || 0) - pointsEarned);
        tx.update(userRef, { pendingPoints: newPending });
        return { newPending };
    });

    if (!result) return { reversed: false };

    await logPointsTransaction(dbAdmin, {
        userId,
        delta: -pointsEarned,
        reason: `Huỷ điểm chờ xác nhận do huỷ đơn hàng ${orderId}`,
        orderId,
        pointsType: 'pending',
    });

    return { reversed: true, ...result };
}

export async function confirmPendingPoints(dbAdmin, { userId, orderId, pointsEarned, alreadyConfirmed }) {
    if (!pointsEarned || pointsEarned <= 0 || alreadyConfirmed) {
        return { confirmed: false };
    }

    const userRef = dbAdmin.collection('users').doc(userId);
    const result = await dbAdmin.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return null;

        const userData = snap.data();
        const newPending = Math.max(0, (userData.pendingPoints || 0) - pointsEarned);
        const newPoints = (userData.points || 0) + pointsEarned;
        const newRank = computeRank(newPoints);
        tx.update(userRef, { pendingPoints: newPending, points: newPoints, rank: newRank });
        return { newPending, newPoints, newRank };
    });

    if (!result) return { confirmed: false };

    await logPointsTransaction(dbAdmin, {
        userId,
        delta: pointsEarned,
        reason: `Xác nhận điểm từ đơn hàng ${orderId} (đã giao thành công)`,
        orderId,
        pointsType: 'confirmed',
    });

    return { confirmed: true, ...result };
}

export function generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let raw = '';
    for (let i = 0; i < 10; i++) {
        raw += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}