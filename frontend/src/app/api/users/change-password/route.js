// src/app/api/users/change-password/route.js
import { dbAdmin, authAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';
const PASSWORD_MIN_LENGTH = 8;

/** Port từ validate_password_strength() trong app/schemas/__init__.py */
function validatePasswordStrength(password) {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(422, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`);
    }
    if (!/[A-Za-z]/.test(password)) {
        throw new ApiError(422, 'Mật khẩu phải có ít nhất 1 chữ cái');
    }
    if (!/\d/.test(password)) {
        throw new ApiError(422, 'Mật khẩu phải có ít nhất 1 chữ số');
    }
}

export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const doc = await dbAdmin.collection('users').doc(uid).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy thông tin user');
    }

    const email = doc.data().email;
    if (!email) {
        throw new ApiError(400, 'Không tìm thấy email của tài khoản');
    }

    const body = await req.json();
    const { old_password: oldPassword, new_password: newPassword } = body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(422, 'Thiếu mật khẩu cũ hoặc mật khẩu mới');
    }
    validatePasswordStrength(newPassword);

    if (!FIREBASE_WEB_API_KEY) {
        throw new ApiError(500, 'Cấu hình Firebase API key bị thiếu');
    }

    // Xác thực mật khẩu cũ bằng cách gọi thẳng Identity Toolkit REST API,
    // giống hệt bản Python — Admin SDK không kiểm tra được password trực tiếp.
    const signinUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;

    let resp;
    try {
        resp = await fetch(signinUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: oldPassword, returnSecureToken: true }),
        });
    } catch (err) {
        throw new ApiError(503, `Không thể kết nối Firebase: ${err.message}`);
    }

    if (resp.status !== 200) {
        throw new ApiError(400, 'Mật khẩu cũ không đúng');
    }
    if (oldPassword === newPassword) {
        throw new ApiError(400, 'Mật khẩu mới phải khác mật khẩu cũ');
    }

    await authAdmin.updateUser(uid, { password: newPassword });

    return Response.json({ message: 'Đổi mật khẩu thành công' });
});