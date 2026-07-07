// src/app/api/wishlists/items/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

export const POST = withApiError(async (req, { params }) => {
    const { productId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const productDoc = await dbAdmin.collection('products').doc(productId).get();
    if (!productDoc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const existingSnap = await dbAdmin
        .collection('wishlists')
        .where('userId', '==', uid)
        .where('productId', '==', productId)
        .limit(1)
        .get();

    if (!existingSnap.empty) {
        throw new ApiError(409, 'Sản phẩm đã có trong danh sách yêu thích');
    }

    const ref = await dbAdmin.collection('wishlists').add({
        userId: uid,
        productId,
        addedAt: new Date(),
    });

    return Response.json(
        { message: 'Đã thêm vào danh sách yêu thích', wishlistId: ref.id, productId },
        { status: 201 }
    );
});

export const DELETE = withApiError(async (req, { params }) => {
    const { productId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const snap = await dbAdmin
        .collection('wishlists')
        .where('userId', '==', uid)
        .where('productId', '==', productId)
        .limit(1)
        .get();

    if (snap.empty) {
        throw new ApiError(404, 'Sản phẩm không có trong danh sách yêu thích');
    }

    await snap.docs[0].ref.delete();
    return Response.json({ message: 'Đã xóa khỏi danh sách yêu thích', productId });
});