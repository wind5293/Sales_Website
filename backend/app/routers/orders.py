from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime
from app.models.schemas import CreateOrderRequest, UpdateOrderStatusRequest
from app.services.firebase import get_db
from fastapi.security import HTTPBearer
from google.cloud import firestore
from app.routers.auth import verify_token

security = HTTPBearer()
 
router = APIRouter(prefix="/api/orders", tags=["Orders"])
db = get_db()

@router.get("")
def get_my_orders(
    decoded_token: dict = Depends(verify_token),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Lấy danh sách đơn hàng của user hiện tại.
    - status: pending | confirmed | shipped | delivered | cancelled
    """
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
 
    query = db.collection("orders").where("userId", "==", user_id)
    if status:
        query = query.where("status", "==", status)
 
    raw_docs = list(query.stream())
    raw_docs.sort(
        key=lambda d: d.to_dict().get("createdAt") or datetime.min,
        reverse=True,
    )
    total = len(raw_docs)
    paged_docs = raw_docs[skip: skip + limit]
 
    orders = []
    for doc in paged_docs:
        o = doc.to_dict()
        o["id"] = doc.id
        if hasattr(o.get("createdAt"), "isoformat"):
            o["createdAt"] = o["createdAt"].isoformat()
        if hasattr(o.get("updatedAt"), "isoformat"):
            o["updatedAt"] = o["updatedAt"].isoformat()
        orders.append(o)
 
    return {"orders": orders, "total": total}

@router.get("/{order_id}")
def get_order_detail(
    order_id: str, 
    decoded_token: dict = Depends(verify_token),
):
    """Lấy chi tiết một đơn hàng. User chỉ được xem đơn của mình."""
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
 
    doc = db.collection("orders").document(order_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
 
    order = doc.to_dict()
    order["id"] = doc.id
 
    # Bảo vệ: user không được xem đơn của người khác
    if order.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập đơn hàng này")
 
    if hasattr(order.get("createdAt"), "isoformat"):
        order["createdAt"] = order["createdAt"].isoformat()
    if hasattr(order.get("updatedAt"), "isoformat"):
        order["updatedAt"] = order["updatedAt"].isoformat()
 
    return order

@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderRequest, 
    decoded_token: dict = Depends(verify_token),
):
    """
    Tạo đơn hàng từ giỏ hàng hiện tại.
    Flow:
      1. Lấy giỏ hàng của user
      2. Kiểm tra tồn kho từng sản phẩm
      3. TÍnh phí ship + voucher
      4. Tạo đơn hàng + snapshot sản phẩm tại thời điểm mua
      5. Trừ tồn kho (dùng Firestore transaction để an toàn)
      6. Xóa giỏ hàng
    """
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
 
    # ── 1. Lấy giỏ hàng ──────────────────────────────────────────────────
    cart_items_ref = db.collection("carts").document(user_id).collection("items").stream()
    cart_items = [{"id": doc.id, **doc.to_dict()} for doc in cart_items_ref]
 
    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")
 
    # ── 2. Kiểm tra tồn kho & snapshot sản phẩm ──────────────────────────
    order_items = []
    total_price = 0.0
 
    for item in cart_items:
        product_doc = db.collection("products").document(item["productId"]).get()
        if not product_doc.exists:
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm {item['productId']} không còn tồn tại"
            )
 
        product = product_doc.to_dict()
 
        if product.get("status") in ("out_of_stock", "hidden"):
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{product.get('name')}' hiện không còn bán"
            )
 
        if item["quantity"] > product.get("stockQuantity", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{product.get('name')}' chỉ còn {product.get('stockQuantity')} cái"
            )
 
        subtotal = product["price"] * item["quantity"]
        total_price += subtotal
 
        # Snapshot thông tin sản phẩm tại thời điểm mua
        order_items.append({
            "productId": item["productId"],
            "productName": product.get("name"),
            "sku": product.get("sku"),
            "thumbnailUrl": product.get("thumbnailUrl"),
            "price": product["price"],
            "quantity": item["quantity"],
            "subtotal": subtotal,
        })
        
    # ── 3. Tính phí ship + voucher ────────────────────────────────────────
    SHIPPING_PRICES = {
        "fast": 30000,
        "standard": 15000,
        "express": 60000,
    }
    shipping_fee = SHIPPING_PRICES.get(body.shippingMethod or "fast", 30000)
 
    # Voucher — tính giảm giá nếu có
    # Hiện tại validate đơn giản phía backend, sau này có thể lưu vào collection "vouchers"
    VOUCHERS = {
        "GIAM50K":  {"discount": 50000,  "percent": None, "minOrder": 500000},
        "FREESHIP": {"discount": 30000,  "percent": None, "minOrder": 200000},
        "SALE10":   {"discount": None,   "percent": 10,   "minOrder": 300000},
    }
    discount_amount = 0
    voucher_info = None
 
    if body.voucherCode:
        voucher = VOUCHERS.get(body.voucherCode.upper())
        if voucher and total_price >= voucher["minOrder"]:
            if voucher["percent"]:
                discount_amount = round(total_price * voucher["percent"] / 100)
            else:
                discount_amount = voucher["discount"]
            voucher_info = body.voucherCode.upper()
 
    final_total = round(total_price + shipping_fee - discount_amount, 2)
 
    # ── 3. Tạo đơn hàng ──────────────────────────────────────────────────
    order_data = {
        "userId": user_id,
        "items": order_items,
 
        # Thông tin người nhận
        "recipientName": body.name or "",
        "shippingAddress": body.shippingAddress,
        "phone": body.phone,
        "note": body.note or "",
 
        # Giá
        "itemsTotal": round(total_price, 2),
        "shippingFee": shipping_fee,
        "discountAmount": discount_amount,
        "voucherCode": voucher_info,
        "totalPrice": final_total,
 
        # Vận chuyển & thanh toán
        "shippingMethod": body.shippingMethod or "fast",
        "paymentMethod": body.paymentMethod or "cod",
 
        # Trạng thái
        "status": "pending",        # pending → confirmed → shipped → delivered | cancelled
        "paymentStatus": "unpaid",  # unpaid | paid | refunded
 
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    }
 
    order_ref = db.collection("orders").add(order_data)
    order_id = order_ref[1].id
 
    # ── 5. Trừ tồn kho ────────────────────────────────────────────────────
    # Dùng Firestore transaction để tránh race condition khi nhiều user cùng mua
    transaction = db.transaction()
 
    @firestore.transactional
    def _decrement_stock(transaction, items):
        refs_and_snaps = []
        for item in items:
            product_ref = db.collection("products").document(item["productId"])
            product_snap = product_ref.get(transaction=transaction)  # chỉ đọc
            refs_and_snaps.append((product_ref, product_snap, item))
            
        for product_ref, product_snap, item in refs_and_snaps:
            if not product_snap.exists:
                raise Exception(f"Sản phẩm {item['productId']} không tồn tại")
 
            current_stock = product_snap.to_dict().get("stockQuantity", 0)
            new_stock = max(0, current_stock - item["quantity"])
 
            updates = {"stockQuantity": new_stock, "updatedAt": datetime.now()}
            if new_stock <= 0:
                updates["status"] = "out_of_stock"
 
            transaction.update(product_ref, updates) 
 
    try:
        _decrement_stock(transaction, order_items)
    except Exception as e:
        # Rollback: xóa đơn hàng vừa tạo nếu trừ kho thất bại
        db.collection("orders").document(order_id).delete()
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật tồn kho: {str(e)}")
 
    # ── 6. Xóa giỏ hàng ──────────────────────────────────────────────────
    for item in cart_items:
        db.collection("carts").document(user_id).collection("items").document(item["id"]).delete()
 
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
def cancel_order(
    order_id: str, 
    decoded_token: dict = Depends(verify_token),
):
    """
    User tự huỷ đơn hàng.
    Chỉ huỷ được khi đơn còn ở trạng thái 'pending'.
    Tự động hoàn lại tồn kho.
    """
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
 
    doc_ref = db.collection("orders").document(order_id)
    doc = doc_ref.get()
 
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
 
    order = doc.to_dict()
 
    if order.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền huỷ đơn hàng này")
 
    if order.get("status") != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Không thể huỷ đơn ở trạng thái '{order.get('status')}'"
        )
 
    # Hoàn lại tồn kho
    for item in order.get("items", []):
        product_ref = db.collection("products").document(item["productId"])
        product_snap = product_ref.get()
        if product_snap.exists:
            current_stock = product_snap.to_dict().get("stockQuantity", 0)
            new_stock = current_stock + item["quantity"]
            product_ref.update({
                "stockQuantity": new_stock,
                "status": "active",
                "updatedAt": datetime.now(),
            })
 
    doc_ref.update({
        "status": "cancelled",
        "updatedAt": datetime.now(),
    })
 
    return {"message": "Đã huỷ đơn hàng"}

# ── Admin endpoints ────────────────────────────────────────────────────────────
# Lưu ý: nên thêm middleware kiểm tra quyền admin trước khi dùng production
 
@router.get("/admin/all")
def admin_get_all_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """[Admin] Lấy tất cả đơn hàng, có thể lọc theo status"""
    query = db.collection("orders")
    if status:
        query = query.where("status", "==", status)
 
    docs = query.order_by("createdAt", direction="DESCENDING").limit(limit).stream()
 
    orders = []
    for doc in docs:
        o = doc.to_dict()
        o["id"] = doc.id
        if hasattr(o.get("createdAt"), "isoformat"):
            o["createdAt"] = o["createdAt"].isoformat()
        if hasattr(o.get("updatedAt"), "isoformat"):
            o["updatedAt"] = o["updatedAt"].isoformat()
        orders.append(o)
 
    return {"orders": orders, "total": len(orders)}
 
 
@router.patch("/admin/{order_id}/status")
def admin_update_order_status(order_id: str, body: UpdateOrderStatusRequest):
    """[Admin] Cập nhật trạng thái đơn hàng"""
    valid_statuses = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Trạng thái không hợp lệ. Chọn một trong: {', '.join(valid_statuses)}"
        )
 
    doc_ref = db.collection("orders").document(order_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
 
    updates = {"status": body.status, "updatedAt": datetime.now()}
 
    # Khi admin xác nhận đã thanh toán
    if body.status == "delivered":
        updates["paymentStatus"] = "paid"
 
    doc_ref.update(updates)
    return {"message": f"Đã cập nhật trạng thái thành '{body.status}'"}