// src/app/api/coupons/available/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireUser, getUid } from '@/lib/session';
import { withApiError } from '@/lib/apiError';
import { tsToIso } from '@/lib/reviewHelpers';

function toDateSafe(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
}

export const GET = withApiError(async (req) => {
    const decoded = await requireUser();
    const uid = getUid(decoded);

    const { searchParams } = new URL(req.url);
    const orderTotal = Number(searchParams.get('order_total') || '0');

    const now = new Date();

    // Không dùng where/orderBy phức tạp — port đúng hành vi gốc: quét toàn bộ
    // collection rồi lọc/sắp xếp trong bộ nhớ. Không cần composite index vì lý do đó,
    // nhưng cân nhắc tối ưu nếu số lượng coupon tăng lớn.
    const snap = await dbAdmin.collection('coupons').get();

    const result = [];
    for (const doc of snap.docs) {
        const c = doc.data();

        if (c.type === 'points_redeem' && c.userId !== uid) continue;
        if (!(c.isActive ?? true)) continue;
        if ((c.usedCount || 0) >= (c.maxUses ?? 1)) continue;

        let expired = false;
        if (c.validUntil) {
            const expiry = toDateSafe(c.validUntil);
            if (expiry && now > expiry) expired = true;
        }

        result.push({
            code: doc.id,
            discountPercent: c.discountPercent ?? null,
            discountAmount: c.discountAmount ?? null,
            minOrder: c.minOrder || 0,
            maxUses: c.maxUses,
            usedCount: c.usedCount || 0,
            validUntil: tsToIso(c.validUntil),
            isExpired: expired,
            canUse: !expired && orderTotal >= (c.minOrder || 0),
        });
    }

    result.sort((a, b) => {
        if (a.canUse !== b.canUse) return a.canUse ? -1 : 1;
        return (b.discountPercent || 0) - (a.discountPercent || 0);
    });

    return Response.json({ coupons: result, total: result.length });
});