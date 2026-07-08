// src/app/api/cart/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

export const GET = withApiError(async () => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const snap = await dbAdmin.collection('carts').doc(uid).collection('items').get();

    const productDocs = await Promise.all(
        snap.docs.map((doc) => dbAdmin.collection('products').doc(doc.data().productId).get())
    );

    const items = [];
    let totalPrice = 0;

    snap.docs.forEach((doc, i) => {
        const item = doc.data();
        const productDoc = productDocs[i];
        if (!productDoc.exists) return;

        const product = productDoc.data();
        const price = product.price || 0;
        const qty = item.quantity || 1;
        totalPrice += price * qty;

        items.push({
            cartItemId: doc.id,
            productId: item.productId,
            productName: product.name || '',
            price,
            thumbnailUrl: product.thumbnailUrl || '',
            stockQuantity: product.stockQuantity || 0,
            status: product.status || 'active',
            quantity: qty,
        });
    });

    return Response.json({ items, totalItems: items.length, totalPrice });
});

export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();
    const productId = body.productId;
    const quantity = Number(body.quantity ?? 1);

    if (!productId) {
        throw new ApiError(422, 'Thiếu productId');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(422, 'quantity không hợp lệ');
    }

    const productDoc = await dbAdmin.collection('products').doc(productId).get();
    if (!productDoc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const product = productDoc.data();
    if (product.status === 'hidden') {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }
    if (product.status === 'out_of_stock' || (product.stockQuantity || 0) <= 0) {
        throw new ApiError(400, 'Sản phẩm đã hết hàng');
    }
    if (quantity > (product.stockQuantity || 0)) {
        throw new ApiError(400, `Chỉ còn ${product.stockQuantity} sản phẩm trong kho`);
    }

    const itemsRef = dbAdmin.collection('carts').doc(uid).collection('items');
    const existingSnap = await itemsRef.where('productId', '==', productId).limit(1).get();

    if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const currentQty = existingDoc.data().quantity || 0;
        const newQty = currentQty + quantity;

        if (newQty > (product.stockQuantity || 0)) {
            throw new ApiError(400, `Tổng số lượng vượt quá tồn kho (${product.stockQuantity})`);
        }

        await existingDoc.ref.update({ quantity: newQty, updatedAt: new Date() });
        return Response.json({ message: 'Đã cập nhật số lượng trong giỏ hàng', quantity: newQty });
    }

    await itemsRef.add({
        productId,
        quantity,
        addedAt: new Date(),
        updatedAt: new Date(),
    });

    return Response.json({ message: 'Đã thêm vào giỏ hàng' }, { status: 201 });
});