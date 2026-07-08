// src/lib/session.js

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbAdmin, authAdmin } from './firebaseAdmin';
import { ApiError } from './apiError';

// ── Cấu hình admin JWT (tương ứng app/core/config.py) ─────────────────────────
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-in-production';
const ADMIN_JWT_ALGORITHM = 'HS256';
export const ADMIN_TOKEN_EXPIRE_HOURS = 2;

// ── Firebase user (Firebase Auth idToken) ─────────────────────────────────────

/**
 * Xác thực Firebase ID Token lấy từ cookie `auth_token`.
 * Trả về decoded token (có { uid, email, ... }) hoặc null nếu chưa đăng nhập/hết hạn.
 * KHÔNG throw khi không có token — dùng cho các route cho phép cả khách vãng lai.
 */
export async function getVerifiedUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    let decodedToken;
    try {
        decodedToken = await authAdmin.verifyIdToken(token);
    } catch {
        return null; // token hết hạn hoặc không hợp lệ
    }

    const uid = decodedToken.uid;
    if (uid) {
        const userDoc = await dbAdmin.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data()?.is_banned) {
            // Giống hệt nhánh 403 trong verify_token() bên FastAPI
            throw new ApiError(403, 'Tài khoản của bạn đã bị khóa');
        }
    }

    return decodedToken;
}

/**
 * Bắt buộc phải đăng nhập. Dùng ở đầu route cần auth thay vì tự check null.
 * Throw ApiError(401) nếu chưa đăng nhập -> route.js chỉ cần bọc withApiError().
 */
export async function requireUser() {
    const decoded = await getVerifiedUser();
    if (!decoded) {
        throw new ApiError(401, 'Chưa đăng nhập');
    }
    return decoded;
}

/** Lấy uid từ decoded token, throw 401 nếu thiếu (tương đương get_uid()). */
export function getUid(decodedToken) {
    const uid = decodedToken?.uid;
    if (!uid) {
        throw new ApiError(401, 'Token không hợp lệ');
    }
    return uid;
}

// ── Admin JWT tự ký ────────────────────────────────────────────────────────────

export async function hashPassword(plain) {
    return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
}

/** Tương đương create_access_token() — ký JWT admin, hết hạn sau 12 giờ. */
export function createAccessToken(payload) {
    return jwt.sign(payload, ADMIN_JWT_SECRET, {
        algorithm: ADMIN_JWT_ALGORITHM,
        expiresIn: `${ADMIN_TOKEN_EXPIRE_HOURS}h`,
    });
}

/**
 * Xác thực JWT admin lấy từ cookie `admin_token`.
 * Throw ApiError(401) nếu thiếu/hết hạn/không hợp lệ (tương đương verify_admin_token()).
 */
export async function requireAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
        throw new ApiError(401, 'Chưa đăng nhập');
    }
    try {
        const payload = jwt.verify(token, ADMIN_JWT_SECRET, { algorithms: [ADMIN_JWT_ALGORITHM] });
        if (!payload.sub) throw new Error('Missing sub');
        return payload;
    } catch {
        throw new ApiError(401, 'Token không hợp lệ hoặc đã hết hạn');
    }
}

/**
 * Tương đương require_permission(permission) — dùng sau requireAdmin():
 *   const admin = await requireAdmin();
 *   requirePermission(admin, 'delete_users');
 */
export function requirePermission(admin, permission) {
    const permissions = admin.permissions || [];
    if (admin.role !== 'superadmin' && !permissions.includes(permission)) {
        throw new ApiError(403, `Bạn không có quyền: ${permission}`);
    }
    return admin;
}

// ── Firebase Auth REST API (đăng nhập bằng mật khẩu) ──────────────────────────
//
// Admin SDK KHÔNG xác thực được password — phải gọi thẳng Identity Toolkit REST
// API giống hệt FastAPI cũ (httpx.post tới FIREBASE_SIGN_IN_URL).

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';
const FIREBASE_SIGN_IN_URL =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;

/**
 * Đăng nhập email/password qua Firebase Auth REST API.
 * Trả về { idToken, localId, email } khi thành công.
 * Throw ApiError(401/403/503) khi thất bại — message y hệt bản FastAPI.
 */
export async function signInWithPassword(email, password) {
    let resp;
    try {
        resp = await fetch(FIREBASE_SIGN_IN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
    } catch {
        throw new ApiError(503, 'Không thể kết nối tới dịch vụ xác thực, vui lòng thử lại');
    }

    const data = await resp.json();

    if (!resp.ok) {
        const err = data?.error?.message || '';
        if (err === 'USER_DISABLED') {
            throw new ApiError(403, 'Tài khoản đã bị khóa');
        }
        throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
    }

    return data; // { idToken, localId, email, ... }
}