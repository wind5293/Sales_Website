"""
app/api/routes/cart.py

GET    /api/cart                     — Lấy giỏ hàng
POST   /api/cart                     — Thêm sản phẩm vào giỏ
PATCH  /api/cart/item/{id}           — Cập nhật số lượng
DELETE /api/cart/item/{id}           — Xóa item khỏi giỏ
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.firebase import get_db
from app.core.security import get_uid, verify_token
from app.schemas import AddToCartRequest, UpdateCartItemRequest

router = APIRouter(prefix="/api/cart", tags=["Cart"])
db = get_db()


@router.get("")
def get_cart(decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    docs = db.collection("carts").document(uid).collection("items").stream()

    items, total_price = [], 0
    for doc in docs:
        item = doc.to_dict()
        product_doc = db.collection("products").document(item["productId"]).get()
        if not product_doc.exists:
            continue
        product = product_doc.to_dict()
        price = product.get("price", 0)
        qty = item.get("quantity", 1)
        total_price += price * qty
        items.append({
            "cartItemId": doc.id,
            "productId": item["productId"],
            "productName": product.get("name", ""),
            "price": price,
            "thumbnailUrl": product.get("thumbnailUrl", ""),
            "stockQuantity": product.get("stockQuantity", 0),
            "status": product.get("status", "active"),
            "quantity": qty,
        })

    return {"items": items, "totalItems": len(items), "totalPrice": total_price}


@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_cart(body: AddToCartRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    product_doc = db.collection("products").document(body.productId).get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    product = product_doc.to_dict()
    if product.get("status") == "hidden":
        raise HTTPException(
            status_code=404, 
            detail="Sản phẩm không tồn tại"
        )
        
    if product.get("status") == "out_of_stock" or product.get("stockQuantity", 0) <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Sản phẩm đã hết hàng"
        )
        
    if body.quantity > product.get("stockQuantity", 0):
        raise HTTPException(
            status_code=400, 
            detail=f"Chỉ còn {product.get('stockQuantity')} sản phẩm trong kho"
        )

    items_ref = db.collection("carts").document(uid).collection("items")
    existing_docs = list(items_ref.where("productId", "==", body.productId).limit(1).stream())

    if existing_docs:
        current_qty = existing_docs[0].to_dict().get("quantity", 0)
        new_qty = current_qty + body.quantity
        if new_qty > product.get("stockQuantity", 0):
            raise HTTPException(
                status_code=400, 
                detail=f"Tổng số lượng vượt quá tồn kho ({
                    product.get('stockQuantity')
                })")
            
        existing_docs[0].reference.update({
            "quantity": new_qty, 
            "updatedAt": datetime.now()
            })
        
        return {
            "message": "Đã cập nhật số lượng trong giỏ hàng", 
            "quantity": new_qty
        }

    items_ref.add({
        "productId": body.productId,
        "quantity": body.quantity,
        "addedAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    })
    return {"message": "Đã thêm vào giỏ hàng"}


@router.patch("/item/{cart_item_id}")
def update_cart_item(
    cart_item_id: str,
    body: UpdateCartItemRequest,
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)
    item_ref = db.collection("carts").document(uid).collection("items").document(cart_item_id)
    
    if not item_ref.get().exists:
        raise HTTPException(
            status_code=404, 
            detail="Sản phẩm không có trong giỏ hàng"
        )

    item_ref.update({
        "quantity": body.quantity, 
        "updatedAt": datetime.now(timezone.utc)
    })
    return {"message": "Đã cập nhật số lượng"}


@router.delete("/item/{cart_item_id}")
def remove_from_cart(cart_item_id: str, decoded_token: dict = Depends(verify_token)):
    
    uid = get_uid(decoded_token)
    item_ref = db.collection("carts").document(uid).collection("items").document(cart_item_id)
    
    if not item_ref.get().exists:
        raise HTTPException(
            status_code=404, 
            detail="Sản phẩm không có trong giỏ hàng"
        )

    item_ref.delete()
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng"}
