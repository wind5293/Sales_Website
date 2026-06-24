from fastapi import APIRouter, HTTPException, status, Query, Header
from typing import Optional, Literal
from datetime import datetime
from app.services.firebase import get_db
from app.models.schemas import CreateReviewRequest, UpdateReviewRequest, UpdateReviewWithProduct

router = APIRouter(tags=["Reviews"])
db = get_db()

# ─── Helper: cập nhật avg_rating trên document product ───────────────────────

def _recalculate_product_rating(product_id: str) -> dict:
    """
    Tính lại avg_rating & total_reviews từ sub-collection reviews
    rồi cập nhật lên document product để truy vấn nhanh.
    Trả về { avg_rating, total_reviews }.
    """
    reviews_ref = (
        db.collection("products")
        .document(product_id)
        .collection("reviews")
    )
    docs = list(reviews_ref.stream())
    total = len(docs)
    avg = round(sum(d.to_dict().get("rating", 0) for d in docs) / total, 2) if total else 0.0

    db.collection("products").document(product_id).update({
        "rating": avg,
        "totalReviews": total,
        "updatedAt": datetime.now(),
    })
    return {"avg_rating": avg, "total_reviews": total}


# ─── POST /api/products/{product_id}/reviews ─────────────────────────────────

@router.post("/api/products/{product_id}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(product_id: str, body: CreateReviewRequest):
    """
    Tạo một đánh giá mới cho sản phẩm.
    Mỗi user chỉ được đánh giá 1 sản phẩm 1 lần — nếu đã có thì trả 409.
    Sau khi tạo, tự động cập nhật lại avg_rating trên document product.
    """
    # 1. Kiểm tra sản phẩm tồn tại
    product_ref = db.collection("products").document(product_id)
    if not product_ref.get().exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # 2. Kiểm tra user đã review chưa (1 user – 1 review / sản phẩm)
    existing = (
        product_ref.collection("reviews")
        .where("userId", "==", body.user_id)
        .limit(1)
        .stream()
    )
    if any(True for _ in existing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã đánh giá sản phẩm này rồi. Hãy chỉnh sửa đánh giá hiện tại.",
        )

    # 3. Tạo review trong sub-collection
    review_data = {
        "userId": body.user_id,
        "userName": body.user_name or "Ẩn danh",
        "rating": body.rating,
        "title": body.title,
        "text": body.text,
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
        "productId": product_id,
    }
    _, doc_ref = product_ref.collection("reviews").add(review_data)

    # 4. Cập nhật avg_rating trên product
    _recalculate_product_rating(product_id)

    return {"review_id": doc_ref.id, "message": "Đánh giá đã được gửi thành công"}


# ─── GET /api/products/{product_id}/reviews ──────────────────────────────────
@router.get("/api/products/{product_id}/reviews")
def list_reviews(
    product_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort_by: Literal["date", "rating"] = Query("date", description="Sắp xếp theo ngày hoặc điểm"),
):
    """
    Trả về danh sách review của một sản phẩm, hỗ trợ phân trang và sắp xếp.
    - sort_by=date   → mới nhất trước
    - sort_by=rating → điểm cao nhất trước
    avg_rating được tính từ toàn bộ reviews (không phụ thuộc phân trang).
    """
    product_ref = db.collection("products").document(product_id)
    if not product_ref.get().exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # Lấy toàn bộ để tính avg + sort phía server (Firestore giới hạn compound query)
    docs = list(product_ref.collection("reviews").stream())
    reviews = []
    for doc in docs:
        r = doc.to_dict()
        r["id"] = doc.id
        reviews.append(r)

    # Tính avg_rating từ tập đầy đủ
    total = len(reviews)
    avg_rating = round(sum(r.get("rating", 0) for r in reviews) / total, 2) if total else 0.0

    # Sắp xếp
    if sort_by == "rating":
        reviews.sort(key=lambda r: r.get("rating", 0), reverse=True)
    else:  # date
        reviews.sort(
            key=lambda r: r.get("createdAt") or datetime.min,
            reverse=True,
        )

    # Phân trang
    paginated = reviews[skip: skip + limit]

    # Chuyển datetime → ISO string để JSON serialize
    for r in paginated:
        for field in ("createdAt", "updatedAt"):
            if isinstance(r.get(field), datetime):
                r[field] = r[field].isoformat()

    return {
        "reviews": paginated,
        "total": total,
        "avg_rating": avg_rating,
        "limit": limit,
        "skip": skip,
    }


# ─── GET /api/products/{product_id}/rating ───────────────────────────────────

@router.get(
    "/api/products/{product_id}/rating",
    summary="Lấy điểm đánh giá trung bình của sản phẩm",
)
def get_product_rating(product_id: str):
    """
    Trả về avg_rating & total_reviews từ document product (đã được cache).
    Nhanh hơn so với đếm lại toàn bộ sub-collection mỗi lần gọi.
    """
    doc = db.collection("products").document(product_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    data = doc.to_dict()
    return {
        "avg_rating": data.get("rating", 0.0),
        "total_reviews": data.get("totalReviews", 0),
    }


# ─── PATCH /api/reviews/{review_id} ──────────────────────────────────────────

@router.patch(
    "/api/reviews/{review_id}",
    summary="Chỉnh sửa đánh giá của mình",
)
def update_review(review_id: str, body: UpdateReviewWithProduct):
    """
    Chỉ cho phép chỉnh sửa review do chính user tạo ra.
    Cần truyền user_id (thực tế nên lấy từ JWT token).
    Nếu rating thay đổi, tự động tính lại avg_rating của sản phẩm.
    """
    # Tìm review trong tất cả sản phẩm (dùng collection group query)
    review_ref = (
        db.collection("products")
        .document(body.product_id)
        .collection("reviews")
        .document(review_id)
    )
    doc = review_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
 
    # Xác thực quyền sở hữu
    if doc.to_dict().get("userId") != body.user_id:
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền chỉnh sửa đánh giá này",
        )
 
    # Chỉ update các field được gửi lên (bỏ qua user_id & product_id)
    exclude_keys = {"user_id", "product_id"}
    updates = {k: v for k, v in body.model_dump().items()
               if k not in exclude_keys and v is not None}
    updates["updatedAt"] = datetime.now()
 
    review_ref.update(updates)
 
    # Tính lại avg nếu rating thay đổi
    if "rating" in updates:
        _recalculate_product_rating(body.product_id)
 
    # Trả về review đã cập nhật
    updated = review_ref.get().to_dict()
    updated["id"] = review_id
    for field in ("createdAt", "updatedAt"):
        if isinstance(updated.get(field), datetime):
            updated[field] = updated[field].isoformat()
 
    return {"message": "Cập nhật đánh giá thành công", "review": updated}


# ─── DELETE /api/reviews/{review_id} ─────────────────────────────────────────

@router.delete(
    "/api/reviews/{review_id}",
    summary="Xóa đánh giá của mình",
)
def delete_review(
    review_id: str,
    user_id: str = Query(..., description="ID người dùng (từ auth token)"),
    product_id: str = Query(..., description="ID sản phẩm chứa review"),
):
    """
    Xóa review do chính user tạo ra.
    Sau khi xóa, tự động tính lại avg_rating của sản phẩm.
    """
    # Tìm review thuộc user này
    review_ref = (
        db.collection("products")
        .document(product_id)
        .collection("reviews")
        .document(review_id)
    )
    doc = review_ref.get()
 
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
 
    # Xác thực quyền sở hữu
    if doc.to_dict().get("userId") != user_id:
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xóa đánh giá này",
        )
 
    review_ref.delete()
 
    # Tính lại avg_rating sau khi xóa
    _recalculate_product_rating(product_id)
 
    return {"message": "Đã xóa đánh giá thành công"}