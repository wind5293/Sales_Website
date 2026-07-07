// src/app/api/coupons/validate/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { ApiError, withApiError } from '@/lib/apiError';

function toDateSafe(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
}

function calcDiscount(coupon, orderTotal) {
    if (coupon.discountPercent) {
        return Math.round((orderTotal * coupon.discountPercent) / 100);
    }
    if (coupon.discountAmount) {
        return Math.min(Number(coupon.discountAmount), orderTotal);
    }
    return 0;
}

export const POST = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const body = await req.json();
    const voucherCode = body.voucherCode;
    const orderTotal = Number(body.orderTotal);

    if (!voucherCode) {
        throw new ApiError(422, 'Thiếu voucherCode');
    }
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
        throw new ApiError(422, 'orderTotal không hợp lệ');
    }

    const code = voucherCode.toUpperCase().trim();
    const couponRef = dbAdmin.collection('coupons').doc(code);
    const couponDoc = await couponRef.get();

    if (!couponDoc.exists) {
        throw new ApiError(404, 'Mã giảm giá không tồn tại');
    }

    const coupon = couponDoc.data();

    if (!(coupon.isActive ?? true)) {
        throw new ApiError(400, 'Mã giảm giá đã bị vô hiệu hóa');
    }
    if ((coupon.usedCount || 0) >= (coupon.maxUses ?? 1)) {
        throw new ApiError(400, 'Mã giảm giá đã hết lượt sử dụng');
    }

    if (coupon.validUntil) {
        const expiry = toDateSafe(coupon.validUntil);
        if (expiry && new Date() > expiry) {
            throw new ApiError(400, 'Mã giảm giá đã hết hạn');
        }
    }

    const minOrder = coupon.minOrder || 0;
    if (orderTotal < minOrder) {
        throw new ApiError(400, `Đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã này`);
    }

    if (coupon.type === 'points_redeem' && coupon.userId !== uid) {
        throw new ApiError(403, 'Mã giảm giá này không thuộc về bạn');
    }

    const discount = calcDiscount(coupon, orderTotal);
    const finalPrice = Math.max(orderTotal - discount, 0);

    return Response.json({
        valid: true,
        voucherCode: code,
        type: coupon.type || 'general',
        discountAmount: discount,
        discountPercent: coupon.discountPercent ?? null,
        finalPrice,
        message: `Áp dụng thành công! Giảm ${discount.toLocaleString('vi-VN')}đ`,
    });
});