from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.models.schemas import AddToCartRequest, UpdateCartItemRequest, RemoveFromCartRequest
from app.services.firebase import get_db
from fastapi.security import HTTPBearer

security = HTTPBearer()


router = APIRouter(prefix="/api/cart", tags=["Cart"])
db = get_db()

def _get_user_id(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return authorization.split("Bearer ")[1].strip()

@router.get("")
def get_cart(authorization: str = Header(...), _=Depends(security)):
    user_id = _get_user_id(authorization)
    items_ref = db.collection("carts").document(user_id).collection("items").stream()
    items = []
    total = 0.0 
    
    for doc in items_ref:
        item = doc.to_dict()
        item["cartItemId"] = doc.id
 
        # Lấy thông tin sản phẩm mới nhất từ collection products
        product_doc = db.collection("products").document(item["productId"]).get()
        if product_doc.exists:
            product = product_doc.to_dict()
            item["productName"] = product.get("name")
            item["price"] = product.get("price")
            item["thumbnailUrl"] = product.get("thumbnailUrl")
            item["stockQuantity"] = product.get("stockQuantity", 0)
            item["status"] = product.get("status")
            item["subtotal"] = product.get("price", 0) * item.get("quantity", 1)
            total += item["subtotal"]
        else:
            # Sản phẩm đã bị xóa — giữ lại item nhưng đánh dấu unavailable
            item["status"] = "unavailable"
            item["subtotal"] = 0
 
        items.append(item)
 
    return {
        "items": items,
        "totalItems": sum(i.get("quantity", 1) for i in items),
        "totalPrice": round(total, 2),
    }
    
@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_cart(body: AddToCartRequest, authorization: str = Header(...), _=Depends(security)):
    """
    Thêm sản phẩm vào giỏ hàng.
    Nếu sản phẩm đã có trong giỏ thì cộng thêm số lượng.
    """
    user_id = _get_user_id(authorization)
 
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
        "addedAt": datetime.now(),
        "updatedAt": datetime.now(),
    })
 
    return {"message": "Đã thêm vào giỏ hàng"}

@router.patch("/item/{product_id}")
def update_cart_item(
    product_id: str, 
    body: UpdateCartItemRequest, 
    authorization: str = Header(...), 
    _=Depends(security)
):
    """
    Cập nhật số lượng của một sản phẩm trong giỏ.
    Nếu quantity = 0 thì xóa item khỏi giỏ.
    """
    user_id = _get_user_id(authorization)
 
    if body.quantity < 0:
        raise HTTPException(status_code=400, detail="Số lượng không hợp lệ")
 
    items_ref = db.collection("carts").document(user_id).collection("items")
    existing = items_ref.where("productId", "==", product_id).limit(1).stream()
    existing_docs = list(existing)
 
    if not existing_docs:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng")
 
    if body.quantity == 0:
        existing_docs[0].reference.delete()
        return {"message": "Đã xóa sản phẩm khỏi giỏ hàng"}
 
    # Kiểm tra tồn kho trước khi cập nhật
    product_doc = db.collection("products").document(product_id).get()
    if product_doc.exists:
        stock = product_doc.to_dict().get("stockQuantity", 0)
        if body.quantity > stock:
            raise HTTPException(
                status_code=400,
                detail=f"Chỉ còn {stock} sản phẩm trong kho"
            )
 
    existing_docs[0].reference.update({
        "quantity": body.quantity,
        "updatedAt": datetime.now()
    })
    return {"message": "Đã cập nhật giỏ hàng", "quantity": body.quantity}

@router.delete("/item/{product_id}")
def remove_cart_item(
    product_id: str, 
    authorization: str = Header(...), 
    _=Depends(security)
):
    """Xóa một sản phẩm khỏi giỏ hàng"""
    user_id = _get_user_id(authorization)
 
    items_ref = db.collection("carts").document(user_id).collection("items")
    existing = items_ref.where("productId", "==", product_id).limit(1).stream()
    existing_docs = list(existing)
 
    if not existing_docs:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng")
 
    existing_docs[0].reference.delete()
    return {"message": "Đã xóa khỏi giỏ hàng"}
 
 
@router.delete("")
def clear_cart(authorization: str = Header(...), _=Depends(security)):
    """Xóa toàn bộ giỏ hàng (thường gọi sau khi đặt hàng thành công)"""
    user_id = _get_user_id(authorization)
 
    items_ref = db.collection("carts").document(user_id).collection("items").stream()
    for doc in items_ref:
        doc.reference.delete()
 
    return {"message": "Đã xóa toàn bộ giỏ hàng"}