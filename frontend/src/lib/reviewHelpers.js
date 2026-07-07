// src/lib/reviewHelpers.js
import { dbAdmin } from './firebaseAdmin';

export async function recalculateRating(productId) {
    const snap = await dbAdmin
        .collection('products')
        .doc(productId)
        .collection('reviews')
        .get();

    const total = snap.size;
    const sum = snap.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
    const avg = total ? Math.round((sum / total) * 100) / 100 : 0.0;

    await dbAdmin.collection('products').doc(productId).update({
        rating: avg,
        totalReviews: total,
        updatedAt: new Date(),
    });
}

/** Firestore Timestamp -> ISO string, giống datetime.isoformat() bên Python. */
export function tsToIso(value) {
    if (value && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    return value ?? null;
}

export function tsToMillis(value) {
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    return 0;
}