// src/app/api/cart/item/[id]/route.js
import { cookies } from 'next/headers';

async function getAuthHeader() {
    const token = (await cookies()).get('auth_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function PATCH(req, { params }) {
    const { id } = await params;
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Vui lòng đăng nhập' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_URL}/api/cart/item/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
}

export async function DELETE(req, { params }) {
    const { id } = await params;
    const authHeader = await getAuthHeader();
    if (!authHeader) return Response.json({ detail: 'Vui lòng đăng nhập' }, { status: 401 });

    const res = await fetch(`${process.env.BACKEND_URL}/api/cart/item/${id}`, { method: 'DELETE', headers: authHeader });
    const data = await res.json();
    return Response.json(data, { status: res.status });
}