"""
app/api/v1/routes/coupons.py

POST   /api/coupons/validate       — Kiểm tra mã giảm giá (user)
POST   /api/coupons/admin          — Tạo mã mới [Admin]
GET    /api/coupons/admin          — Danh sách mã [Admin]
PATCH  /api/coupons/admin/{code}   — Cập nhật mã [Admin]
DELETE /api/coupons/admin/{code}   — Vô hiệu hóa mã [Admin]
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.firebase import get_db
from app.core.security import get_uid, verify_admin_token, verify_token
from app.schemas import ValidateCouponRequest, CreateCouponRequest, UpdateCouponRequest

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])
db = get_db()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _calc_discount(coupon: dict, order_total: float) -> float:
    if coupon.get("discountPercent"):
        return round(order_total * coupon["discountPercent"] / 100)
    if coupon.get("discountAmount"):
        return min(float(coupon["discountAmount"]), order_total)
    return 0.0


def _serialize_coupon(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    if hasattr(d.get("createdAt"), "isoformat"):
        d["createdAt"] = d["createdAt"].isoformat()
    if hasattr(d.get("validUntil"), "isoformat"):
        d["validUntil"] = d["validUntil"].isoformat()
    return d


# ─── User endpoint ────────────────────────────────────────────────────────────

@router.post("/validate")
def validate_coupon(body: ValidateCouponRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    code = body.voucherCode.upper().strip()

    coupon_ref = db.collection("coupons").document(code)
    coupon_doc = coupon_ref.get()
    if not coupon_doc.exists:
        raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại")

    coupon = coupon_doc.to_dict()

    if not coupon.get("isActive", True):
        raise HTTPException(status_code=400, detail="Mã giảm giá đã bị vô hiệu hóa")

    if coupon.get("usedCount", 0) >= coupon.get("maxUses", 1):
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết lượt sử dụng")

    if coupon.get("validUntil"):
        expiry = coupon["validUntil"]
        # Hỗ trợ cả Firestore Timestamp và ISO string
        if hasattr(expiry, "isoformat"):
            expiry = expiry
        else:
            expiry = datetime.fromisoformat(str(expiry))
        if datetime.now() > expiry:
            raise HTTPException(status_code=400, detail="Mã giảm giá đã hết hạn")

    min_order = coupon.get("minOrder") or 0
    if body.orderTotal < min_order:
        raise HTTPException(
            status_code=400,
            detail=f"Đơn hàng tối thiểu {min_order:,.0f}đ để dùng mã này",
        )

    # Voucher từ đổi điểm chỉ đúng chủ dùng được
    if coupon.get("type") == "points_redeem" and coupon.get("userId") != uid:
        raise HTTPException(status_code=403, detail="Mã giảm giá này không thuộc về bạn")

    discount = _calc_discount(coupon, body.orderTotal)
    final_price = max(body.orderTotal - discount, 0)

    return {
        "valid": True,
        "voucherCode": code,
        "type": coupon.get("type", "general"),
        "discountAmount": discount,
        "discountPercent": coupon.get("discountPercent"),
        "finalPrice": final_price,
        "message": f"Áp dụng thành công! Giảm {discount:,.0f}đ",
    }


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@router.post("/admin", status_code=status.HTTP_201_CREATED)
def create_coupon(body: CreateCouponRequest, decoded_token: dict = Depends(verify_admin_token)):
    if not body.discountPercent and not body.discountAmount:
        raise HTTPException(status_code=400, detail="Phải có discountPercent hoặc discountAmount")

    code = body.code.upper().strip()
    ref = db.collection("coupons").document(code)
    if ref.get().exists:
        raise HTTPException(status_code=409, detail=f"Mã '{code}' đã tồn tại")

    data = {
        "code": code,
        "type": "general",
        "discountPercent": body.discountPercent,
        "discountAmount": body.discountAmount,
        "validUntil": body.validUntil,
        "maxUses": body.maxUses,
        "usedCount": 0,
        "minOrder": body.minOrder or 0,
        "isActive": True,
        "createdAt": datetime.now(),
    }
    ref.set(data)
    return {"message": f"Tạo mã '{code}' thành công", "coupon": data}


@router.get("/admin")
def list_coupons(
    limit: int = Query(50, le=200),
    active_only: bool = Query(False),
    decoded_token: dict = Depends(verify_admin_token),
):
    docs = (
        db.collection("coupons")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    coupons = []
    for doc in docs:
        d = _serialize_coupon(doc)
        if active_only and not d.get("isActive", True):
            continue
        coupons.append(d)

    return {"coupons": coupons, "total": len(coupons)}


@router.patch("/admin/{code}")
def update_coupon(
    code: str,
    body: UpdateCouponRequest,
    decoded_token: dict = Depends(verify_admin_token),
):
    code = code.upper().strip()
    ref = db.collection("coupons").document(code)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Mã '{code}' không tồn tại")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Không có trường nào được cập nhật")

    ref.update(updates)
    return {"message": f"Cập nhật mã '{code}' thành công", "coupon": ref.get().to_dict()}


@router.delete("/admin/{code}")
def delete_coupon(code: str, decoded_token: dict = Depends(verify_admin_token)):
    code = code.upper().strip()
    ref = db.collection("coupons").document(code)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Mã '{code}' không tồn tại")

    ref.update({"isActive": False})
    return {"message": f"Đã vô hiệu hóa mã '{code}'"}