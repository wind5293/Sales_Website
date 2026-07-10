import { NextResponse } from 'next/server';
import { getCrossSellSuggestions } from '@/lib/services/products';
import { ApiError } from '@/lib/apiError';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = Number(searchParams.get('limit')) || 8;

    if (!productId) {
        return NextResponse.json({ error: 'Thiếu tham số productId' }, { status: 400 });
    }

    try {
        const { products } = await getCrossSellSuggestions(productId, { limit });
        return NextResponse.json({ products });
    } catch (err) {
        if (err instanceof ApiError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error('GET /api/cart/cross-sell error:', err);
        return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 });
    }
}