// src/app/api/users/addresses/from-order/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { FieldValue } from 'firebase-admin/firestore';

// Lưu địa chỉ mới từ thông tin đơn hàng vừa đặt, tự động bỏ qua nếu đã trùng
// (so khớp theo street + district + city).
export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);
    const body = await req.json();

    if (!body.name || !body.street || !body.city) {
        throw new ApiError(422, 'Thiếu thông tin địa chỉ (name, street, city)');
    }

    const addressRef = dbAdmin.collection('users').doc(uid).collection('addresses');

    const existing = await addressRef
        .where('street', '==', body.street)
        .where('district', '==', body.district || '')
        .where('city', '==', body.city)
        .limit(1)
        .get();

    if (!existing.empty) {
        return Response.json({ message: 'Địa chỉ đã tồn tại', saved: false });
    }

    const addressId = crypto.randomUUID();
    await addressRef.doc(addressId).set({
        name: body.name,
        address_id: addressId,
        street: body.street,
        city: body.city,
        district: body.district || '',
        zip_code: body.zip_code || '',
        phone: body.phone || '',
        is_default: false,
        created_at: FieldValue.serverTimestamp(),
    });

    return Response.json(
        { address_id: addressId, message: 'Đã lưu địa chỉ mới', saved: true },
        { status: 201 }
    );
});