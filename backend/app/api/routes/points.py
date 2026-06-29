"""
app/api/v1/routes/points.py

GET   /api/users/points          — Điểm, rank, lịch sử gần nhất
POST  /api/users/redeem-points   — Đổi điểm lấy voucher
GET   /api/users/points-history  — Toàn bộ lịch sử giao dịch
"""

from datetime import datetime
from typing import Optional
import random
import string

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.firebase import get_db
from app.core.security import get_uid, verify_token
from app.schemas import RedeemPointsRequest

router = APIRouter(prefix="/api/users", tags=["Points & Rewards"])
db = get_db()


# ─── Helpers ──────────────────────────────────────────────────────────────────

RANK_THRESHOLDS = {"Silver": 0, "Gold": 500, "Diamond": 2000}
POINTS_TO_VND = 1000  # 1 điểm = 1,000 VND


def compute_rank(points: int) -> str:
    if points >= RANK_THRESHOLDS["Diamond"]:
        return "Diamond"
    if points >= RANK_THRESHOLDS["Gold"]:
        return "Gold"
    return "Silver"


def points_to_next_rank(points: int) -> Optional[int]:
    if points < RANK_THRESHOLDS["Gold"]:
        return RANK_THRESHOLDS["Gold"] - points
    if points < RANK_THRESHOLDS["Diamond"]:
        return RANK_THRESHOLDS["Diamond"] - points
    return None


def generate_voucher_code() -> str:
    chars = string.ascii_uppercase + string.digits
    raw = "".join(random.choices(chars, k=10))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


def log_points_transaction(user_id: str, delta: int, reason: str, order_id: Optional[str] = None):
    db.collection("points_history").add({
        "userId": user_id,
        "delta": delta,
        "reason": reason,
        "orderId": order_id,
        "createdAt": datetime.now(),
    })


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/points")
def get_user_points(decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    user_data = user_doc.to_dict()
    points = user_data.get("points", 0)
    rank = compute_rank(points)

    history_docs = (
        db.collection("points_history")
        .where("userId", "==", uid)
        .order_by("createdAt", direction="DESCENDING")
        .limit(10)
        .stream()
    )
    history = []
    for doc in history_docs:
        d = doc.to_dict()
        if hasattr(d.get("createdAt"), "isoformat"):
            d["createdAt"] = d["createdAt"].isoformat()
        history.append(d)

    return {
        "points": points,
        "rank": rank,
        "pointsToNextRank": points_to_next_rank(points),
        "nextRank": "Gold" if rank == "Silver" else ("Diamond" if rank == "Gold" else None),
        "history": history,
    }


@router.post("/redeem-points")
def redeem_points(body: RedeemPointsRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    user_data = user_doc.to_dict()
    current_points = user_data.get("points", 0)

    if body.points_to_redeem > current_points:
        raise HTTPException(
            status_code=400,
            detail=f"Không đủ điểm. Bạn có {current_points} điểm, cần {body.points_to_redeem} điểm.",
        )

    discount_amount = body.points_to_redeem * POINTS_TO_VND
    voucher_code = generate_voucher_code()
    new_points = current_points - body.points_to_redeem
    new_rank = compute_rank(new_points)

    # Tạo voucher trong Firestore (tương thích với VOUCHERS trong config)
    db.collection("coupons").document(voucher_code).set({
        "code": voucher_code,
        "type": "points_redeem",
        "discountAmount": discount_amount,
        "discountPercent": None,
        "userId": uid,
        "isUsed": False,
        "maxUses": 1,
        "usedCount": 0,
        "minOrder": 0,
        "validUntil": None,
        "isActive": True,
        "createdAt": datetime.now(),
    })

    user_ref.update({"points": new_points, "rank": new_rank})

    log_points_transaction(
        user_id=uid,
        delta=-body.points_to_redeem,
        reason=f"Đổi {body.points_to_redeem} điểm lấy voucher {voucher_code}",
    )

    return {
        "message": "Đổi điểm thành công!",
        "voucherCode": voucher_code,
        "discountAmount": discount_amount,
        "remainingPoints": new_points,
        "rank": new_rank,
    }


@router.get("/points-history")
def get_points_history(
    limit: int = Query(20, le=100),
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)

    docs = (
        db.collection("points_history")
        .where("userId", "==", uid)
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )

    transactions = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if hasattr(d.get("createdAt"), "isoformat"):
            d["createdAt"] = d["createdAt"].isoformat()
        transactions.append(d)

    return {"transactions": transactions, "total": len(transactions)}