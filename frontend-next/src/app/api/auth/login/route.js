export async function POST(req) {
    const { email, password } = await req.json();

    // 1. Thử đăng nhập user trước
    const userRes = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const userData = await userRes.json();

    if (userRes.ok) {
        const user = userData.user;
        const displayName = user.display_name || user.full_name || user.username || 'Guest';
        const res = Response.json({ 
            message: userData.message, 
            username: displayName 
        });
        setAuthCookies(
            res, 
            { 
                token: userData.idToken, 
                userName: displayName, userData: user 
            }
        );
        return res;
    }

    // 2. User thất bại → thử đăng nhập admin (giữ đúng logic fallback gốc)
    const adminRes = await fetch(`${process.env.BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            email, 
            password 
        }),
    });
    const adminData = await adminRes.json();

    if (adminRes.ok) {
        const setCookieHeaders = typeof adminRes.headers.getSetCookie === 'function'
            ? adminRes.headers.getSetCookie()
            : [adminRes.headers.get('set-cookie')].filter(Boolean);

        const adminTokenCookie = setCookieHeaders.find((c) => c.startsWith('admin_token='));
        const adminToken = adminTokenCookie ? adminTokenCookie.split(';')[0].split('=')[1] : null;

        if (!adminToken) {
            console.error('[admin login] Không tìm thấy admin_token trong Set-Cookie header từ backend');
            return Response.json({ detail: 'Đăng nhập quản trị thất bại (không nhận được token)' }, { status: 500 });
        }

        const res = Response.json({
            message: '🛡️ Đăng nhập quản trị thành công! Đang chuyển hướng...',
            username: adminData.admin_info.email,
        });
        setAdminCookie(res, adminToken, adminData.admin_info);
        return res;
    }

    // 3. Cả hai đều thất bại → trả lỗi từ nhánh user (đúng logic gốc)
    const detail = userData?.detail;
    return Response.json(
        { detail: typeof detail === 'string' ? detail : 'Email hoặc mật khẩu không đúng!' },
        { status: 401 }
    );
}

function setAuthCookies(res, { token, userName, userData, isAdmin, adminInfo }) {
    const common = 'Path=/; SameSite=Lax; Max-Age=604800' + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
    res.headers.append('Set-Cookie', `auth_token=${token}; HttpOnly; ${common}`);
    res.headers.append('Set-Cookie', `user_name=${encodeURIComponent(userName)}; ${common}`);
    if (userData) res.headers.append('Set-Cookie', `user_data=${encodeURIComponent(JSON.stringify(userData))}; HttpOnly; ${common}`);
    if (isAdmin) res.headers.append('Set-Cookie', `admin_info=${encodeURIComponent(JSON.stringify(adminInfo))}; HttpOnly; ${common}`);
}

function setAdminCookie(res, token, adminInfo) {
    // TODO: đối chiếu lại với ACCESS_TOKEN_EXPIRE_HOURS thật trong app/core/config.py
    const common = 'Path=/; SameSite=Lax; Max-Age=86400' + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
    res.headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; ${common}`);
    res.headers.append('Set-Cookie', `admin_info=${encodeURIComponent(JSON.stringify(adminInfo))}; ${common}`);
    res.headers.append('Set-Cookie', `user_name=${encodeURIComponent(adminInfo.email)}; ${common}`);
}