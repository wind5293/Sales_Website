// src/app/api/auth/login/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import {
    signInWithPassword,
    verifyPassword,
    createAccessToken,
    ADMIN_TOKEN_EXPIRE_HOURS,
} from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

export const POST = withApiError(async (req) => {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
        throw new ApiError(422, 'Thiếu email hoặc mật khẩu');
    }

    let firebaseData;
    try {
        firebaseData = await signInWithPassword(email, password);
    } catch (userErr) {
        const adminResponse = await tryAdminLogin(email, password);
        if (adminResponse) return adminResponse;

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

// ── Admin login (native — không còn gọi qua backend FastAPI) ────────────────
async function tryAdminLogin(email, password) {
    const snap = await dbAdmin
        .collection('admins')
        .where('email', '==', email)
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const admin = { id: doc.id, ...doc.data() };

    const passwordOk = await verifyPassword(password, admin.password_hash || '');
    if (!passwordOk) return null;

    const token = createAccessToken({
        sub: admin.id,
        email: admin.email,
        role: admin.role || 'admin',
        permissions: admin.permissions || [],
    });

    await dbAdmin.collection('admins').doc(admin.id).update({
        lastLoginAt: new Date(),
    });

    const displayName = admin.name || admin.email;

    const adminInfo = {
        id: admin.id,
        email: admin.email,
        name: displayName,
        role: admin.role || 'admin',
        permissions: admin.permissions || [],
    };

    const res = Response.json({
        message: '🛡️ Đăng nhập quản trị thành công! Đang chuyển hướng...',
        username:displayName,
    });
    setAdminCookie(res, token, adminInfo);
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
    const common =
        `Path=/; SameSite=Lax; Max-Age=${ADMIN_TOKEN_EXPIRE_HOURS * 3600}` +
        (process.env.NODE_ENV === 'production' ? '; Secure' : '');

    res.headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; ${common}`);
    res.headers.append('Set-Cookie', `admin_info=${encodeURIComponent(JSON.stringify(adminInfo))}; ${common}`);
    res.headers.append('Set-Cookie', `user_name=${encodeURIComponent(adminInfo.name)}; ${common}`);
}