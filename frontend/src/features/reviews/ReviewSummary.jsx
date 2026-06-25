import StarRating from "../../components/ui/StarRating";

const RatingBar = ({ star, count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-slate-500">{star}</span>
            <i className="fas fa-star text-amber-400 text-[10px]" />
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
            {count > 0
                ? <span className="w-14 text-slate-400">{count} đánh giá</span>
                : <span className="w-14" />
            }
        </div>
    );
};

/**
 * ReviewSummary
 * @param {number} avgRating   - điểm trung bình
 * @param {number} total       - tổng số đánh giá
 * @param {Array}  reviews     - danh sách review đã tải (để tính distribution)
 */
const ReviewSummary = ({ avgRating, total, reviews }) => {
    const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => Math.round(r.rating) === star).length,
    }));

    return (
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row gap-6">

                {/* Điểm tổng */}
                <div className="flex flex-col items-center justify-center sm:pr-6 sm:border-r border-slate-200">
                    <span className="text-5xl font-extrabold text-slate-900 leading-none">
                        {avgRating.toFixed(1)}
                    </span>
                    <span className="text-slate-400 text-xs mt-0.5">/ 5</span>
                    <StarRating value={Math.round(avgRating)} size="md" />
                    <span className="text-xs text-slate-400 mt-1">{total} lượt đánh giá</span>
                </div>

                {/* Thanh phân phối */}
                <div className="flex-1 space-y-1.5 flex flex-col justify-center">
                    {distribution.map(({ star, count }) => (
                        <RatingBar key={star} star={star} count={count} total={reviews.length} />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ReviewSummary;