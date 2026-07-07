// src/lib/services/products.js
//
// Port 1:1 từ backend/app/api/routes/products.py.
// Dùng chung cho cả route.js (client gọi qua fetch) lẫn Server Component
// (page.jsx gọi thẳng trong lúc SSR, không cần vòng qua HTTP).

import { dbAdmin } from '@/lib/firebaseAdmin';
import { ApiError } from '@/lib/apiError';
import { docToPlain } from '@/lib/firestoreSerialize';

const docToProduct = docToPlain;

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

/** GET /api/products/{id}/related — cùng categoryId, loại trừ sản phẩm hiện tại */
export async function getRelatedProducts(productId, { limit = 8 } = {}) {
    const cappedLimit = Math.min(limit, 20);

    const doc = await dbAdmin.collection('products').doc(productId).get();
    if (!doc.exists) {
        throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    const categoryId = doc.data().categoryId;
    if (!categoryId) return { products: [] };

    // lấy dư 1 để bù cho việc loại sản phẩm hiện tại, giống bản FastAPI
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