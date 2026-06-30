"""
app/routers/admin/admin_users.py

Endpoints:
  GET    /api/admin/users              — Danh sách người dùng (phân trang)
  PATCH  /api/admin/users/{user_id}    — Cập nhật is_banned / rank / points
  DELETE /api/admin/users/{user_id}    — Xóa tài khoản người dùng
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.constants import VALID_RANKS
from app.core.security import verify_admin_token, require_permission
from app.core.firebase import get_db

router = APIRouter(prefix="/api/admin", tags=["Admin - Users"])

def get_firestore_db():
    return get_db()

# ─── Schemas ─────────────────────────────────────────────────────────────────

class UpdateUserRequest(BaseModel):
    is_banned: Optional[bool] = None
    rank: Optional[str] = None
    points: Optional[int] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_user(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    data.pop("password_hash", None)
    data.pop("password", None)
    for field in ("createdAt", "updatedAt", "lastLoginAt"):
        if isinstance(data.get(field), datetime):
            data[field] = data[field].isoformat()
    return data


# ─── GET /api/admin/users ────────────────────────────────────────────────────

@router.get("/users", summary="Danh sách người dùng (phân trang)")
def list_users(
    skip: int = 0,
    limit: int = 20,
    admin: dict = Depends(verify_admin_token),
    db=Depends(get_firestore_db),  # FIX 7
):
    query = (
        db.collection("users")
    )

    # Đếm tổng số document (tách riêng để không ảnh hưởng phân trang)
    total = len(list(query.select([]).stream()))  # select([]) chỉ lấy metadata, nhẹ hơn

    paged_docs = list(query.offset(skip).limit(limit).stream())
    users = [_serialize_user(doc) for doc in paged_docs]

    return {"users": users, "total": total}


# ─── PATCH /api/admin/users/{user_id} ────────────────────────────────────────

@router.patch("/users/{user_id}", summary="Cập nhật người dùng (ban, rank, điểm)")
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    admin: dict = Depends(verify_admin_token),
    db=Depends(get_firestore_db),  # FIX 7
):
    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if body.rank is not None and body.rank not in VALID_RANKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hạng không hợp lệ. Chấp nhận: {', '.join(sorted(VALID_RANKS))}",
        )

    if body.points is not None and body.points < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Điểm tích lũy không được âm",
        )

    updates: dict = {"updatedAt": datetime.now()}
    if body.is_banned is not None:
        updates["is_banned"] = body.is_banned
    if body.rank is not None:
        updates["rank"] = body.rank
    if body.points is not None:
        updates["points"] = body.points

    user_ref.update(updates)
    updated = _serialize_user(user_ref.get())
    return {"message": "Cập nhật người dùng thành công", "user": updated}


# ─── DELETE /api/admin/users/{user_id} ───────────────────────────────────────

@router.delete("/users/{user_id}", summary="Xóa tài khoản người dùng")
def delete_user(
    user_id: str,
    admin: dict = Depends(require_permission("delete_users")),
    db=Depends(get_firestore_db),  # FIX 7
):
    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    for sub in ("addresses", "cart"):
        for doc in user_ref.collection(sub).stream():
            doc.reference.delete()

    orders_query = db.collection("orders").where("userId", "==", user_id).stream()
    for order_doc in orders_query:
        # Xóa sub-collections của order nếu có (ví dụ: items)
        for sub in ("items",):
            for item_doc in order_doc.reference.collection(sub).stream():
                item_doc.reference.delete()
        order_doc.reference.delete()

    user_ref.delete()
    return {"message": "Đã xóa tài khoản người dùng thành công"}