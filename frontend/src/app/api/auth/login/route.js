// src/app/api/auth/login/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { signInWithPassword } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

export const POST = withApiError(async (req) => {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
        throw new ApiError(422, 'Thiếu email hoặc mật khẩu');
    }

    let firebaseData;
    try {
        // Gọi thẳng Firebase Identity Toolkit — không còn qua FastAPI.
        firebaseData = await signInWithPassword(email, password);
    } catch (userErr) {
        const adminResponse = await tryAdminLoginFallback(email, password);
        if (adminResponse) return adminResponse;

        // Cả hai đều thất bại → giữ nguyên lỗi gốc của nhánh user (đúng logic cũ)
        throw userErr;
    }

    const uid = firebaseData.localId;
    const userDoc = await dbAdmin.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const displayName = userData.username || 'Guest';

    const res = Response.json({
        message: 'Đăng nhập thành công',
        username: displayName,
    });

    setAuthCookies(res, {
        token: firebaseData.idToken,
        userName: displayName,
        userData: {
            uid,
            email: firebaseData.email || email,
            username: userData.username || '',
            rank: userData.rank || 'Silver',
            points: userData.points || 0,
        },
    });

    return res;
});

// ── Fallback tạm thời cho admin — sẽ gỡ bỏ khi port xong Admin auth ──────────
async function tryAdminLoginFallback(email, password) {
    if (!process.env.BACKEND_URL) return null;

    let adminRes;
    try {
        adminRes = await fetch(`${process.env.BACKEND_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
    } catch {
        return null; // backend không phản hồi -> để lỗi user gốc quyết định
    }

    if (!adminRes.ok) return null;

    const adminData = await adminRes.json();
    const setCookieHeaders = typeof adminRes.headers.getSetCookie === 'function'
        ? adminRes.headers.getSetCookie()
        : [adminRes.headers.get('set-cookie')].filter(Boolean);

    const adminTokenCookie = setCookieHeaders.find((c) => c.startsWith('admin_token='));
    const adminToken = adminTokenCookie ? adminTokenCookie.split(';')[0].split('=')[1] : null;

    if (!adminToken) {
        console.error('[admin login fallback] Không tìm thấy admin_token trong Set-Cookie header từ backend');
        return Response.json(
            { detail: 'Đăng nhập quản trị thất bại (không nhận được token)' },
            { status: 500 }
        );
    }

    const res = Response.json({
        message: '🛡️ Đăng nhập quản trị thành công! Đang chuyển hướng...',
        username: adminData.admin_info.email,
    });
    setAdminCookie(res, adminToken, adminData.admin_info);
    return res;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setAuthCookies(res, { token, userName, userData }) {
    const common =
        'Path=/; SameSite=Lax; Max-Age=604800' +
        (process.env.NODE_ENV === 'production' ? '; Secure' : '');

    res.headers.append('Set-Cookie', `auth_token=${token}; HttpOnly; ${common}`);
    res.headers.append('Set-Cookie', `user_name=${encodeURIComponent(userName)}; ${common}`);
    if (userData) {
        res.headers.append(
            'Set-Cookie',
            `user_data=${encodeURIComponent(JSON.stringify(userData))}; HttpOnly; ${common}`
        );
    }
}

function setAdminCookie(res, token, adminInfo) {
    // TODO: đối chiếu lại Max-Age với ACCESS_TOKEN_EXPIRE_HOURS thật trong
    // app/core/config.py khi port Admin auth ở bước sau.
    const common =
        'Path=/; SameSite=Lax; Max-Age=86400' +
        (process.env.NODE_ENV === 'production' ? '; Secure' : '');

    res.headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; ${common}`);
    res.headers.append('Set-Cookie', `admin_info=${encodeURIComponent(JSON.stringify(adminInfo))}; ${common}`);
    res.headers.append('Set-Cookie', `user_name=${encodeURIComponent(adminInfo.email)}; ${common}`);
}