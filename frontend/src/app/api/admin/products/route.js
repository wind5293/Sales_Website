// src/app/api/admin/products/route.js
import { dbAdmin } from '@/lib/firebaseAdmin';
import { requireAdmin, requirePermission } from '@/lib/session';
import { PERMISSIONS } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';
import { ApiError, withApiError } from '@/lib/apiError';
import { slugify } from '@/lib/slugify'; // xem ghi chú bên dưới về vị trí hàm này

// ── Helpers (port từ _serialize() và các helper trong admin_products.py) ────

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

// ── GET /api/admin/products — danh sách (phân trang + lọc) ─────────────────

export const GET = withApiError(async (req) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.PRODUCTS_VIEW)

    const { searchParams } = new URL(req.url);
    const skip = Number(searchParams.get('skip') || 0);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const q = searchParams.get('q') || null;
    const categoryId = searchParams.get('categoryId') || null;
    const status = searchParams.get('status') || null;
    const brand = searchParams.get('brand') || null;
    const minPrice = searchParams.has('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const maxPrice = searchParams.has('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const lowStock = searchParams.get('lowStock') === 'true';

    let query = dbAdmin.collection('products').orderBy('createdAt', 'desc');
    if (categoryId) query = query.where('categoryId', '==', categoryId);
    if (status) query = query.where('status', '==', status);
    if (brand) query = query.where('brand', '==', brand);

    const hasPythonFilter = Boolean(q) || minPrice !== null || maxPrice !== null || lowStock;

    if (!hasPythonFilter) {
        // Đếm tổng (đọc toàn bộ) rồi lấy trang hiện tại — giữ đúng hành vi bản Python gốc
        const totalSnap = await query.get();
        const total = totalSnap.size;

        const pageSnap = await query.offset(skip).limit(limit).get();
        const products = pageSnap.docs.map(serializeProduct);

        return Response.json({
            products,
            total,
            page: Math.floor(skip / limit),
            pages: Math.ceil(total / limit),
        });
    }

    // Có filter phía "code" (không phải Firestore where) → phải load hết rồi tự lọc
    const snap = await query.get();
    let all = snap.docs.map(serializeProduct);

    if (q) {
        const qLower = q.trim().toLowerCase();
        all = all.filter(
            (d) =>
                (d.name || '').toLowerCase().includes(qLower) ||
                (d.sku || '').toLowerCase().includes(qLower)
        );
    }
    if (minPrice !== null) all = all.filter((d) => (d.price || 0) >= minPrice);
    if (maxPrice !== null) all = all.filter((d) => (d.price || 0) <= maxPrice);
    if (lowStock) all = all.filter((d) => (d.stockQuantity || 0) <= 5);

    const total = all.length;
    return Response.json({
        products: all.slice(skip, skip + limit),
        total,
        page: Math.floor(skip / limit),
        pages: Math.ceil(total / limit),
    });
});

// ── POST /api/admin/products — tạo sản phẩm mới ─────────────────────────────

export const POST = withApiError(async (req) => {
    const admin = await requireAdmin();
    requirePermission(admin, PERMISSIONS.PRODUCTS_CREATE)
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new ApiError(422, 'Thiếu tên sản phẩm');
    }
    if (!(body.price > 0)) {
        throw new ApiError(422, 'Giá sản phẩm phải lớn hơn 0');
    }
    if (!body.categoryId) {
        throw new ApiError(422, 'Thiếu categoryId');
    }
    if (!(body.stockQuantity >= 0)) {
        throw new ApiError(422, 'stockQuantity không hợp lệ');
    }

    if (body.sku) {
        const dup = await dbAdmin.collection('products').where('sku', '==', body.sku).limit(1).get();
        if (!dup.empty) throw new ApiError(400, `SKU '${body.sku}' đã tồn tại`);
    }

    let slug = body.slug || (body.name ? slugify(body.name) : '');
    if (slug) {
        const dup = await dbAdmin.collection('products').where('slug', '==', slug).limit(1).get();
        if (!dup.empty) throw new ApiError(400, `Slug '${slug}' đã tồn tại`);
    }

    const images = Array.isArray(body.images) ? body.images : [];
    const now = new Date();

    let discountPercent = body.discountPercent ?? null;
    if (discountPercent == null && body.originalPrice && body.originalPrice > body.price) {
        discountPercent = Math.round((1 - body.price / body.originalPrice) * 100);
    }

    const data = {
        name: body.name.trim(),
        description: body.description || '',
        shortDescription: body.shortDescription || '',
        price: body.price,
        originalPrice: body.originalPrice ?? null,
        discountPercent,
        stockQuantity: body.stockQuantity,
        brand: body.brand || '',
        categoryId: body.categoryId,
        categoryName: body.categoryName || '',
        categorySlug: body.categorySlug || '',
        sku: body.sku || '',
        slug,
        thumbnailUrl: body.thumbnailUrl || (images[0] ?? null),
        images,
        specs: Array.isArray(body.specs) ? body.specs : [],
        sourceUrl: body.sourceUrl || '',
        status: body.status || 'active',
        isFeatured: Boolean(body.isFeatured),
        rating: 0.0,
        totalReviews: 0,
        createdAt: now,
        updatedAt: now,
    };

    const ref = await dbAdmin.collection('products').add(data);

    await logAdminAction(dbAdmin, admin, {
        action: 'create_product',
        targetType: 'product',
        targetId: ref.id,
    });

    return Response.json(
        {
            message: 'Tạo sản phẩm thành công',
            product_id: ref.id,
            product: {
                ...data,
                id: ref.id,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            },
        },
        { status: 201 }
    );
});