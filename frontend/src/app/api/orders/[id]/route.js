import { getAuthHeader } from '@/lib/auth.server';

export async function GET(req, { params }) {
    const { id } = await params;
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Chưa đăng nhập' }, { status: 401 });

    const res = await fetch(`${process.env.BACKEND_URL}/api/orders/${id}`, {
        headers: authHeader,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return Response.json(data, { status: res.status });
}