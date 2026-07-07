import { apiServer } from '@/lib/api.server';
import SearchResults from '@/features/search/SearchResults';
import { searchProducts } from '@/lib/services/products';

const LIMIT = 20;

export default async function SearchPage({ searchParams }) {
    const sp = await searchParams;
    const query = sp.q || '';
    const categoryId = sp.category || '';

    let initialProducts = [];
    let initialTotal = 0;
    let initialCategoryName = '';

    // Giống hệt điều kiện trong code gốc: không có q và không có category -> không fetch
    if (query || categoryId) {
        try {
            // Lần render đầu luôn dùng filter mặc định (chưa bật bộ lọc nâng cao nào)
            const data = await searchProducts({
                q: query,
                categoryId: categoryId || undefined,
                limit: LIMIT,
                skip: 0,
            });
            initialProducts = data?.items || [];
            initialTotal = data?.total ?? initialProducts.length;

            if (categoryId && initialProducts.length > 0) {
                initialCategoryName = initialProducts[0].categoryName || categoryId;
            }
        } catch (err) {
            console.error('Lỗi tải kết quả tìm kiếm ban đầu:', err);
        }
    }

    return (
        <SearchResults
            query={query}
            categoryId={categoryId}
            initialProducts={initialProducts}
            initialTotal={initialTotal}
            initialCategoryName={initialCategoryName}
        />
    );
}