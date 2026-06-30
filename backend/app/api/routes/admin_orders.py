"""
app/api/routes/admin_orders.py

GET    /api/admin/orders                 — Danh sách đơn hàng (phân trang + lọc)
PATCH  /api/admin/orders/{order_id}      — Cập nhật đơn hàng (status, tracking, notes)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.firebase import get_db
from app.core.security import verify_admin_token
from app.core.inventory import restock_order_items

router = APIRouter(prefix="/api/admin", tags=["Admin - Orders"])
db = get_db()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UpdateOrderRequest(BaseModel):
    status: Optional[str] = None          # pending | confirmed | shipping | delivered | cancelled
    paymentStatus: Optional[str] = None   # unpaid | paid | refunded
    tracking_number: Optional[str] = None
    admin_notes: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

VALID_STATUSES = {"pending", "confirmed", "shipping", "delivered", "cancelled"}
VALID_PAYMENT_STATUSES = {"unpaid", "paid", "refunded"}

def _serialize(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id

    for field in ("createdAt", "updatedAt"):
        if d.get(field) and hasattr(d[field], "isoformat"):
            d[field] = d[field].isoformat()

    # userId đang lưu JWT token → che bớt cho gọn, chỉ giữ lại 20 ký tự đầu
    if d.get("userId") and len(d["userId"]) > 50:
        d["userId"] = d["userId"][:20] + "...[token]"

    # Đảm bảo items luôn là list
    if not isinstance(d.get("items"), list):
        d["items"] = []

    return d


def _get_or_404(order_id: str):
    ref = db.collection("orders").document(order_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return ref


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/orders", summary="Danh sách đơn hàng (phân trang + lọc)")
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    # Lọc theo trạng thái
    status: Optional[str] = Query(None, description="pending | confirmed | shipping | delivered | cancelled"),
    paymentStatus: Optional[str] = Query(None, description="unpaid | paid | refunded"),
    paymentMethod: Optional[str] = Query(None, description="cod | banking | ..."),
    # Lọc theo ngày — Python-side vì Firestore cần composite index khi kết hợp với order_by
    date_from: Optional[str] = Query(None, description="ISO date: 2026-06-01"),
    date_to: Optional[str] = Query(None, description="ISO date: 2026-06-30"),
    # Tìm kiếm
    q: Optional[str] = Query(None, description="Tìm theo tên người nhận hoặc SĐT"),
    admin: dict = Depends(verify_admin_token),
):
    query = db.collection("orders").order_by("createdAt", direction="DESCENDING")

    # Firestore-side filters (equality)
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(400, detail=f"status không hợp lệ. Chọn một trong: {VALID_STATUSES}")
        query = query.where("status", "==", status)

    if paymentStatus:
        if paymentStatus not in VALID_PAYMENT_STATUSES:
            raise HTTPException(400, detail=f"paymentStatus không hợp lệ. Chọn một trong: {VALID_PAYMENT_STATUSES}")
        query = query.where("paymentStatus", "==", paymentStatus)

    if paymentMethod:
        query = query.where("paymentMethod", "==", paymentMethod)

    all_docs = [_serialize(doc) for doc in query.stream()]

    # Python-side filters
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            all_docs = [d for d in all_docs if d.get("createdAt") and d["createdAt"] >= dt_from.isoformat()]
        except ValueError:
            raise HTTPException(400, detail="date_from không hợp lệ, dùng định dạng YYYY-MM-DD")

    if date_to:
        try:
            # date_to bao gồm cả ngày cuối → set đến 23:59:59
            dt_to = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            all_docs = [d for d in all_docs if d.get("createdAt") and d["createdAt"] <= dt_to.isoformat()]
        except ValueError:
            raise HTTPException(400, detail="date_to không hợp lệ, dùng định dạng YYYY-MM-DD")

    if q:
        q_lower = q.strip().lower()
        all_docs = [
            d for d in all_docs
            if q_lower in (d.get("recipientName") or "").lower()
            or q_lower in (d.get("phone") or "").lower()
        ]

    total = len(all_docs)

    # Tính tổng doanh thu của kết quả lọc (hữu ích cho dashboard)
    revenue = sum(d.get("totalPrice") or 0 for d in all_docs)

    return {
        "orders": all_docs[skip: skip + limit],
        "total": total,
        "revenue": revenue,
        "page": skip // limit,
        "pages": -(-total // limit),
    }


@router.patch("/orders/{order_id}", summary="Cập nhật đơn hàng")
def update_order(
    order_id: str,
    body: UpdateOrderRequest,
    admin: dict = Depends(verify_admin_token),
):
    ref = _get_or_404(order_id)
    current = ref.get().to_dict()

    updates: dict = {"updatedAt": datetime.now()}

    # Validate + set status
    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(400, detail=f"status không hợp lệ. Chọn một trong: {VALID_STATUSES}")

        # Không cho phép quay lại trạng thái trước (tuỳ logic nghiệp vụ)
        FLOW = ["pending", "confirmed", "shipping", "delivered"]
        current_status = current.get("status", "pending")
        if (
            current_status in FLOW
            and body.status in FLOW
            and FLOW.index(body.status) < FLOW.index(current_status)
            and body.status != "cancelled"
        ):
            raise HTTPException(
                400,
                detail=f"Không thể chuyển ngược từ '{current_status}' về '{body.status}'"
            )

        updates["status"] = body.status

        # Tự động cập nhật paymentStatus khi delivered + COD
        if body.status == "delivered" and current.get("paymentMethod") == "cod":
            updates.setdefault("paymentStatus", "paid")
            
        if body.status == "cancelled" and current_status not in ("cancelled", "delivered"):
            restock_order_items(db, current.get("items", []))

    if body.paymentStatus is not None:
        if body.paymentStatus not in VALID_PAYMENT_STATUSES:
            raise HTTPException(400, detail=f"paymentStatus không hợp lệ. Chọn một trong: {VALID_PAYMENT_STATUSES}")
        updates["paymentStatus"] = body.paymentStatus

    if body.tracking_number is not None:
        updates["trackingNumber"] = body.tracking_number.strip()

    if body.admin_notes is not None:
        updates["adminNotes"] = body.admin_notes.strip()

    if len(updates) == 1:  # chỉ có updatedAt → không có gì thay đổi
        raise HTTPException(400, detail="Không có trường nào được cập nhật")

    ref.update(updates)

    return {
        "message": "Cập nhật đơn hàng thành công",
        "order": _serialize(ref.get()),
    }