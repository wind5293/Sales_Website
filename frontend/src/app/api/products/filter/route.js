import { withApiError } from '@/lib/apiError';
import { filterProducts } from '@/lib/services/products';

function parseOptionalBool(v) {
    if (v === null) return undefined;
    return v === 'true';
}

function parseOptionalNumber(v) {
    if (v === null || v === '') return undefined;
    return Number(v);
}

export const GET = withApiError(async (req) => {
    const { searchParams } = new URL(req.url);

    const data = await filterProducts({
        category: searchParams.get('category') || undefined,
        categoryId: searchParams.get('categoryId') || undefined,
        priceMin: parseOptionalNumber(searchParams.get('price_min')),
        priceMax: parseOptionalNumber(searchParams.get('price_max')),
        ratingMin: parseOptionalNumber(searchParams.get('rating_min')),
        inStock: parseOptionalBool(searchParams.get('in_stock')),
        limit: Number(searchParams.get('limit') || 20),
        skip: Number(searchParams.get('skip') || 0),
    });
    return Response.json(data);
});