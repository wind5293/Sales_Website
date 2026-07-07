// src/app/api/products/[id]/rating/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { ApiError, withApiError } from '@/lib/apiError';

export const GET = withApiError(async (req, { params }) => {
    const { id: productId } = await params;
    const doc = await dbAdmin.collection('products').doc(productId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }
    const data = doc.data();
    return Response.json({
        avg_rating: data.rating ?? 0.0,
        total_reviews: data.totalReviews ?? 0,
    });
});