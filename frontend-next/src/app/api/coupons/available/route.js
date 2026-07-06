import { getAuthHeader } from '@/lib/auth.server';

export async function GET(req) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ coupons: [] }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();

    const res = await fetch(`${process.env.BACKEND_URL}/api/coupons/available${query ? `?${query}` : ''}`, {
        headers: authHeader,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : { coupons: [] };
    return Response.json(data, { status: res.status });
}