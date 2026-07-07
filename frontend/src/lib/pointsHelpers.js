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

export function generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let raw = '';
    for (let i = 0; i < 10; i++) {
        raw += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}