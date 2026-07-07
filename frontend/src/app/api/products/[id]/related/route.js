import { withApiError } from '@/lib/apiError';
import { getRelatedProducts } from '@/lib/services/products';

export const GET = withApiError(async (req, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 8);

    const data = await getRelatedProducts(id, { limit });
    return Response.json(data);
});