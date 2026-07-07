// src/app/api/products/[id]/reviews/route.js
import { dbAdmin, authAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { recalculateRating, tsToIso, tsToMillis } from '@/lib/reviewHelpers';

// GET /api/products/{id}/reviews — không cần đăng nhập
export const GET = withApiError(async (req, { params }) => {
    const { id: productId } = await params;
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);
    const sortBy = searchParams.get('sort_by') === 'rating' ? 'rating' : 'date';

    const productRef = dbAdmin.collection('products').doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const snap = await productRef.collection('reviews').get();
    let reviews = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const total = reviews.length;
    const avgRating = total
        ? Math.round((reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total) * 100) / 100
        : 0.0;

    reviews.sort((a, b) =>
        sortBy === 'rating'
            ? (b.rating || 0) - (a.rating || 0)
            : tsToMillis(b.createdAt) - tsToMillis(a.createdAt)
    );

    const paginated = reviews.slice(skip, skip + limit).map((r) => ({
        ...r,
        createdAt: tsToIso(r.createdAt),
        updatedAt: tsToIso(r.updatedAt),
    }));

    return Response.json({ reviews: paginated, total, avg_rating: avgRating, limit, skip });
});

// POST /api/products/{id}/reviews — bắt buộc đăng nhập
export const POST = withApiError(async (req, { params }) => {
    const { id: productId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();
    const rating = Number(body.rating);
    const title = body.title ?? null;
    const text = body.text;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ApiError(422, 'rating phải là số nguyên từ 1 đến 5');
    }
    if (!text || typeof text !== 'string' || text.length < 1 || text.length > 2000) {
        throw new ApiError(422, 'text không hợp lệ (1-2000 ký tự)');
    }
    if (title !== null && String(title).length > 200) {
        throw new ApiError(422, 'title không hợp lệ (tối đa 200 ký tự)');
    }

    const productRef = dbAdmin.collection('products').doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const reviewsCol = productRef.collection('reviews');

    // Mỗi user chỉ review 1 lần / sản phẩm
    const existingSnap = await reviewsCol.where('userId', '==', uid).limit(1).get();
    if (!existingSnap.empty) {
        throw new ApiError(
            409,
            'Bạn đã đánh giá sản phẩm này rồi. Hãy chỉnh sửa đánh giá hiện tại.'
        );
    }

    // Kiểm tra đã mua và nhận hàng chưa (2 filter == , không cần composite index)
    const deliveredOrdersSnap = await dbAdmin
        .collection('orders')
        .where('userId', '==', uid)
        .where('status', '==', 'delivered')
        .get();

    const hasPurchased = deliveredOrdersSnap.docs.some((order) =>
        (order.data().items || []).some((item) => item.productId === productId)
    );
    if (!hasPurchased) {
        throw new ApiError(403, 'Bạn cần mua và nhận sản phẩm này trước khi đánh giá');
    }

    let userName = 'Ẩn danh';
    try {
        const userRecord = await authAdmin.getUser(uid);
        userName = userRecord.displayName || 'Ẩn danh';
    } catch {
        userName = 'Ẩn danh';
    }

    const now = new Date();
    const ref = await reviewsCol.add({
        userId: uid,
        userName,
        rating,
        title,
        text,
        productId,
        verifiedPurchase: true,
        createdAt: now,
        updatedAt: now,
    });

    await recalculateRating(productId);

    return Response.json(
        { review_id: ref.id, message: 'Đánh giá đã được gửi thành công' },
        { status: 201 }
    );
});