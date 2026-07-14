// src/app/api/admin/products/[id]/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';
import { slugify } from '@/lib/slugify';
import { ApiError, withApiError } from '@/lib/apiError';
import { PERMISSIONS } from '@/lib/permissions';

// ── Helpers (giống hệt route.js — cân nhắc tách ra lib/services/adminProducts.js
//    nếu muốn dùng chung, nhưng để riêng cho rõ ràng theo từng file route) ──

function serializeProduct(doc) {
    const d = { id: doc.id, ...doc.data() };

    for (const field of ['createdAt', 'updatedAt']) {
        if (d[field]?.toDate) d[field] = d[field].toDate().toISOString();
    }

    if (!Array.isArray(d.images)) d.images = [];
    d.thumbnailUrl = d.thumbnailUrl || (d.images[0] ?? null);
    d.stock = d.stockQuantity ?? 0;
    d.category = d.categoryName || d.category;

    return d;
}

async function getRefOr404(productId) {
    const ref = dbAdmin.collection('products').doc(productId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new ApiError(404, 'Không tìm thấy sản phẩm');
    }
    return { ref, doc };
}

// ── GET /api/admin/products/{id} ────────────────────────────────────────────

export const GET = withApiError(async (_req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.PRODUCTS_VIEW)
    const { id } = await params;

    const { doc } = await getRefOr404(id);
    return Response.json(serializeProduct(doc));
});

// ── PATCH /api/admin/products/{id} — cập nhật sản phẩm ──────────────────────

export const PATCH = withApiError(async (req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.PRODUCTS_EDIT);
    const { id } = await params;
    const body = await req.json();

    const { ref, doc } = await getRefOr404(id);
    const current = doc.data();

    // Check trùng sku (loại trừ chính nó)
    if (body.sku !== undefined && body.sku !== null) {
        const dup = await dbAdmin.collection('products').where('sku', '==', body.sku).limit(1).get();
        if (!dup.empty && dup.docs[0].id !== id) {
            throw new ApiError(400, `SKU '${body.sku}' đã dùng bởi sản phẩm khác`);
        }
    }

    // Check trùng slug (loại trừ chính nó)
    if (body.slug !== undefined && body.slug !== null) {
        const dup = await dbAdmin.collection('products').where('slug', '==', body.slug).limit(1).get();
        if (!dup.empty && dup.docs[0].id !== id) {
            throw new ApiError(400, `Slug '${body.slug}' đã tồn tại`);
        }
    }

    if (body.status !== undefined && body.status !== null) {
        if (!['active', 'inactive', 'out_of_stock', 'hidden'].includes(body.status)) {
            throw new ApiError(422, 'status không hợp lệ');
        }
    }

    const updates = { updatedAt: new Date() };

    for (const [field, value] of Object.entries(body)) {
        if (value === undefined || value === null) continue;

        if (field === 'specs') {
            updates.specs = value;
        } else if (field === 'name') {
            updates.name = value.trim();
            if (body.slug === undefined || body.slug === null) {
                updates.slug = slugify(value);
            }
        } else if (field === 'stock') {
            // frontend gửi "stock" → lưu đúng tên Firestore
            updates.stockQuantity = value;
        } else {
            updates[field] = value;
        }
    }

    // Khi cập nhật images: tự đồng bộ thumbnailUrl nếu chưa set
    if ('images' in updates) {
        const images = Array.isArray(updates.images) ? updates.images : [];
        updates.images = images;
        if ((body.thumbnailUrl === undefined || body.thumbnailUrl === null) && images.length) {
            updates.thumbnailUrl = images[0];
        }
    }

    // Tự tính discountPercent khi price hoặc originalPrice thay đổi
    const newPrice = 'price' in updates ? updates.price : current.price;
    const newOrig = 'originalPrice' in updates ? updates.originalPrice : current.originalPrice;
    if (('price' in updates || 'originalPrice' in updates) && newOrig && newOrig > newPrice) {
        if (!('discountPercent' in updates)) {
            updates.discountPercent = Math.round((1 - newPrice / newOrig) * 100);
        }
    }

    await ref.update(updates);

    const { updatedAt, ...changesWithoutTimestamp } = updates;
    await logAdminAction(dbAdmin, admin, {
        action: 'update_product',
        targetType: 'product',
        targetId: id,
        details: {
            changes: changesWithoutTimestamp,
            priceBefore: current.price,
        },
    });

    const updatedDoc = await ref.get();
    return Response.json({
        message: 'Cập nhật sản phẩm thành công',
        product: serializeProduct(updatedDoc),
    });
});

// ── DELETE /api/admin/products/{id} ──────────────────────────────────────────

export const DELETE = withApiError(async (_req, { params }) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.PRODUCTS_DELETE);
    const { id } = await params;

    const { ref, doc } = await getRefOr404(id);
    const snapshot = doc.data();

    await ref.delete();

    await logAdminAction(dbAdmin, admin, {
        action: 'delete_product',
        targetType: 'product',
        targetId: id,
        details: { name: snapshot.name, sku: snapshot.sku },
    });

    return Response.json({ message: 'Đã xóa sản phẩm thành công' });
});