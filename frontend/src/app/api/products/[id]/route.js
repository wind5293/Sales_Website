import { withApiError } from '@/lib/apiError';
import { getProduct } from '@/lib/services/products';

export const GET = withApiError(async (req, { params }) => {
    const { id } = await params;
    const data = await getProduct(id);
    return Response.json(data);
});