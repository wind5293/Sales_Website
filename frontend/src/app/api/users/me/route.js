// src/app/api/users/me/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

const PROFILE_UPDATABLE_FIELDS = ['name', 'dob', 'gender', 'place', 'tel'];

function serializeUser(data, uid) {
    return {
        uid: data.uid || uid,
        username: data.username || '',
        email: data.email || '',
        name: data.name || '',
        dob: data.dob || '',
        gender: data.gender || '',
        place: data.place || '',
        tel: data.tel || '',
        points: data.points || 0,
        rank: data.rank || 'Silver',
    };
}

async function getUserOr404(uid) {
    const doc = await dbAdmin.collection('users').doc(uid).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy thông tin user');
    }
    return doc.data();
}

export const GET = withApiError(async () => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const data = await getUserOr404(uid);
    return Response.json(serializeUser(data, uid));
});

export const PATCH = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);
    await getUserOr404(uid);

    const body = await req.json();

    // exclude_unset: chỉ nhận các field thực sự được gửi lên, đúng field cho phép sửa
    const updates = {};
    for (const field of PROFILE_UPDATABLE_FIELDS) {
        if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length > 0) {
        await dbAdmin.collection('users').doc(uid).update(updates);
    }

    const doc = await dbAdmin.collection('users').doc(uid).get();
    return Response.json({
        message: 'Cập nhật thông tin thành công',
        user: serializeUser(doc.data(), uid),
    });
});