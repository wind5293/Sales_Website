import { getAuthHeader } from '@/lib/auth.server';

export async function GET(req) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ orders: [], total: 0 }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();

    const res = await fetch(`${process.env.BACKEND_URL}/api/orders${query ? `?${query}` : ''}`, {
        headers: authHeader,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : { orders: [], total: 0 };
    return Response.json(data, { status: res.status });
}


export async function POST(req) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return Response.json(data, { status: res.status });
}