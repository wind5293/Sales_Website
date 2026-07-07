import { withApiError } from '@/lib/apiError';
import { listCategories } from '@/lib/services/products';

export const GET = withApiError(async () => {
    const data = await listCategories();
    return Response.json(data);
});