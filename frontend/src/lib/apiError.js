// src/lib/apiError.js
//
// FastAPI trả lỗi dạng { "detail": "..." } (HTTPException).
// Toàn bộ frontend (adminApi interceptor, các trang catch lỗi...) đang parse
// cứng theo field này -> route.js mới PHẢI trả đúng format để không vỡ UI.

export class ApiError extends Error {
    constructor(status, detail) {
        super(typeof detail === 'string' ? detail : 'Đã có lỗi xảy ra');
        this.status = status;
        this.detail = detail;
    }
}

export function errorResponse(status, detail) {
    return Response.json({ detail }, { status });
}

/**
 * Bọc quanh handler của route.js để tự bắt ApiError -> Response chuẩn,
 * và log lỗi không lường trước thành 500 kèm message chung chung
 * (giống nhánh `except Exception` trong các route FastAPI cũ).
 *
 * Dùng: export const POST = withApiError(async (req) => { ... });
 */
export function withApiError(handler) {
    return async (...args) => {
        try {
            return await handler(...args);
        } catch (err) {
            if (err instanceof ApiError) {
                return errorResponse(err.status, err.detail);
            }
            console.error('[api] Lỗi không xác định:', err);
            return errorResponse(500, 'Đã có lỗi xảy ra, vui lòng thử lại sau');
        }
    };
}