import ReviewCard from "./ReviewCard";
import { FILTERS } from "./reviewHelpers";

/**
 * ReviewList
 * @param {Array}    reviews        - danh sách review hiện tại
 * @param {number}   total          - tổng số review trên server
 * @param {string}   activeFilter   - key filter đang chọn
 * @param {function} onFilterChange
 * @param {string}   sortBy         - "date" | "rating"
 * @param {function} onSortChange
 * @param {boolean}  loadingMore
 * @param {function} onLoadMore
 * @param {string}   currentUserId
 * @param {string}   productId
 * @param {function} onReviewUpdated
 * @param {function} onReviewDeleted
 */
const ReviewList = ({
    reviews,
    total,
    activeFilter,
    onFilterChange,
    sortBy,
    onSortChange,
    loadingMore,
    onLoadMore,
    currentUserId,
    productId,
    onReviewUpdated,
    onReviewDeleted,
}) => {
    const filtered = activeFilter === "all"
        ? reviews
        : reviews.filter(r => Math.round(r.rating) === Number(activeFilter));

    const hasMore = reviews.length < total;

    return (
        <>
            {/* Filter + Sort bar */}
            <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => onFilterChange(f.key)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                                ${activeFilter === f.key
                                    ? "bg-[#fbbf24] border-[#fbbf24] text-slate-900"
                                    : "border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600"}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <select
                    value={sortBy}
                    onChange={e => onSortChange(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-white"
                >
                    <option value="date">Mới nhất</option>
                    <option value="rating">Đánh giá cao nhất</option>
                </select>
            </div>

            {/* Danh sách */}
            <div className="px-6">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <i className="far fa-comment-dots text-3xl mb-2 block" />
                        <p className="text-sm">
                            {activeFilter === "all"
                                ? "Chưa có đánh giá nào. Hãy là người đầu tiên!"
                                : `Không có đánh giá ${activeFilter} sao.`}
                        </p>
                    </div>
                ) : (
                    filtered.map(review => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            currentUserId={currentUserId}
                            productId={productId}
                            onUpdated={onReviewUpdated}
                            onDeleted={onReviewDeleted}
                        />
                    ))
                )}
            </div>

            {/* Load more */}
            {hasMore && activeFilter === "all" && (
                <div className="px-6 py-4 border-t border-slate-100 text-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-sm text-amber-500 font-semibold hover:text-amber-600 transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50"
                    >
                        {loadingMore
                            ? <><i className="fas fa-spinner fa-spin" /> Đang tải...</>
                            : <><i className="fas fa-chevron-down" /> Xem thêm ({total - reviews.length} còn lại)</>}
                    </button>
                </div>
            )}
        </>
    );
};

export default ReviewList;