// src/app/api/orders/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';
import { computeRank } from '@/lib/pointsHelpers';
import { logPointsTransaction } from '@/lib/pointsHelpers';
import { listOrders } from '@/lib/services/orders';
import {
    SHIPPING_PRICES,
    serializeOrder,
    applyVoucherWithFirestore,
    releaseVoucher,
    decrementStock,
} from '@/lib/orderHelpers';

// GET /api/orders — đơn hàng của user, có filter status + phân trang
export const GET = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);

    const data = await listOrders(uid, { status, limit, skip });
    return Response.json(data);
});

// POST /api/orders — tạo đơn hàng từ giỏ hàng hiện tại
export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);
    const body = await req.json();

    if (!body.shippingAddress || !body.phone) {
        throw new ApiError(422, 'Thiếu địa chỉ giao hàng hoặc số điện thoại');
    }

    // 1. Lấy giỏ hàng
    const cartSnap = await dbAdmin.collection('carts').doc(uid).collection('items').get();
    const cartItems = cartSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (cartItems.length === 0) {
        throw new ApiError(400, 'Giỏ hàng trống');
    }

    // 2. Kiểm tra tồn kho & snapshot sản phẩm
    const orderItems = [];
    let totalPrice = 0;

    for (const item of cartItems) {
        const productDoc = await dbAdmin.collection('products').doc(item.productId).get();
        if (!productDoc.exists) {
            throw new ApiError(400, `Sản phẩm ${item.productId} không còn tồn tại`);
        }

        const product = productDoc.data();
        if (product.status === 'out_of_stock' || product.status === 'hidden') {
            throw new ApiError(400, `Sản phẩm '${product.name}' hiện không còn bán`);
        }
        if (item.quantity > (product.stockQuantity || 0)) {
            throw new ApiError(400, `Sản phẩm '${product.name}' chỉ còn ${product.stockQuantity} cái`);
        }

        const subtotal = product.price * item.quantity;
        totalPrice += subtotal;
        orderItems.push({
            productId: item.productId,
            productName: product.name,
            sku: product.sku,
            thumbnailUrl: product.thumbnailUrl,
            price: product.price,
            quantity: item.quantity,
            subtotal,
        });
    }

    // 3. Tính phí ship + voucher
    const shippingFee = SHIPPING_PRICES[body.shippingMethod || 'fast'] ?? 30000;

    let discountAmount = 0;
    let voucherInfo = null;
    if (body.voucherCode) {
        const result = await applyVoucherWithFirestore(body.voucherCode, totalPrice, uid);
        discountAmount = result.discountAmount;
        voucherInfo = result.voucherCodeApplied;
    }

    const finalTotal = Math.round((totalPrice + shippingFee - discountAmount) * 100) / 100;

    // 4. Tạo đơn hàng
    const now = new Date();
    const orderData = {
        userId: uid,
        items: orderItems,
        recipientName: body.name || '',
        shippingAddress: body.shippingAddress,
        phone: body.phone,
        note: body.note || '',
        itemsTotal: Math.round(totalPrice * 100) / 100,
        shippingFee,
        discountAmount,
        voucherCode: voucherInfo,
        totalPrice: finalTotal,
        shippingMethod: body.shippingMethod || 'fast',
        paymentMethod: body.paymentMethod || 'cod',
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: now,
        updatedAt: now,
    };

    const orderRef = await dbAdmin.collection('orders').add(orderData);
    const orderId = orderRef.id;

    // 5. Trừ tồn kho (transaction) — rollback đơn hàng + hoàn voucher nếu lỗi
    try {
        await decrementStock(orderItems);
    } catch (err) {
        await dbAdmin.collection('orders').doc(orderId).delete();
        if (voucherInfo) {
            await releaseVoucher(voucherInfo);
        }
        throw new ApiError(400, `Lỗi cập nhật tồn kho: ${err.message}`);
    }

    // 6. Xóa giỏ hàng
    const cartItemsCol = dbAdmin.collection('carts').doc(uid).collection('items');
    await Promise.all(cartItems.map((item) => cartItemsCol.doc(item.id).delete()));

    // 7. Tích điểm
    const pointsEarned = Math.floor(finalTotal / 100_000);
    if (pointsEarned > 0) {
        const userRef = dbAdmin.collection('users').doc(uid);
        const added = await dbAdmin.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) return null;
            const userData = snap.data();
            const newPoints = (userData.points || 0) + pointsEarned;
            const newRank = computeRank(newPoints);
            tx.update(userRef, { points: newPoints, rank: newRank });
            return { newPoints, newRank };
        });

        if (added) {
            await logPointsTransaction(dbAdmin, {
                userId: uid,
                delta: pointsEarned,
                reason: `Tích điểm từ đơn hàng ${orderId}`,
                orderId,
            });
        }
    }

    return Response.json(
        {
            message: 'Đặt hàng thành công',
            orderId,
            itemsTotal: orderData.itemsTotal,
            shippingFee,
            discountAmount,
            totalPrice: finalTotal,
            status: 'pending',
            shippingMethod: orderData.shippingMethod,
            paymentMethod: orderData.paymentMethod,
            pointsEarned,
        },
        { status: 201 }
    );
});