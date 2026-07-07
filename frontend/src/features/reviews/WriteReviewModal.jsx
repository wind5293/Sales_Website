'use client'
import { useState } from "react";
import StarRating from "../../components/ui/StarRating";
import { RATING_LABELS } from "./reviewHelpers";

/**
 * WriteReviewModal
 * @param {string}   productId  - ID sản phẩm
 * @param {string}   userId     - ID người dùng đang đăng nhập
 * @param {string}   userName   - Tên người dùng đang đăng nhập
 * @param {function} onClose    - đóng modal
 * @param {function} onSuccess  - callback sau khi gửi thành công
 */
const WriteReviewModal = ({ productId, userId, userName, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (rating === 0) { setError("Vui lòng chọn số sao đánh giá."); return; }
        if (!text.trim()) { setError("Vui lòng nhập nội dung đánh giá."); return; }

        setSubmitting(true);
        setError("");
        try {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    user_name: userName,
                    rating,
                    title: title || RATING_LABELS[rating],
                    text: text.trim(),
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(res.status === 401
                    ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                    : (data.detail || 'Gửi đánh giá thất bại. Vui lòng thử lại.'));
                return;
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            if (err.response?.status === 401) {
                setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            } else {
                setError(err.response?.data?.detail || "Gửi đánh giá thất bại. Vui lòng thử lại.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 text-lg">Viết đánh giá</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Star picker */}
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                            Đánh giá của bạn <span className="text-red-500">*</span>
                        </p>
                        <div className="flex items-center gap-3">
                            <StarRating value={rating} size="xl" interactive onChange={setRating} />
                            {rating > 0 && (
                                <span className="text-sm font-semibold text-amber-500">{RATING_LABELS[rating]}</span>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">
                            Tiêu đề <span className="text-slate-400 font-normal">(tùy chọn)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Tóm tắt trải nghiệm của bạn..."
                            maxLength={100}
                            className="w-full border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">
                            Nội dung <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm..."
                            rows={4}
                            maxLength={1000}
                            className="w-full border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all resize-none"
                        />
                        <p className="text-xs text-slate-400 text-right mt-1">{text.length}/1000</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                            <i className="fas fa-exclamation-circle" /> {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><i className="fas fa-spinner fa-spin" /> Đang gửi...</>
                            : <><i className="fas fa-paper-plane" /> Gửi đánh giá</>}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default WriteReviewModal;