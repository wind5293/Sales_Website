// src/lib/auth.server.js
import { cookies } from 'next/headers';

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

/**
 * Dùng trong Server Component (layout, page) để lấy thông tin user hiện tại.
 * Trả về null nếu chưa đăng nhập hoặc token hết hạn.
 */
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!isTokenExpired(token)) {
        const userName = cookieStore.get('user_name')?.value;
        const userDataRaw = cookieStore.get('user_data')?.value;
        const userData = userDataRaw ? JSON.parse(decodeURIComponent(userDataRaw)) : null;

        return {
            name: userName ? decodeURIComponent(userName) : 'Welcome',
            id: userData?.uid || null,
        };
    }

    const adminInfoRaw = cookieStore.get('admin_info')?.value;
    if (adminInfoRaw) {
        try {
            const adminInfo = JSON.parse(decodeURIComponent(adminInfoRaw));
            return {
                name: adminInfo.email || 'Admin',
                id: adminInfo.id || null,
            };
        } catch {
            return null;
        }
    }

    return null;
}

export async function getIsAdmin() {
    const cookieStore = await cookies();
    return Boolean(cookieStore.get('admin_info')?.value);
}

export async function getAuthHeader() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (isTokenExpired(token)) return null;
    return { Authorization: `Bearer ${token}` };
}