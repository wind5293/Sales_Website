from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.models.schemas import AddToCartRequest, UpdateCartItemRequest, RemoveFromCartRequest
from app.services.firebase import get_db
from fastapi.security import HTTPBearer
from app.routers.auth import verify_token

security = HTTPBearer()


router = APIRouter(prefix="/api/cart", tags=["Cart"])
db = get_db()

@router.get("")
def get_cart(decoded_token: dict = Depends(verify_token)):
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    items_ref = db.collection("carts").document(user_id).collection("items")
    docs = items_ref.stream()

    cart_items = []
    total_price = 0
    
    for doc in docs:
        item = doc.to_dict()
        product_doc = db.collection("products").document(item["productId"]).get()
        if not product_doc.exists:
            continue

        product = product_doc.to_dict()
        price = product.get("price", 0)
        quantity = item.get("quantity", 1)
        total_price += price * quantity

        cart_items.append({
            "cartItemId": doc.id,                                   
            "productId": item["productId"],
            "productName": product.get("name", ""),
            "price": price,
            "thumbnailUrl": product.get("thumbnailUrl", ""),
            "stockQuantity": product.get("stockQuantity", 0),
            "status": product.get("status", "active"),
            "quantity": quantity,
        })

    return {
        "items": cart_items,
        "totalItems": len(cart_items),
        "totalPrice": total_price,                         
    }
    
    
@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_cart(
    body: AddToCartRequest, 
    decoded_token: dict = Depends(verify_token)
):
    """
    Thêm sản phẩm vào giỏ hàng.
    Nếu sản phẩm đã có trong giỏ thì cộng thêm số lượng.
    """
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
 
    # Kiểm tra sản phẩm tồn tại và còn hàng
    product_doc = db.collection("products").document(body.productId).get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
 
    product = product_doc.to_dict()
    if product.get("status") == "hidden":
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    if product.get("status") == "out_of_stock" or product.get("stockQuantity", 0) <= 0:
        raise HTTPException(status_code=400, detail="Sản phẩm đã hết hàng")
 
    # Kiểm tra số lượng yêu cầu không vượt quá tồn kho
    if body.quantity > product.get("stockQuantity", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ còn {product.get('stockQuantity')} sản phẩm trong kho"
        )
 
    # Kiểm tra item đã có trong giỏ chưa
    items_ref = db.collection("carts").document(user_id).collection("items")
    existing = items_ref.where("productId", "==", body.productId).limit(1).stream()
    existing_docs = list(existing)
 
    if existing_docs:
        # Cộng thêm số lượng
        existing_doc = existing_docs[0]
        current_qty = existing_doc.to_dict().get("quantity", 0)
        new_qty = current_qty + body.quantity
 
        if new_qty > product.get("stockQuantity", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Tổng số lượng vượt quá tồn kho ({product.get('stockQuantity')})"
            )
 
        existing_doc.reference.update({
            "quantity": new_qty,
            "updatedAt": datetime.now()
        })
        return {"message": "Đã cập nhật số lượng trong giỏ hàng", "quantity": new_qty}
 
    # Thêm item mới vào giỏ
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
    decoded_token: dict = Depends(verify_token)
):
    """Cập nhật số lượng trực tiếp của một item trong giỏ (ví dụ: bấm nút + / - trong giỏ hàng)"""
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    item_ref = db.collection("carts").document(user_id).collection("items").document(cart_item_id)
    item_doc = item_ref.get()

    if not item_doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng")

    # (Tùy chọn) Bạn có thể thêm logic kiểm tra stockQuantity của product tương tự ở trên tại đây

    item_ref.update({
        "quantity": body.quantity,
        "updatedAt": datetime.now(timezone.utc)
    })

    return {"message": "Đã cập nhật số lượng"}


@router.delete("/item/{cart_item_id}")
def remove_from_cart(cart_item_id: str, decoded_token: dict = Depends(verify_token)):
    """Xóa một sản phẩm khỏi giỏ hàng"""
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    item_ref = db.collection("carts").document(user_id).collection("items").document(cart_item_id)
    item_doc = item_ref.get()
    
    if not item_doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng")

    item_ref.delete()
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng"}