// src/app/api/auth/logout/route.js
export async function POST() {
    const res = Response.json({ message: 'Đã đăng xuất' });
    const expired = 'Path=/; Max-Age=0';

    res.headers.append('Set-Cookie', `auth_token=; HttpOnly; ${expired}`);
    res.headers.append('Set-Cookie', `user_name=; ${expired}`);
    res.headers.append('Set-Cookie', `user_data=; HttpOnly; ${expired}`);
    res.headers.append('Set-Cookie', `admin_info=; HttpOnly; ${expired}`);
    res.headers.append('Set-Cookie', `admin_token=; HttpOnly; ${expired}`);

    return res;
}