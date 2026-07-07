// src/app/api/reviews/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { recalculateRating, tsToIso } from '@/lib/reviewHelpers';

function getProductId(req) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id');
    if (!productId) {
        throw new ApiError(422, 'Thiếu tham số product_id');
    }
    return productId;
}

export const PATCH = withApiError(async (req, { params }) => {
    const { id: reviewId } = await params;
    const productId = getProductId(req);
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();

    const ref = dbAdmin
        .collection('products')
        .doc(productId)
        .collection('reviews')
        .doc(reviewId);

    const doc = await ref.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    if (doc.data().userId !== uid) {
        throw new ApiError(403, 'Bạn không có quyền chỉnh sửa đánh giá này');
    }

    const updates = {};
    if (body.rating !== undefined && body.rating !== null) {
        const rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ApiError(422, 'rating phải là số nguyên từ 1 đến 5');
        }
        updates.rating = rating;
    }
    if (body.title !== undefined && body.title !== null) {
        if (String(body.title).length > 200) {
            throw new ApiError(422, 'title không hợp lệ (tối đa 200 ký tự)');
        }
        updates.title = body.title;
    }
    if (body.text !== undefined && body.text !== null) {
        if (String(body.text).length < 1 || String(body.text).length > 2000) {
            throw new ApiError(422, 'text không hợp lệ (1-2000 ký tự)');
        }
        updates.text = body.text;
    }

    updates.updatedAt = new Date();
    await ref.update(updates);

    if ('rating' in updates) {
        await recalculateRating(productId);
    }

    const updatedDoc = await ref.get();
    const updatedData = updatedDoc.data();
    const updated = {
        id: reviewId,
        ...updatedData,
        createdAt: tsToIso(updatedData.createdAt),
        updatedAt: tsToIso(updatedData.updatedAt),
    };

    return Response.json({ message: 'Cập nhật đánh giá thành công', review: updated });
});

export const DELETE = withApiError(async (req, { params }) => {
    const { id: reviewId } = await params;
    const productId = getProductId(req);
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const ref = dbAdmin
        .collection('products')
        .doc(productId)
        .collection('reviews')
        .doc(reviewId);

    const doc = await ref.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    if (doc.data().userId !== uid) {
        throw new ApiError(403, 'Bạn không có quyền xóa đánh giá này');
    }

    await ref.delete();
    await recalculateRating(productId);

    return Response.json({ message: 'Đã xóa đánh giá thành công' });
});