"""
app/api/v1/routes/orders.py

GET    /api/orders               — Đơn hàng của user
GET    /api/orders/{id}          — Chi tiết đơn hàng
POST   /api/orders               — Tạo đơn hàng từ giỏ
PATCH  /api/orders/{id}/cancel   — User hủy đơn

GET    /api/orders/admin/all               — [Admin] Toàn bộ đơn hàng
PATCH  /api/orders/admin/{id}/status       — [Admin] Cập nhật trạng thái
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud import firestore

from app.core.config import SHIPPING_PRICES, VOUCHERS
from app.core.firebase import get_db
from app.core.security import get_uid, verify_admin_token, verify_token
from app.schemas import CreateOrderRequest, UpdateOrderStatusRequest

router = APIRouter(prefix="/api/orders", tags=["Orders"])
db = get_db()


def _serialize_order(doc) -> dict:
    o = doc.to_dict()
    o["id"] = doc.id
    for field in ("createdAt", "updatedAt"):
        if hasattr(o.get(field), "isoformat"):
            o[field] = o[field].isoformat()
    return o


# ─── User routes ──────────────────────────────────────────────────────────────

@router.get("")
def get_my_orders(
    decoded_token: dict = Depends(verify_token),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    uid = get_uid(decoded_token)
    query = db.collection("orders").where("userId", "==", uid)
    if status:
        query = query.where("status", "==", status)

    raw = sorted(
        list(query.stream()),
        key=lambda d: d.to_dict().get("createdAt") or datetime.min,
        reverse=True,
    )
    return {
        "orders": [_serialize_order(d) for d in raw[skip: skip + limit]],
        "total": len(raw),
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
        voucher = VOUCHERS.get(body.voucherCode.upper())
        if voucher and total_price >= voucher["minOrder"]:
            discount_amount = (
                round(total_price * voucher["percent"] / 100)
                if voucher["percent"]
                else voucher["discount"]
            )
            voucher_info = body.voucherCode.upper()

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
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật tồn kho: {str(e)}")

    # 6. Xóa giỏ hàng
    for item in cart_items:
        db.collection("carts").document(uid).collection("items").document(item["id"]).delete()

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
    for item in order.get("items", []):
        product_ref = db.collection("products").document(item["productId"])
        snap = product_ref.get()
        if snap.exists:
            new_stock = snap.to_dict().get("stockQuantity", 0) + item["quantity"]
            product_ref.update({"stockQuantity": new_stock, "status": "active", "updatedAt": datetime.now()})

    ref.update({"status": "cancelled", "updatedAt": datetime.now()})
    return {"message": "Đã huỷ đơn hàng"}


# ─── Admin routes ─────────────────────────────────────────────────────────────

@router.get("/admin/all", tags=["Admin - Orders"])
def admin_get_all_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    admin: dict = Depends(verify_admin_token),  # ← đã thêm auth
):
    query = db.collection("orders")
    if status:
        query = query.where("status", "==", status)
    docs = query.order_by("createdAt", direction="DESCENDING").limit(limit).stream()
    orders = [_serialize_order(doc) for doc in docs]
    return {"orders": orders, "total": len(orders)}


@router.patch("/admin/{order_id}/status", tags=["Admin - Orders"])
def admin_update_order_status(
    order_id: str,
    body: UpdateOrderStatusRequest,
    admin: dict = Depends(verify_admin_token),  # ← đã thêm auth
):
    valid = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ. Chọn một trong: {', '.join(valid)}")

    ref = db.collection("orders").document(order_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")

    updates = {"status": body.status, "updatedAt": datetime.now()}
    if body.status == "delivered":
        updates["paymentStatus"] = "paid"

    ref.update(updates)
    return {"message": f"Đã cập nhật trạng thái thành '{body.status}'"}
