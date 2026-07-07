// src/app/api/cart/item/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

export const PATCH = withApiError(async (req, { params }) => {
    const { id: cartItemId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(422, 'quantity không hợp lệ');
    }

    const itemRef = dbAdmin.collection('carts').doc(uid).collection('items').doc(cartItemId);
    const doc = await itemRef.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng');
    }

    await itemRef.update({ quantity, updatedAt: new Date() });
    return Response.json({ message: 'Đã cập nhật số lượng' });
});

export const DELETE = withApiError(async (req, { params }) => {
    const { id: cartItemId } = await params;
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const itemRef = dbAdmin.collection('carts').doc(uid).collection('items').doc(cartItemId);
    const doc = await itemRef.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng');
    }

    await itemRef.delete();
    return Response.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
});