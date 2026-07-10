// src/app/api/products/[id]/variants/route.js
import { NextResponse } from 'next/server';
import { getProduct, getProductGroupVariants } from '@/lib/services/products';
import { ApiError } from '@/lib/apiError';

// GET /api/products/{id}/variants
export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const product = await getProduct(id);
        const variants = await getProductGroupVariants(product.productGroupId);
        return NextResponse.json({ variants });
    } catch (err) {
        if (err instanceof ApiError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error('GET /api/products/[id]/variants error:', err);
        return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 });
    }
}