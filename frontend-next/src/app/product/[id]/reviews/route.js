// src/app/api/products/[id]/reviews/route.js
import { cookies } from 'next/headers';

// GET — không cần đăng nhập, chỉ chuyển tiếp nguyên request sang backend
export async function GET(req, { params }) {
    const { id } = await params;
    const { search } = new URL(req.url); // giữ nguyên ?limit=&skip=&sort_by=
    const res = await fetch(`${process.env.BACKEND_URL}/api/products/${id}/reviews${search}`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
}

// POST — bắt buộc đăng nhập, tự đọc cookie rồi gắn Authorization giúp client
export async function POST(req, { params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        return Response.json({ detail: 'Bạn cần đăng nhập để gửi đánh giá.' }, { status: 401 });
    }

    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_URL}/api/products/${id}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
}