// src/lib/orderHelpers.js
import { dbAdmin } from './firebaseAdmin';
import { ApiError } from './apiError';
import { tsToIso } from './reviewHelpers';

// Port trực tiếp từ app/core/config.py
export const SHIPPING_PRICES = {
    fast: 30000,
    standard: 15000,
    express: 60000,
};

export function serializeOrder(doc) {
    const o = { id: doc.id, ...doc.data() };
    o.createdAt = tsToIso(o.createdAt);
    o.updatedAt = tsToIso(o.updatedAt);
    return o;
}

/** Firestore Timestamp hoặc ISO string -> Date, dùng để so sánh hạn dùng voucher. */
function toDateSafe(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
}

/** Hoàn lại usedCount khi tạo đơn thất bại sau khi đã tiêu thụ voucher. */
export async function releaseVoucher(code) {
    if (!code) return;
    const ref = dbAdmin.collection('coupons').doc(code.toUpperCase().trim());
    try {
        await dbAdmin.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            const c = snap.data();
            const newUsed = Math.max(0, (c.usedCount || 0) - 1);
            tx.update(ref, { usedCount: newUsed });
        });
    } catch (err) {
        console.error(`Không thể hoàn lại voucher ${code} sau khi đơn hàng tạo thất bại`, err);
    }
}

/**
 * Tính discountAmount từ voucher code. Ưu tiên Firestore coupons, fallback VOUCHERS hardcode.
 * Nếu voucher tồn tại trên Firestore và hợp lệ, hàm TỰ TIÊU THỤ (tăng usedCount) trong transaction —
 * y hệt hành vi apply_voucher_with_firestore() bên Python.
 * Trả về { discountAmount, voucherCodeApplied } — voucherCodeApplied là null nếu không áp dụng được.
 */
export async function applyVoucherWithFirestore(voucherCode, orderTotal, uid) {
    const code = voucherCode.toUpperCase().trim();
    let discountAmount = 0;
    let voucherInfo = null;

    const couponRef = dbAdmin.collection('coupons').doc(code);
    const couponDoc = await couponRef.get();

    if (couponDoc.exists) {
        const coupon = couponDoc.data();

        let isValid =
            (coupon.isActive ?? true) &&
            (coupon.usedCount || 0) < (coupon.maxUses ?? 1) &&
            orderTotal >= (coupon.minOrder || 0) &&
            (coupon.type !== 'points_redeem' || coupon.userId === uid);

        if (coupon.validUntil) {
            const expiry = toDateSafe(coupon.validUntil);
            if (expiry && new Date() > expiry) {
                isValid = false;
            }
        }

        if (isValid) {
            if (coupon.discountPercent) {
                discountAmount = Math.round((orderTotal * coupon.discountPercent) / 100);
            } else if (coupon.discountAmount) {
                discountAmount = Math.min(Number(coupon.discountAmount), orderTotal);
            }
            voucherInfo = code;

            // Tiêu thụ coupon trong transaction — throw nếu vừa bị dùng hết bởi request khác
            await dbAdmin.runTransaction(async (tx) => {
                const snap = await tx.get(couponRef);
                const c = snap.data();
                if (!(c.isActive ?? true) || (c.usedCount || 0) >= (c.maxUses ?? 1)) {
                    throw new ApiError(400, 'Mã giảm giá đã hết lượt sử dụng');
                }
                tx.update(couponRef, { usedCount: (c.usedCount || 0) + 1 });
            });

            return { discountAmount, voucherCodeApplied: voucherInfo };
        }
    }

    return { discountAmount, voucherCodeApplied: voucherInfo };
}

/**
 * Trừ tồn kho theo transaction cho toàn bộ items trong đơn hàng.
 * Throw Error thường (không phải ApiError) nếu 1 sản phẩm không tồn tại giữa chừng —
 * caller (route POST /orders) bắt lỗi này để rollback đơn hàng, giống try/except bên Python.
 */
export async function decrementStock(items) {
    await dbAdmin.runTransaction(async (tx) => {
        const refs = items.map((i) => dbAdmin.collection('products').doc(i.productId));
        const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

        for (let i = 0; i < items.length; i++) {
            const snap = snaps[i];
            const item = items[i];
            if (!snap.exists) {
                throw new Error(`Sản phẩm ${item.productId} không tồn tại`);
            }
            const newStock = Math.max(0, (snap.data().stockQuantity || 0) - item.quantity);
            const updates = { stockQuantity: newStock, updatedAt: new Date() };
            if (newStock <= 0) {
                updates.status = 'out_of_stock';
            }
            tx.update(refs[i], updates);
        }
    });
}

/** Hoàn lại stockQuantity cho từng sản phẩm trong đơn hàng bị huỷ (port từ inventory.py). */
export async function restockOrderItems(items) {
    for (const item of items) {
        const productRef = dbAdmin.collection('products').doc(item.productId);
        const snap = await productRef.get();
        if (!snap.exists) continue;

        const data = snap.data();
        const newStock = (data.stockQuantity || 0) + item.quantity;
        const updates = { stockQuantity: newStock, updatedAt: new Date() };
        if (data.status === 'out_of_stock') {
            updates.status = 'active';
        }
        await productRef.update(updates);
    }
}