import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ReviewSummary from "./ReviewSummary";
import ReviewList from "./ReviewList";
import WriteReviewModal from "./WriteReviewModal";

const LIMIT = 5;

/**
 * ProductReviews — orchestrator
 * Chịu trách nhiệm duy nhất: fetch data và quản lý state.
 * Render delegate cho ReviewSummary, ReviewList, WriteReviewModal.
 *
 * @param {string}      productId       - ID sản phẩm
 * @param {string|null} currentUserId   - ID user đang đăng nhập
 * @param {string|null} currentUserName - Tên user đang đăng nhập
 */
const ProductReviews = ({ productId, currentUserId = null, currentUserName = null }) => {
    const [reviews, setReviews] = useState([]);
    const [total, setTotal] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(0);

    const fetchReviews = useCallback(async (reset = false) => {
        const skip = reset ? 0 : page * LIMIT;
        reset ? setLoading(true) : setLoadingMore(true);
        try {
            const { data } = await axios.get(`/api/products/${productId}/reviews`, {
                params: { limit: LIMIT, skip, sort_by: sortBy },
            });
            setAvgRating(data.avg_rating);
            setTotal(data.total);
            if (reset) {
                setReviews(data.reviews);
                setPage(1);
            } else {
                setReviews(prev => [...prev, ...data.reviews]);
                setPage(p => p + 1);
            }
        } catch (err) {
            console.error("Lỗi tải đánh giá:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [productId, sortBy, page]);

    // Reset và fetch lại khi đổi sortBy
    useEffect(() => {
        fetchReviews(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, sortBy]);

    return (
        <>
            {showModal && (
                <WriteReviewModal
                    productId={productId}
                    userId={currentUserId}
                    userName={currentUserName}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => fetchReviews(true)}
                />
            )}

            <div className="bg-white border border-slate-200 overflow-hidden mt-6">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                        Đánh giá sản phẩm
                    </h2>
                    {currentUserId ? (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
                        >
                            <i className="fas fa-pen-to-square" /> Viết đánh giá
                        </button>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Đăng nhập để đánh giá</span>
                    )}
                </div>

                {/* Body */}
                {loading ? (
                    <div className="p-6 space-y-4 animate-pulse">
                        <div className="h-24 bg-slate-100 rounded-lg" />
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
                    </div>
                ) : (
                    <>
                        <ReviewSummary avgRating={avgRating} total={total} reviews={reviews} />
                        <ReviewList
                            reviews={reviews}
                            total={total}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            sortBy={sortBy}
                            onSortChange={(val) => { setSortBy(val); }}
                            loadingMore={loadingMore}
                            onLoadMore={() => fetchReviews(false)}
                            currentUserId={currentUserId}
                            productId={productId}
                            onReviewUpdated={() => fetchReviews(true)}
                            onReviewDeleted={() => fetchReviews(true)}
                        />
                    </>
                )}

            </div>
        </>
    );
};

export default ProductReviews;