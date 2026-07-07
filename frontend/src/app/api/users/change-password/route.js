import { getAuthHeader, safeJson } from '@/lib/apiProxy';

export async function POST(req) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
    });

    const data = await safeJson(res);
    return Response.json(data ?? {}, { status: res.status });
}