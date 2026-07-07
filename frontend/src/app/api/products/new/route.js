import { withApiError } from '@/lib/apiError';
import { getNewProducts } from '@/lib/services/products';

export const GET = withApiError(async (req) => {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 8);

    const data = await getNewProducts({ limit });
    return Response.json(data);
});