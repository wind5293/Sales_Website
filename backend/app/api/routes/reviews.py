"""
app/api/routes/reviews.py

POST   /api/products/{id}/reviews      — Tạo review
GET    /api/products/{id}/reviews      — Danh sách review
GET    /api/products/{id}/rating       — Rating trung bình
PATCH  /api/reviews/{id}               — Chỉnh sửa review
DELETE /api/reviews/{id}               — Xóa review
"""

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.firebase import get_db
from app.core.security import get_uid, verify_token
from app.schemas import CreateReviewRequest, UpdateReviewRequest

router = APIRouter(tags=["Reviews"])
db = get_db()


def _recalculate_rating(product_id: str):
    """Tính lại avg_rating & totalReviews, lưu lên document product."""
    docs = list(db.collection("products").document(product_id).collection("reviews").stream())
    total = len(docs)
    avg = round(sum(d.to_dict().get("rating", 0) for d in docs) / total, 2) if total else 0.0
    db.collection("products").document(product_id).update({
        "rating": avg,
        "totalReviews": total,
        "updatedAt": datetime.now(),
    })


@router.post("/api/products/{product_id}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(
    product_id: str,
    body: CreateReviewRequest,
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)

    product_ref = db.collection("products").document(product_id)
    if not product_ref.get().exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # Mỗi user chỉ review 1 lần / sản phẩm
    existing = list(product_ref.collection("reviews").where("userId", "==", uid).limit(1).stream())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã đánh giá sản phẩm này rồi. Hãy chỉnh sửa đánh giá hiện tại.",
        )

    # Lấy tên hiển thị từ Firebase Auth
    from firebase_admin import auth as fb_auth
    try:
        user_record = fb_auth.get_user(uid)
        user_name = user_record.display_name or "Ẩn danh"
    except Exception:
        user_name = "Ẩn danh"

    now = datetime.now()
    _, ref = product_ref.collection("reviews").add({
        "userId": uid,
        "userName": user_name,
        "rating": body.rating,
        "title": body.title,
        "text": body.text,
        "productId": product_id,
        "createdAt": now,
        "updatedAt": now,
    })

    _recalculate_rating(product_id)
    return {"review_id": ref.id, "message": "Đánh giá đã được gửi thành công"}


@router.get("/api/products/{product_id}/reviews")
def list_reviews(
    product_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort_by: Literal["date", "rating"] = Query("date"),
):
    product_ref = db.collection("products").document(product_id)
    if not product_ref.get().exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    docs = list(product_ref.collection("reviews").stream())
    reviews = [{"id": doc.id, **doc.to_dict()} for doc in docs]

    total = len(reviews)
    avg_rating = round(sum(r.get("rating", 0) for r in reviews) / total, 2) if total else 0.0

    reviews.sort(
        key=lambda r: r.get("rating", 0) if sort_by == "rating" else (r.get("createdAt") or datetime.min),
        reverse=True,
    )

    paginated = reviews[skip: skip + limit]
    for r in paginated:
        for field in ("createdAt", "updatedAt"):
            if isinstance(r.get(field), datetime):
                r[field] = r[field].isoformat()

    return {"reviews": paginated, "total": total, "avg_rating": avg_rating, "limit": limit, "skip": skip}


@router.get("/api/products/{product_id}/rating")
def get_product_rating(product_id: str):
    doc = db.collection("products").document(product_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    data = doc.to_dict()
    return {"avg_rating": data.get("rating", 0.0), "total_reviews": data.get("totalReviews", 0)}


@router.patch("/api/reviews/{review_id}")
def update_review(
    review_id: str,
    product_id: str = Query(..., description="ID sản phẩm chứa review"),
    body: UpdateReviewRequest = ...,
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)
    ref = db.collection("products").document(product_id).collection("reviews").document(review_id)
    doc = ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
    if doc.to_dict().get("userId") != uid:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa đánh giá này")

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    updates["updatedAt"] = datetime.now()
    ref.update(updates)

    if "rating" in updates:
        _recalculate_rating(product_id)

    updated = {**ref.get().to_dict(), "id": review_id}
    for field in ("createdAt", "updatedAt"):
        if isinstance(updated.get(field), datetime):
            updated[field] = updated[field].isoformat()

    return {"message": "Cập nhật đánh giá thành công", "review": updated}


@router.delete("/api/reviews/{review_id}")
def delete_review(
    review_id: str,
    product_id: str = Query(..., description="ID sản phẩm chứa review"),
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)
    ref = db.collection("products").document(product_id).collection("reviews").document(review_id)
    doc = ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
    if doc.to_dict().get("userId") != uid:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa đánh giá này")

    ref.delete()
    _recalculate_rating(product_id)
    return {"message": "Đã xóa đánh giá thành công"}
