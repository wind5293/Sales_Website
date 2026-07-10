// src/lib/services/products.js
//
// Port 1:1 từ backend/app/api/routes/products.py.
// Dùng chung cho cả route.js (client gọi qua fetch) lẫn Server Component
// (page.jsx gọi thẳng trong lúc SSR, không cần vòng qua HTTP).

import { dbAdmin } from '@/lib/firebaseAdmin';
import { ApiError } from '@/lib/apiError';
import { docToPlain } from '@/lib/firestoreSerialize';

const docToProduct = docToPlain;

//  --- Helpers ---------------------- 

function normalizeModel(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function extractPhoneModelName(fullName) {
    if (!fullName) return null;
    let base = fullName.split('|')[0].trim();
    base = base.replace(/\b\d+\s?(GB|TB|MB)\b/gi, '').trim();
    return base;
}

function getAccessoryCompatibleModel(product) {
    const spec = (product.specs || []).find(
        (s) => s.name === 'Dùng được cho' || s.name === 'Dòng sản phẩm'
    );
    return spec ? normalizeModel(spec.value) : null;
}

function storageToGB(str) {
    const match = String(str || '').match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i);
    if (!match) return Number.MAX_SAFE_INTEGER; // đẩy giá trị không đọc được xuống cuối
    const value = parseFloat(match[1]);
    return match[2].toUpperCase() === 'TB' ? value * 1024 : value;
}

/** GET /api/products */
export async function listProducts({ categoryId, status = 'active', isFeatured, limit = 20 } = {}) {
    const cappedLimit = Math.min(limit, 100);

    let query = dbAdmin.collection('products');
    if (status) query = query.where('status', '==', status);
    if (categoryId) query = query.where('categoryId', '==', categoryId);
    if (isFeatured !== undefined && isFeatured !== null) {
        query = query.where('isFeatured', '==', isFeatured);
    }

    const snap = await query.limit(cappedLimit).get();
    const products = snap.docs.map(docToProduct);
    return { products, total: products.length };
}

/** GET /api/products/category/all */
export async function listCategories() {
    const snap = await dbAdmin.collection('categories').get();
    return { categories: snap.docs.map(docToProduct) };
}

/**
 * GET /api/products/search
 * Full-text search theo tên, brand, categoryName, description, sku.
 * Firestore không hỗ trợ native full-text — cân nhắc Algolia khi dataset > 1000 sản phẩm.
 */
export async function searchProducts({ q = '', categoryId, limit = 20, skip = 0 } = {}) {
    const cappedLimit = Math.min(limit, 100);

    let query = dbAdmin.collection('products').where('status', '!=', 'hidden');
    if (categoryId) query = query.where('categoryId', '==', categoryId);

    const snap = await query.get();
    const keyword = q.trim().toLowerCase();

    let matched = snap.docs.map(docToProduct).filter((p) => {
        if (!keyword) return true;
        const searchable = [p.name, p.brand, p.categoryName, p.shortDescription, p.description, p.sku]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return searchable.includes(keyword);
    });

    if (keyword) {
        matched.sort((a, b) => {
            const aScore = (a.name || '').toLowerCase().includes(keyword) ? 0 : 1;
            const bScore = (b.name || '').toLowerCase().includes(keyword) ? 0 : 1;
            return aScore - bScore;
        });
    }

    return {
        items: matched.slice(skip, skip + cappedLimit),
        total: matched.length,
        keyword: q,
        limit: cappedLimit,
        skip,
    };
}

/** GET /api/products/filter */
export async function filterProducts({
    category,
    categoryId,
    priceMin,
    priceMax,
    ratingMin,
    inStock,
    limit = 20,
    skip = 0,
} = {}) {
    const cappedLimit = Math.min(limit, 100);

    let query = dbAdmin.collection('products').where('status', '!=', 'hidden');
    if (categoryId) query = query.where('categoryId', '==', categoryId);
    if (inStock === true) query = query.where('status', '==', 'active');

    const snap = await query.get();

    let items = snap.docs.map(docToProduct).filter((p) => {
        if (category) {
            const cat = category.toLowerCase();
            const matchCat =
                (p.categoryId || '').toLowerCase() === cat ||
                (p.categoryName || '').toLowerCase().includes(cat);
            if (!matchCat) return false;
        }
        if (priceMin != null && (p.price || 0) < priceMin) return false;
        if (priceMax != null && (p.price || 0) > priceMax) return false;
        if (ratingMin != null && (p.rating || 0) < ratingMin) return false;
        if (inStock === false && p.status !== 'out_of_stock') return false;
        return true;
    });

    items.sort((a, b) => {
        const aFeatured = a.isFeatured ? 0 : 1;
        const bFeatured = b.isFeatured ? 0 : 1;
        if (aFeatured !== bFeatured) return aFeatured - bFeatured;
        return (a.price || 0) - (b.price || 0);
    });

    const filtersApplied = Object.fromEntries(
        Object.entries({
            category,
            price_min: priceMin,
            price_max: priceMax,
            rating_min: ratingMin,
            in_stock: inStock,
        }).filter(([, v]) => v !== undefined && v !== null)
    );

    return {
        items: items.slice(skip, skip + cappedLimit),
        total: items.length,
        filters_applied: filtersApplied,
        limit: cappedLimit,
        skip,
    };
}

/** GET /api/products/new — sản phẩm mới nhất, sort createdAt desc */
export async function getNewProducts({ limit = 8 } = {}) {
    const cappedLimit = Math.min(limit, 20);
    const snap = await dbAdmin
        .collection('products')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(cappedLimit)
        .get();
    return { products: snap.docs.map(docToProduct) };
}

/** GET /api/products/{id}/related — sản phẩm tương tự cùng categoryId, để so sánh trên trang chi tiết */
export async function getRelatedProducts(productId, { limit = 8 } = {}) {
    const cappedLimit = Math.min(limit, 20);

    const doc = await dbAdmin.collection('products').doc(productId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const productData = doc.data();
    const categoryId = productData.categoryId;

    if (!categoryId) {
        return { products: [] };
    }

    const snap = await dbAdmin
        .collection('products')
        .where('categoryId', '==', categoryId)
        .where('status', '==', 'active')
        .limit(cappedLimit + 1)
        .get();

    const products = snap.docs
        .map(docToProduct)
        .filter((p) => p.id !== productId)
        .slice(0, cappedLimit);

    return { products };
}

/** GET /api/products/{id}/related — cùng categoryId, loại trừ sản phẩm hiện tại */
export async function getCrossSellSuggestions(productId, { limit = 8 } = {}) {
    const cappedLimit = Math.min(limit, 20);

    const doc = await dbAdmin.collection('products').doc(productId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const productData = doc.data();
    const categorySlug = productData.categorySlug;

    if (!categorySlug) {
        return { products: [] };
    }

    const ruleDoc = await dbAdmin.collection('cross_sell_rules').doc(categorySlug).get();
    const ruleData = ruleDoc.exists ? ruleDoc.data() : null;
    const suggested = ruleData?.suggested || [];

    if (suggested.length === 0) {
        return { products: [] };
    }

    const sortedSuggested = [...suggested].sort((a, b) => a.priority - b.priority);
    // Firestore 'in' giới hạn 10 giá trị
    const suggestedSlugs = sortedSuggested.map((s) => s.slug).slice(0, 10);

    const snap = await dbAdmin
        .collection('products')
        .where('categorySlug', 'in', suggestedSlugs)
        .where('status', '==', 'active')
        .limit(500) // lấy rộng để có đủ dữ liệu chia slot, giới hạn thật ở bước sort/slice
        .get();

    const allMatched = snap.docs
        .map(docToProduct)
        .filter((p) => p.id !== productId);

    const applyPriceFilter = ruleData?.applyPriceFilter === true;
    const sourcePrice = productData.price;

    let filteredMatched = allMatched;
    if (applyPriceFilter && sourcePrice != null) {
        filteredMatched = allMatched.filter((p) => (p.price ?? 0) <= sourcePrice);
    }

    const sourceModel = normalizeModel(extractPhoneModelName(productData.name));
    const modelMatchSlugs = new Set(
        sortedSuggested.filter((s) => s.requireModelMatch).map((s) => s.slug)
    );

    if (modelMatchSlugs.size > 0 && sourceModel) {
        filteredMatched = filteredMatched.filter((p) => {
            if (!modelMatchSlugs.has(p.categorySlug)) return true;
            const accModel = getAccessoryCompatibleModel(p);
            if (!accModel) return true;
            return accModel === sourceModel;
        });
    }

    // Gom sản phẩm theo từng category slug, giữ nguyên thứ tự ưu tiên (vd: featured trước)
    const bySlug = new Map(suggestedSlugs.map((slug) => [slug, []]));
    filteredMatched.forEach((p) => {
        const bucket = bySlug.get(p.categorySlug);
        if (bucket) bucket.push(p);
    });
    bySlug.forEach((list, slug) => {
        const requiresMatch = modelMatchSlugs.has(slug);
        list.sort((a, b) => {
            // Với slug cần match model: sản phẩm match rõ (tier 0) lên trước
            // sản phẩm thiếu spec/không xác định được model (tier 1) xuống sau
            if (requiresMatch && sourceModel) {
                const tierA = getAccessoryCompatibleModel(a) === sourceModel ? 0 : 1;
                const tierB = getAccessoryCompatibleModel(b) === sourceModel ? 0 : 1;
                if (tierA !== tierB) return tierA - tierB;
            }
            return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        });
    });

    // Chia đều slot cho từng category, phần dư ưu tiên cho category priority cao hơn
    const numCategories = suggestedSlugs.length;
    const baseSlots = Math.floor(cappedLimit / numCategories);
    const extraSlots = cappedLimit % numCategories;

    const slotsBySlug = new Map(
        suggestedSlugs.map((slug, idx) => [slug, baseSlots + (idx < extraSlots ? 1 : 0)])
    );

    let products = [];
    let leftover = 0;

    // Vòng 1: lấy đúng slot đã chia cho mỗi category
    suggestedSlugs.forEach((slug) => {
        const want = slotsBySlug.get(slug);
        const available = bySlug.get(slug) || [];
        const taken = available.slice(0, want);
        products.push(...taken);
        if (taken.length < want) leftover += want - taken.length; // category thiếu hàng
    });

    // Vòng 2: nếu có category thiếu hàng, bù slot dư bằng sản phẩm còn lại
    // của các category khác (ưu tiên priority cao trước), để vẫn cố gắng đủ limit
    if (leftover > 0) {
        for (const slug of suggestedSlugs) {
            if (leftover <= 0) break;
            const available = bySlug.get(slug) || [];
            const already = slotsBySlug.get(slug);
            const extra = available.slice(already, already + leftover);
            products.push(...extra);
            leftover -= extra.length;
        }
    }

    products = products.slice(0, cappedLimit);

    return { products };
}

/** GET /api/products/{id}/variants — các phiên bản dung lượng cùng dòng máy (cùng productGroupId) */
export async function getProductGroupVariants(productGroupId) {
    if (!productGroupId) return [];

    const snap = await dbAdmin
        .collection('products')
        .where('productGroupId', '==', productGroupId)
        .where('status', '==', 'active')
        .get();

    const variants = snap.docs.map(docToProduct);
    return variants.sort((a, b) => storageToGB(a.storageGB) - storageToGB(b.storageGB));
}

/** GET /api/products/{id} */
export async function getProduct(productId) {
    const doc = await dbAdmin.collection('products').doc(productId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const data = doc.data();
    if (['hidden', 'draft'].includes(data.status)) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    return docToProduct(doc);
}