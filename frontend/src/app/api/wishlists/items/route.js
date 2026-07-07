// src/app/api/wishlists/items/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { withApiError } from '@/lib/apiError';
import { tsToIso } from '@/lib/reviewHelpers'; // helper dùng chung, không riêng cho reviews

export const GET = withApiError(async () => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    // ⚠️ Cần composite index: userId (==) + addedAt (orderBy).
    // Nếu thiếu, Firestore trả FAILED_PRECONDITION kèm link tạo index — tạo theo link đó.
    const snap = await dbAdmin
        .collection('wishlists')
        .where('userId', '==', uid)
        .orderBy('addedAt', 'desc')
        .get();

    const items = [];
    for (const doc of snap.docs) {
        const entry = doc.data();
        const productId = entry.productId;

        const productDoc = await dbAdmin.collection('products').doc(productId).get();
        if (!productDoc.exists) continue; // Bỏ qua sản phẩm đã bị xóa

        const product = { id: productId, ...productDoc.data() };

        items.push({
            wishlistId: doc.id,
            addedAt: tsToIso(entry.addedAt),
            product,
        });
    }

    return Response.json({ items, total: items.length });
});