import { withApiError } from '@/lib/apiError';
import { searchProducts } from '@/lib/services/products';

export const GET = withApiError(async (req) => {
    const { searchParams } = new URL(req.url);

    const data = await searchProducts({
        q: searchParams.get('q') || '',
        categoryId: searchParams.get('categoryId') || undefined,
        limit: Number(searchParams.get('limit') || 20),
        skip: Number(searchParams.get('skip') || 0),
    });
    return Response.json(data);
});