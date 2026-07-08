// src/app/api/users/addresses/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { FieldValue } from 'firebase-admin/firestore';

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

    const snap = await dbAdmin.collection('users').doc(uid).collection('addresses').get();

    let addresses = snap.docs.map((doc) => {
        const { created_at, ...rest } = doc.data();
        return rest;
    });

    // is_default = true lên đầu, giữ đúng thứ tự bản Python (sort key: not is_default)
    addresses.sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1));

    return Response.json({ addresses });
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