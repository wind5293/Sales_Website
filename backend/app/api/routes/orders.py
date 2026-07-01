"""
app/api/routes/orders.py

GET    /api/orders               — Đơn hàng của user
GET    /api/orders/{id}          — Chi tiết đơn hàng
POST   /api/orders               — Tạo đơn hàng từ giỏ
PATCH  /api/orders/{id}/cancel   — User hủy đơn

GET    /api/orders/admin/all               — [Admin] Toàn bộ đơn hàng
PATCH  /api/orders/admin/{id}/status       — [Admin] Cập nhật trạng thái
"""

import logging

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud import firestore
from firebase_admin import firestore

from app.api.routes.points import compute_rank, log_points_transaction
from app.core.config import SHIPPING_PRICES, VOUCHERS
from app.core.firebase import get_db
from app.core.security import get_uid, verify_admin_token, verify_token
from app.schemas import CreateOrderRequest, UpdateOrderStatusRequest
from app.core.inventory import restock_order_items

router = APIRouter(prefix="/api/orders", tags=["Orders"])
db = get_db()
logger = logging.getLogger(__name__)

def _serialize_order(doc) -> dict:
    o = doc.to_dict()
    o["id"] = doc.id
    for field in ("createdAt", "updatedAt"):
        if hasattr(o.get(field), "isoformat"):
            o[field] = o[field].isoformat()
    return o


def _release_voucher(code: str):
    ref = db.collection("coupons").document(code.upper().strip())
    transaction = db.transaction()

    @firestore.transactional
    def _release(transaction, ref):
        snap = ref.get(transaction=transaction)
        if not snap.exists:
            return
        c = snap.to_dict()
        new_used = max(0, c.get("usedCount", 0) - 1)
        transaction.update(ref, {"usedCount": new_used})

    try:
        _release(transaction, ref)
    except Exception:
        logger.exception(f"Không thể hoàn lại voucher {code} sau khi đơn hàng tạo thất bại")


def apply_voucher_with_firestore(
    db,
    voucher_code: str,
    order_total: float,
    uid: str,
) -> tuple[float, str | None]:
    """
    Tính discount_amount từ voucher code.
    Ưu tiên: Firestore coupons → VOUCHERS config (hardcode).
    Trả về (discount_amount, voucher_code_applied | None).
    """
 
    code = voucher_code.upper().strip()
    discount_amount = 0
    voucher_info = None
 
    # Thử Firestore trước (coupons từ admin + points redeem)
    coupon_doc = db.collection("coupons").document(code).get()
    if coupon_doc.exists:
        coupon = coupon_doc.to_dict()
 
        is_valid = (
            coupon.get("isActive", True)
            and coupon.get("usedCount", 0) < coupon.get("maxUses", 1)
            and order_total >= (coupon.get("minOrder") or 0)
            and (
                coupon.get("type") != "points_redeem"
                or coupon.get("userId") == uid
            )
        )
 
        if coupon.get("validUntil"):
            expiry = coupon["validUntil"]
            if not hasattr(expiry, "timestamp"):
                expiry = datetime.fromisoformat(str(expiry))
            if datetime.now() > expiry:
                is_valid = False
 
        if is_valid:
            if coupon.get("discountPercent"):
                discount_amount = round(order_total * coupon["discountPercent"] / 100)
            elif coupon.get("discountAmount"):
                discount_amount = min(float(coupon["discountAmount"]), order_total)
            voucher_info = code

            coupon_ref = db.collection("coupons").document(code)
            transaction = db.transaction()

            @firestore.transactional
            def _consume_coupon(transaction, ref):
                snap = ref.get(transaction=transaction)
                c = snap.to_dict()
                if (
                    not c.get("isActive", True)
                    or c.get("usedCount", 0) >= c.get("maxUses", 1)
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Mã giảm giá đã hết lượt sử dụng",
                    )
                transaction.update(ref, {"usedCount": c.get("usedCount", 0) + 1})

            _consume_coupon(transaction, coupon_ref)
            return discount_amount, voucher_info
 
    # Fallback: VOUCHERS hardcode trong config
    voucher = VOUCHERS.get(code)
    if voucher and order_total >= voucher["minOrder"]:
        discount_amount = (
            round(order_total * voucher["percent"] / 100)
            if voucher.get("percent")
            else voucher.get("discount", 0)
        )
        voucher_info = code
 
    return discount_amount, voucher_info


# ─── User routes ──────────────────────────────────────────────────────────────

@router.get("")
def get_my_orders(
    decoded_token: dict = Depends(verify_token),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    uid = get_uid(decoded_token)
    query = (
        db.collection("orders")
        .where("userId", "==", uid)
        .order_by("createdAt", direction="DESCENDING")
    )
    if status:
        query = query.where("status", "==", status)

    total_docs = list(query.stream())
    total = len(total_docs)

    paginated = list(query.offset(skip).limit(limit).stream())

    return {
        "orders": [_serialize_order(d) for d in paginated],
        "total": total,
    }


@router.get("/{order_id}")
def get_order_detail(order_id: str, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    doc = db.collection("orders").document(order_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")

    order = _serialize_order(doc)
    if order.get("userId") != uid:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập đơn hàng này")
    return order


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(body: CreateOrderRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    # 1. Lấy giỏ hàng
    cart_docs = db.collection("carts").document(uid).collection("items").stream()
    cart_items = [{"id": doc.id, **doc.to_dict()} for doc in cart_docs]
    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    # 2. Kiểm tra tồn kho & snapshot sản phẩm
    order_items, total_price = [], 0.0
    for item in cart_items:
        product_doc = db.collection("products").document(item["productId"]).get()
        if not product_doc.exists:
            raise HTTPException(status_code=400, detail=f"Sản phẩm {item['productId']} không còn tồn tại")

        product = product_doc.to_dict()
        if product.get("status") in ("out_of_stock", "hidden"):
            raise HTTPException(status_code=400, detail=f"Sản phẩm '{product.get('name')}' hiện không còn bán")
        if item["quantity"] > product.get("stockQuantity", 0):
            raise HTTPException(status_code=400, detail=f"Sản phẩm '{product.get('name')}' chỉ còn {product.get('stockQuantity')} cái")

        subtotal = product["price"] * item["quantity"]
        total_price += subtotal
        order_items.append({
            "productId": item["productId"],
            "productName": product.get("name"),
            "sku": product.get("sku"),
            "thumbnailUrl": product.get("thumbnailUrl"),
            "price": product["price"],
            "quantity": item["quantity"],
            "subtotal": subtotal,
        })

    # 3. Tính phí ship + voucher
    shipping_fee = SHIPPING_PRICES.get(body.shippingMethod or "fast", 30000)
    discount_amount, voucher_info = 0, None
    if body.voucherCode:
        discount_amount, voucher_info = apply_voucher_with_firestore(
            db, body.voucherCode, total_price, uid
        )

    final_total = round(total_price + shipping_fee - discount_amount, 2)

    # 4. Tạo đơn hàng
    now = datetime.now()
    order_data = {
        "userId": uid,
        "items": order_items,
        "recipientName": body.name or "",
        "shippingAddress": body.shippingAddress,
        "phone": body.phone,
        "note": body.note or "",
        "itemsTotal": round(total_price, 2),
        "shippingFee": shipping_fee,
        "discountAmount": discount_amount,
        "voucherCode": voucher_info,
        "totalPrice": final_total,
        "shippingMethod": body.shippingMethod or "fast",
        "paymentMethod": body.paymentMethod or "cod",
        "status": "pending",
        "paymentStatus": "unpaid",
        "createdAt": now,
        "updatedAt": now,
    }
    order_ref = db.collection("orders").add(order_data)
    order_id = order_ref[1].id

    # 5. Trừ tồn kho (Firestore transaction)
    transaction = db.transaction()

    @firestore.transactional
    def _decrement_stock(transaction, items):
        refs_snaps = [
            (db.collection("products").document(i["productId"]),
             db.collection("products").document(i["productId"]).get(transaction=transaction),
             i)
            for i in items
        ]
        for ref, snap, item in refs_snaps:
            if not snap.exists:
                raise Exception(f"Sản phẩm {item['productId']} không tồn tại")
            new_stock = max(0, snap.to_dict().get("stockQuantity", 0) - item["quantity"])
            updates = {"stockQuantity": new_stock, "updatedAt": datetime.now()}
            if new_stock <= 0:
                updates["status"] = "out_of_stock"
            transaction.update(ref, updates)

    try:
        _decrement_stock(transaction, order_items)
    except Exception as e:
        db.collection("orders").document(order_id).delete()
        if voucher_info:
            _release_voucher(voucher_info)
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật tồn kho: {str(e)}")

    # 6. Xóa giỏ hàng
    for item in cart_items:
        db.collection("carts").document(uid).collection("items").document(item["id"]).delete()
        
    # 7. Tích điểm
    points_earned = int(final_total // 100_000)
    if points_earned > 0:
        user_ref = db.collection("users").document(uid)
        transaction = db.transaction()

        @firestore.transactional
        def _add_points(transaction, ref):
            snap = ref.get(transaction=transaction)
            if not snap.exists:
                return None
            user_data = snap.to_dict()
            new_points = user_data.get("points", 0) + points_earned
            new_rank = compute_rank(new_points)
            transaction.update(ref, {"points": new_points, "rank": new_rank})
            return new_points, new_rank

        result = _add_points(transaction, user_ref)
        if result is not None:
            log_points_transaction(
                user_id=uid,
                delta=points_earned,
                reason=f"Tích điểm từ đơn hàng {order_id}",
                order_id=order_id,
            )

    return {
        "message": "Đặt hàng thành công",
        "orderId": order_id,
        "itemsTotal": round(total_price, 2),
        "shippingFee": shipping_fee,
        "discountAmount": discount_amount,
        "totalPrice": final_total,
        "status": "pending",
        "shippingMethod": body.shippingMethod,
        "paymentMethod": body.paymentMethod,
        "pointsEarned": points_earned,
    }


@router.patch("/{order_id}/cancel")
def cancel_order(order_id: str, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    ref = db.collection("orders").document(order_id)
    doc = ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")

    order = doc.to_dict()
    if order.get("userId") != uid:
        raise HTTPException(status_code=403, detail="Không có quyền huỷ đơn hàng này")
    if order.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Không thể huỷ đơn ở trạng thái '{order.get('status')}'")

    # Hoàn lại tồn kho
    restock_order_items(db, order.get("items", []))

    ref.update({"status": "cancelled", "updatedAt": datetime.now()})
    return {"message": "Đã huỷ đơn hàng"}
