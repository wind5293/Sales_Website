// src/app/api/users/addresses/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { FieldValue } from 'firebase-admin/firestore';
import { listAddresses } from '@/lib/services/users';

async function clearDefaultAddresses(addressRef, excludeId = null) {
    const snap = await addressRef.get();
    await Promise.all(
        snap.docs
            .filter((doc) => doc.id !== excludeId)
            .map((doc) => doc.ref.update({ is_default: false }))
    );
}

export const GET = withApiError(async () => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const data = await listAddresses(uid);
    return Response.json(data);
});

export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);
    const body = await req.json();

    if (!body.name || !body.street || !body.city || !body.district || !body.zip_code || !body.phone) {
        throw new ApiError(422, 'Thiếu thông tin địa chỉ (name, street, city, district, zip_code, phone)');
    }

    const addressRef = dbAdmin.collection('users').doc(uid).collection('addresses');
    const isDefault = Boolean(body.is_default);

    if (isDefault) {
        await clearDefaultAddresses(addressRef);
    }

    const addressId = crypto.randomUUID();
    await addressRef.doc(addressId).set({
        address_id: addressId,
        name: body.name,
        street: body.street,
        city: body.city,
        district: body.district,
        zip_code: body.zip_code,
        phone: body.phone,
        is_default: isDefault,
        created_at: FieldValue.serverTimestamp(),
    });

    return Response.json({ address_id: addressId, message: 'Thêm địa chỉ thành công' }, { status: 201 });
});