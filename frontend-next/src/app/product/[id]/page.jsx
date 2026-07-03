import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api.server';
import { getCurrentUser } from '@/lib/auth.server';
import { formatPrice } from '@/utils/format';
import ProductReviews from '@/features/reviews/ProductReviews';
import ProductCard from '@/components/ProductCard';
import ProductGallery from '@/components/ProductGallery';
import AddToCartButton from '@/components/AddToCartButton';


export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        const product = await apiServer(`/api/products/${id}`);
        return {
            title: `${product.name} | electro.`,
            description: product.shortDescription || product.description?.slice(0, 160),
        };
    } catch {
        return { title: 'Sản phẩm | electro.' };
    }
}

export default async function ProductDetailPage({ params }) {
    const { id } = await params;
    const user = await getCurrentUser();

    let product, relatedProducts;
    try {
        product = await apiServer(`/api/products/${id}`);
        const relatedRes = await apiServer(`/api/products/${id}/related?limit=8`);
        relatedProducts = relatedRes.products;
    } catch {
        notFound();
    }

    const isOutOfStock = product.status === 'out_of_stock';
    const gallery = product.images?.length > 0
        ? product.images
        : (product.thumbnailUrl ? [product.thumbnailUrl] : []);

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-8">

                <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
                    <Link href="/" className="hover:text-amber-500">Trang chủ</Link>
                    <span>/</span>
                    <span>{product.categoryName}</span>
                    <span>/</span>
                    <span className="text-slate-600">{product.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white p-6 lg:p-8 border border-slate-200">

                    {/* Đảo tương tác 1: đổi ảnh — Client Component riêng */}
                    <ProductGallery images={gallery} productName={product.name} />

                    <div>
                        <span className="text-sm text-slate-400 tracking-wider font-medium">{product.brand}</span>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1 mb-3">{product.name}</h1>

                        {(product.rating || product.item_sold) && (
                            <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                                {product.rating && (
                                    <span className="flex items-center gap-1"><i className="fas fa-star text-amber-400" /> {product.rating}</span>
                                )}
                                {product.item_sold && <span>Đã bán {product.item_sold}</span>}
                            </div>
                        )}

                        <div className="flex items-baseline gap-3 flex-wrap mb-4">
                            <span className="text-3xl font-extrabold text-yellow-500">{formatPrice(product.price)}</span>
                            {product.originalPrice > product.price && (
                                <>
                                    <span className="text-base text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                                    {product.discountPercent && (
                                        <span className="text-xs bg-red-100 text-red-500 font-bold px-2 py-0.5 rounded">-{product.discountPercent}%</span>
                                    )}
                                </>
                            )}
                        </div>

                        {product.shortDescription && <p className="text-sm text-slate-600 mb-6">{product.shortDescription}</p>}

                        <div className="text-sm text-slate-500 mb-6">
                            {isOutOfStock
                                ? <span className="text-red-500 font-semibold">Hết hàng</span>
                                : <span className="text-green-600 font-semibold">Còn hàng {product.stockQuantity ? `(${product.stockQuantity})` : ''}</span>}
                        </div>

                        {/* Đảo tương tác 2: thêm giỏ hàng — Client Component riêng */}
                        <AddToCartButton productId={product.id} isOutOfStock={isOutOfStock} />

                        {product.specs?.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">Thông số kỹ thuật</h2>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {product.specs.map((spec, i) => {
                                            const label = spec.key || spec.name || Object.keys(spec)[0];
                                            const value = spec.value || spec[label];
                                            return (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-500 w-1/3">{label}</td>
                                                    <td className="py-2 text-slate-800 font-medium">{value}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {product.description && (
                    <div className="bg-white p-6 lg:p-8 rounded-sm border border-slate-200 mt-6">
                        <h2 className="text-sm font-bold text-slate-800 mb-3 tracking-wide">Mô tả sản phẩm</h2>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{product.description}</p>
                    </div>
                )}

                <ProductReviews 
                    productId={id} 
                    currentUserId={user?.id || null}
                    currentUserName={user?.name === 'Welcome' ? null : user?.name}
                />

                {relatedProducts.length > 0 && (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-1 h-5 bg-amber-400 rounded inline-block"></span>
                            Sản phẩm liên quan
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((p) => (
                                <Link href={`/product/${p.id}`} key={p.id}>
                                    <ProductCard
                                        id={p.id} image={p.thumbnailUrl} category={p.categoryName}
                                        title={p.name} price={p.price} oldPrice={p.originalPrice}
                                        discountPercent={p.discountPercent} status={p.status}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}