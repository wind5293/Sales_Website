import { withApiError } from '@/lib/apiError';
import { listProducts } from '@/lib/services/products';

export const GET = withApiError(async (req) => {
    const { searchParams } = new URL(req.url);

    const categoryId = searchParams.get('categoryId') || undefined;
    const status = searchParams.has('status') ? searchParams.get('status') : 'active';
    const isFeaturedRaw = searchParams.get('isFeatured');
    const isFeatured = isFeaturedRaw === null ? undefined : isFeaturedRaw === 'true';
    const limit = Number(searchParams.get('limit') || 20);

    const data = await listProducts({ categoryId, status, isFeatured, limit });
    return Response.json(data);
});