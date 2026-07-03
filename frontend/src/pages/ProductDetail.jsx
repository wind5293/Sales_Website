import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import axios from "axios";
import { formatPrice } from "../utils/format";
import ProductReviews from "../features/reviews/ProductReviews";
import ProductCard from '../components/ProductCard';

/**
 * ProductDetail
 * @param {string|null} currentUserId   - ID user đang đăng nhập (từ auth context)
 * @param {string|null} currentUserName - Tên user đang đăng nhập
 */
const ProductDetail = ({ currentUserId = null, currentUserName = null }) => {
    const { id } = useParams();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeImage, setActiveImage] = useState(null);
    const [cartMsg, setCartMsg] = useState('');
    const [relatedProducts, setRelatedProducts] = useState([]);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            setError(false);
            try {
                const res = await axios.get(`/api/products/${id}`);
                setProduct(res.data);

                const relatedRes = await axios.get(`/api/products/${id}/related?limit=8`);
                setRelatedProducts(relatedRes.data.products);

                setActiveImage(res.data.thumbnailUrl || (res.data.images && res.data.images[0]) || null);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleAddToCart = async () => {
        const result = await addToCart(product.id, 1);
        if (!result.success) setCartMsg(result.message);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-96 bg-slate-200 rounded-lg" />
                    <div className="space-y-4">
                        <div className="h-6 bg-slate-200 rounded w-1/3" />
                        <div className="h-8 bg-slate-200 rounded w-2/3" />
                        <div className="h-6 bg-slate-200 rounded w-1/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="text-center py-24 text-slate-400">
                <i className="fas fa-box-open text-4xl mb-3 block" />
                Không tìm thấy sản phẩm
                <div className="mt-4">
                    <Link to="/" className="text-amber-500 font-semibold hover:underline">
                        Quay về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    const isOutOfStock = product.status === 'out_of_stock';
    const gallery = product.images?.length > 0
        ? product.images
        : (product.thumbnailUrl ? [product.thumbnailUrl] : []);

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Breadcrumb */}
                <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
                    <Link to="/" className="hover:text-amber-500">Trang chủ</Link>
                    <span>/</span>
                    <span>{product.categoryName}</span>
                    <span>/</span>
                    <span className="text-slate-600">{product.name}</span>
                </div>

                {/* Main card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white p-6 lg:p-8 border border-slate-200">

                    {/* Cột ảnh */}
                    <div className="self-start sticky top-8">
                        <div className="h-96 w-full flex items-center justify-center bg-slate-50 rounded-sm p-4 mb-4">
                            {activeImage
                                ? <img src={activeImage} alt={product.name} className="max-h-full max-w-full object-contain" />
                                : <i className="fas fa-image text-6xl text-slate-300" />}
                        </div>
                        {gallery.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                                {gallery.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(img)}
                                        className={`h-16 w-16 rounded-sm border-2 overflow-hidden flex-shrink-0 ${activeImage === img ? 'border-[#fbbf24]' : 'border-slate-200'}`}
                                    >
                                        <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cột thông tin */}
                    <div>
                        <span className="text-sm text-slate-400 tracking-wider font-medium">
                            {product.brand}
                        </span>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1 mb-3">
                            {product.name}
                        </h1>

                        {(product.rating || product.item_sold) && (
                            <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                                {product.rating && (
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-star text-amber-400" /> {product.rating}
                                    </span>
                                )}
                                {product.item_sold && <span>Đã bán {product.item_sold}</span>}
                            </div>
                        )}

                        <div className="flex items-baseline gap-3 flex-wrap mb-4">
                            <span className="text-3xl font-extrabold text-yellow-500">
                                {formatPrice(product.price)}
                            </span>
                            {product.originalPrice > product.price && (
                                <>
                                    <span className="text-base text-slate-400 line-through">
                                        {formatPrice(product.originalPrice)}
                                    </span>
                                    {product.discountPercent && (
                                        <span className="text-xs bg-red-100 text-red-500 font-bold px-2 py-0.5 rounded">
                                            -{product.discountPercent}%
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {product.shortDescription && (
                            <p className="text-sm text-slate-600 mb-6">{product.shortDescription}</p>
                        )}

                        <div className="text-sm text-slate-500 mb-6">
                            {isOutOfStock
                                ? <span className="text-red-500 font-semibold">Hết hàng</span>
                                : <span className="text-green-600 font-semibold">
                                    Còn hàng {product.stockQuantity ? `(${product.stockQuantity})` : ''}
                                </span>}
                        </div>

                        <button
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                            className={`w-full font-semibold py-3 rounded-sm text-sm transition-colors flex items-center justify-center gap-2
                                ${isOutOfStock
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 cursor-pointer'}`}
                        >
                            <i className="fas fa-shopping-basket" />
                            {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
                        </button>
                        {cartMsg && <p className="text-red-500 text-sm mt-2">{cartMsg}</p>}

                        {/* Thông số kỹ thuật */}
                        {product.specs?.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">
                                    Thông số kỹ thuật
                                </h2>
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

                {/* Mô tả chi tiết */}
                {product.description && (
                    <div className="bg-white p-6 lg:p-8 rounded-sm border border-slate-200 mt-6">
                        <h2 className="text-sm font-bold text-slate-800 mb-3 tracking-wide">
                            Mô tả sản phẩm
                        </h2>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{product.description}</p>
                    </div>
                )}

                {/* Đánh giá */}
                <ProductReviews
                    productId={id}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                />

                {/* Sản phẩm liên quan */}
                {relatedProducts.length > 0 && (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-1 h-5 bg-amber-400 rounded inline-block"></span>
                            Sản phẩm liên quan
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((p) => (
                                <Link to={`/product/${p.id}`} key={p.id}>
                                    <ProductCard
                                        id={p.id}
                                        image={p.thumbnailUrl}
                                        category={p.categoryName}
                                        title={p.name}
                                        price={p.price}
                                        oldPrice={p.originalPrice}
                                        discountPercent={p.discountPercent}
                                        status={p.status}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProductDetail;