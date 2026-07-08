// src/app/api/users/addresses/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

const ADDRESS_UPDATABLE_FIELDS = ['name', 'street', 'city', 'district', 'zip_code', 'phone', 'is_default'];

async function clearDefaultAddresses(addressRef, excludeId = null) {
    const snap = await addressRef.get();
    await Promise.all(
        snap.docs
            .filter((doc) => doc.id !== excludeId)
            .map((doc) => doc.ref.update({ is_default: false }))
    );
}

export const PATCH = withApiError(async (req, { params }) => {
    const { id: addressId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);
    const body = await req.json();

    const addressRef = dbAdmin.collection('users').doc(uid).collection('addresses');
    const docRef = addressRef.doc(addressId);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy địa chỉ');
    }

    const updates = {};
    for (const field of ADDRESS_UPDATABLE_FIELDS) {
        if (field in body) updates[field] = body[field];
    }

    if (updates.is_default === true) {
        await clearDefaultAddresses(addressRef, addressId);
    }

    if (Object.keys(updates).length > 0) {
        await docRef.update(updates);
    }

    const updatedDoc = await docRef.get();
    const { created_at, ...updated } = updatedDoc.data();

    return Response.json({ message: 'Cập nhật địa chỉ thành công', address: updated });
});

export const DELETE = withApiError(async (_req, { params }) => {
    const { id: addressId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const ref = dbAdmin.collection('users').doc(uid).collection('addresses').doc(addressId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy địa chỉ');
    }

    await ref.delete();
    return Response.json({ message: 'Xóa địa chỉ thành công' });
});