import { cookies } from 'next/headers';

async function getAuthHeader() {
    const token = (await cookies()).get('auth_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function GET() {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Chưa đăng nhập' }, { status: 401 });

    const res = await fetch(`${process.env.BACKEND_URL}/api/users/me`, { headers: authHeader });
    const data = await res.json();
    return Response.json(data, { status: res.status });
}

export async function PATCH(req) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
}