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

@router.get("/search")
def search_products(
    q: str = Query(..., min_length=1, description="Từ khóa tìm kiếm"),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Full-text search sản phẩm theo tên, mô tả, brand, categoryName.
    Firestore không hỗ trợ full-text search nên tải về rồi filter phía server.
    Với dataset lớn (>1000 sản phẩm) nên chuyển sang Algolia hoặc Elasticsearch.
    """
    keyword = q.strip().lower()

    # Lấy toàn bộ sản phẩm active (không lấy hidden)
    docs = db.collection("products").where("status", "!=", "hidden").stream()

    matched = []
    for doc in docs:
        p = doc.to_dict()
        p["id"] = doc.id

        # Tìm trong các field text
        searchable = " ".join([
            p.get("name", ""),
            p.get("brand", ""),
            p.get("categoryName", ""),
            p.get("shortDescription", ""),
            p.get("description", ""),
            p.get("sku", ""),
        ]).lower()

        if keyword in searchable:
            matched.append(p)

    # Sắp xếp: ưu tiên match trong tên trước
    matched.sort(key=lambda p: (
        0 if keyword in p.get("name", "").lower() else 1
    ))

    total = len(matched)
    paginated = matched[skip: skip + limit]

    return {
        "items": paginated,
        "total": total,
        "keyword": q,
        "limit": limit,
        "skip": skip,
    }


@router.get("/filter")
def filter_products(
    category: Optional[str] = Query(None, description="categoryId hoặc categoryName"),
    price_min: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    price_max: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
    rating_min: Optional[float] = Query(None, ge=0, le=5, description="Rating tối thiểu (0-5)"),
    in_stock: Optional[bool] = Query(None, description="Chỉ lấy hàng còn hàng"),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Lọc sản phẩm nâng cao theo nhiều tiêu chí.
    Trả về filters_applied để frontend biết filter nào đang active.
    """
    # Bắt đầu query — luôn bỏ sản phẩm hidden
    query = db.collection("products").where("status", "!=", "hidden")

    # Filter có thể đẩy xuống Firestore (index sẵn)
    if in_stock is True:
        query = query.where("status", "==", "active")

    docs = query.stream()

    items = []
    for doc in docs:
        p = doc.to_dict()
        p["id"] = doc.id

        # ── Filter phía server (Firestore không hỗ trợ range + where kết hợp tốt) ──

        # Lọc theo category — khớp cả categoryId lẫn categoryName
        if category:
            cat_lower = category.lower()
            match_id = p.get("categoryId", "").lower() == cat_lower
            match_name = cat_lower in p.get("categoryName", "").lower()
            if not (match_id or match_name):
                continue

        # Lọc theo giá
        price = p.get("price", 0)
        if price_min is not None and price < price_min:
            continue
        if price_max is not None and price > price_max:
            continue

        # Lọc theo rating
        if rating_min is not None:
            rating = p.get("rating", 0) or 0
            if rating < rating_min:
                continue

        # Lọc hàng còn hàng (in_stock=False → lấy cả out_of_stock)
        if in_stock is False:
            if p.get("status") != "out_of_stock":
                continue

        items.append(p)

    # Sắp xếp mặc định: nổi bật trước, rồi theo giá tăng dần
    items.sort(key=lambda p: (
        0 if p.get("isFeatured") else 1,
        p.get("price", 0)
    ))

    total = len(items)
    paginated = items[skip: skip + limit]

    # Ghi lại các filter đang được áp dụng để trả về cho frontend
    filters_applied = {k: v for k, v in {
        "category": category,
        "price_min": price_min,
        "price_max": price_max,
        "rating_min": rating_min,
        "in_stock": in_stock,
    }.items() if v is not None}

    return {
        "items": paginated,
        "total": total,
        "filters_applied": filters_applied,
        "limit": limit,
        "skip": skip,
    }

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
