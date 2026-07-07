// src/app/api/auth/signup/route.js
import { dbAdmin, authAdmin } from '@/lib/firebaseAdmin';
import { ApiError, withApiError } from '@/lib/apiError';

const PASSWORD_MIN_LENGTH = 8;

/** Port trực tiếp từ validate_password_strength() trong app/schemas/__init__.py */
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
    const body = await req.json();
    const { username, password, email, tel } = body;

    if (!username || !email || !tel) {
        throw new ApiError(422, 'Thiếu thông tin đăng ký (username, email, tel)');
    }
    validatePasswordStrength(password);

    let userRecord;
    try {
        // Tương đương auth.create_user() bên Python
        userRecord = await authAdmin.createUser({
            email,
            password,
            displayName: username,
        });
    } catch (err) {
        if (err?.code === 'auth/email-already-exists') {
            throw new ApiError(400, 'Email này đã được đăng ký');
        }
        console.error('Lỗi không xác định khi đăng ký user:', err);
        throw new ApiError(500, 'Đã có lỗi xảy ra, vui lòng thử lại sau');
    }

    const newUser = {
        uid: userRecord.uid,
        username,
        email,
        tel,
        name: null,
        dob: null,
        place: null,
        rank: 'Silver',
        points: 0,
    };

    await dbAdmin.collection('users').doc(userRecord.uid).set(newUser);

    return Response.json(
        {
            message: 'Đăng ký thành công',
            user: {
                uid: newUser.uid,
                username: newUser.username,
                email: newUser.email,
                rank: newUser.rank,
                points: newUser.points,
            },
        },
        { status: 201 }
    );
});