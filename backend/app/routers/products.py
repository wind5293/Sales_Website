from fastapi import APIRouter, HTTPException, status, Header, Query
from typing import Optional
from datetime import datetime
from app.models.schemas import CreateProductRequest, UpdateProductRequest
from app.services.firebase import get_db

router = APIRouter(prefix="/api/products", tags=["Products"])
db = get_db()


@router.get("")
def get_products(
    categoryId: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    isFeatured: Optional[bool] = Query(None),
    limit: int = Query(20, le=100),
):
    """
    Lấy danh sách sản phẩm với các bộ lọc tùy chọn:
    - categoryId: lọc theo danh mục
    - status: active | out_of_stock | hidden (mặc định: active)
    - isFeatured: chỉ lấy sản phẩm nổi bật
    - limit: số lượng tối đa trả về (tối đa 100)
    """
    query = db.collection("products")

    if status:
        query = query.where("status", "==", status)
    if categoryId:
        query = query.where("categoryId", "==", categoryId)
    if isFeatured is not None:
        query = query.where("isFeatured", "==", isFeatured)

    docs = query.limit(limit).stream()
    products = []
    for doc in docs:
        p = doc.to_dict()
        p["id"] = doc.id
        products.append(p)

    return {"products": products, "total": len(products)}


@router.get("/{product_id}")
def get_product(product_id: str):
    """Lấy chi tiết 1 sản phẩm theo ID"""
    doc = db.collection("products").document(product_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    product = doc.to_dict()
    product["id"] = doc.id
    return product


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(body: CreateProductRequest):
    """Tạo sản phẩm mới (chỉ dành cho admin)"""
    new_product = body.model_dump()
    new_product["status"] = "active"
    new_product["createdAt"] = datetime.now()
    new_product["updatedAt"] = datetime.now()

    # Tính % giảm giá nếu có originalPrice
    if new_product.get("originalPrice") and new_product["originalPrice"] > new_product["price"]:
        new_product["discountPercent"] = round(
            (1 - new_product["price"] / new_product["originalPrice"]) * 100
        )
    else:
        new_product["discountPercent"] = None

    doc_ref = db.collection("products").add(new_product)
    return {
        "message": "Tạo sản phẩm thành công",
        "productId": doc_ref[1].id
    }


@router.patch("/{product_id}")
def update_product(product_id: str, body: UpdateProductRequest):
    """Cập nhật một phần thông tin sản phẩm"""
    doc_ref = db.collection("products").document(product_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # Chỉ update các field được gửi lên (bỏ qua None)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updatedAt"] = datetime.now()

    # Tự động cập nhật status khi stockQuantity thay đổi
    if "stockQuantity" in updates:
        current = doc.to_dict()
        if updates["stockQuantity"] <= 0:
            updates["status"] = "out_of_stock"
        elif current.get("status") == "out_of_stock" and updates["stockQuantity"] > 0:
            updates["status"] = "active"

    doc_ref.update(updates)
    return {"message": "Cập nhật thành công"}


@router.delete("/{product_id}")
def delete_product(product_id: str):
    """Xóa sản phẩm (ẩn đi thay vì xóa hẳn)"""
    doc_ref = db.collection("products").document(product_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # Ẩn thay vì xóa hẳn để giữ lịch sử đơn hàng
    doc_ref.update({"status": "hidden", "updatedAt": datetime.now()})
    return {"message": "Đã ẩn sản phẩm"}


@router.get("/category/all")
def get_categories():
    """Lấy toàn bộ danh mục"""
    docs = db.collection("categories").stream()
    categories = []
    for doc in docs:
        c = doc.to_dict()
        c["id"] = doc.id
        categories.append(c)
    return {"categories": categories}