'use client';
import { useState } from "react";
import axios from "axios";
import Avatar from "../../components/ui/Avatar";
import StarRating from "../../components/ui/StarRating";
import { RATING_LABELS, timeAgo } from "./reviewHelpers";

/**
 * ReviewCard
 * @param {object}   review         - dữ liệu review từ API
 * @param {string}   currentUserId  - ID user đang đăng nhập (để kiểm tra quyền)
 * @param {string}   productId      - ID sản phẩm chứa review
 * @param {function} onUpdated      - callback sau khi chỉnh sửa thành công
 * @param {function} onDeleted      - callback sau khi xóa thành công
 */
const ReviewCard = ({ review, currentUserId, productId, onUpdated, onDeleted }) => {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(review.text || "");
    const [editRating, setEditRating] = useState(review.rating || 5);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwner = currentUserId && review.userId === currentUserId;

    const handleSave = async () => {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            await axios.patch(`/api/reviews/${review.id}`, {
                user_id: currentUserId,
                product_id: productId,
                rating: editRating,
                text: editText.trim(),
                title: RATING_LABELS[editRating],
            });
            setEditing(false);
            onUpdated?.();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/reviews/${review.id}`, {
                params: { user_id: currentUserId, product_id: productId },
            });
            onDeleted?.();
        } catch (err) {
            console.error(err);
            setDeleting(false);
        }
    };

    return (
        <div className="py-5 border-b border-slate-100 last:border-0">
            <div className="flex gap-3">
                <Avatar name={review.userName} />
                <div className="flex-1 min-w-0">

                    {/* Header: tên + sao + thời gian */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <span className="font-semibold text-slate-800 text-sm">{review.userName}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <StarRating value={review.rating} size="sm" />
                                <span className="text-xs font-medium text-slate-600">
                                    {RATING_LABELS[review.rating] || ""}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <i className="far fa-clock" /> {timeAgo(review.createdAt)}
                        </span>
                    </div>

                    {/* Tiêu đề */}
                    {review.title && !editing && (
                        <p className="text-sm font-medium text-slate-700 mt-2">{review.title}</p>
                    )}

                    {/* Nội dung hoặc form chỉnh sửa */}
                    {editing ? (
                        <div className="mt-3 space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Đánh giá lại:</p>
                                <StarRating value={editRating} size="lg" interactive onChange={setEditRating} />
                            </div>
                            <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                rows={3}
                                maxLength={1000}
                                className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(false)}
                                    className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-3 py-1.5 text-xs bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 font-semibold transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{review.text}</p>
                    )}

                    {/* Actions (chỉ hiện với chủ review) */}
                    {isOwner && !editing && (
                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={() => { setEditing(true); setEditText(review.text); setEditRating(review.rating); }}
                                className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1"
                            >
                                <i className="fas fa-pen text-[10px]" /> Chỉnh sửa
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-xs text-red-400 hover:text-red-500 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                                <i className="fas fa-trash text-[10px]" /> {deleting ? "Đang xóa..." : "Xóa"}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReviewCard;